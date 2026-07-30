# CareLink — Profile Strength vs PESO Queue · Q&A

Why an account with low "profile strength" could still appear in PESO admin, and
what actually gates the queue. Notion-ready.

---

**Q: Does a 21%-strength account still show up in PESO admin?**

**No — not anymore.** It did before (that was the bug). The queue is now gated on
**both required documents**, and you can't reach that at 21%.

---

**Q: Why did it show at 21% in the first place?**

Because *any single* document upload flipped the account into the queue. The
upload endpoint set `verification_status = 'Pending'` unconditionally:

```php
// backend/helper/upload_documents.php — BEFORE
$updateProfile = $conn->prepare(
    "UPDATE helper_profiles SET verification_status = 'Pending' WHERE user_id = ?"
);
```

And `get_pending_users.php` lists anything already in the PESO workflow:

```sql
WHERE ... COALESCE(h.verification_status, p.verification_status) IN ('Pending','Verified','Rejected')
```

So one Valid ID upload → `Pending` → visible to PESO, no matter how empty the
rest of the profile was.

---

**Q: What's the fix?**

One shared gate requiring **both** Barangay Clearance and Valid ID:

```php
// backend/shared/sync_profile_completed.php
function carelink_has_required_documents(mysqli $conn, int $user_id): bool
{
    $stmt = $conn->prepare(
        "SELECT COUNT(DISTINCT document_type) AS c
         FROM user_documents
         WHERE user_id = ?
           AND document_type IN ('Barangay Clearance', 'Valid ID')
           AND status IN ('Pending', 'Verified')"
    );
    // ...
    return $count >= 2;
}
```

Called from all four places that could queue an account: both
`sync_profile_completed` functions, and the direct status flips in
`helper/upload_documents.php` + `parent/upload_documents.php`.
`peso/get_pending_users.php`'s fallback SQL branch was tightened the same way
(`COUNT(DISTINCT document_type) >= 2` instead of `EXISTS`).

---

**Q: So is profile strength the gate now?**

**No — they are two different numbers and always were.** Strength is
informational for the user; the queue has its own checklist. They just no longer
disagree *absurdly*.

| | Profile strength | PESO queue gate |
|---|---|---|
| Lives in | `helper/get_profile.php`, `parent/get_profile.php` | `shared/sync_profile_completed.php` |
| Purpose | Nudge the user to finish their profile | Is this reviewable by PESO? |
| Counts | ~14 fields incl. photo, birth date, gender, education, religion, landmark | Contact, address, bio, 1+ skill, **both** required docs |

---

**Q: What's the lowest strength that can now appear in the queue?**

**61% for a helper, 83% for a parent** — the sum of exactly the gate's
requirements and nothing more.

Helper (weights from `helper/get_profile.php`):

```
contact_number 7 + province 5 + municipality 5 + barangay 6
+ bio 4 + skills 6 + Valid ID 14 + Barangay Clearance 14   = 61
```

The missing 39 is all stuff the gate doesn't require: photo (8), birth date (7),
gender (6), job roles (8), languages (4), education (3), religion (2),
landmark (1).

Parent is scored out of 115 and normalised, so the gate's items
(40 + bio 10 + household_type 5 + docs 40 = 95) land at **95/115 ≈ 83%** —
missing only photo (10) and household_size (10).

---

**Q: Anything else that sets `Pending` that I should know about?**

Yes, one — and it's intentional, not affected by this fix:

```php
// backend/helper/delete_document.php
if ($prof && $prof['verification_status'] === 'Verified') {
    // deleting a doc breaks the basis of verification → back to Pending
}
```

That only fires for accounts **already fully Verified**, so it's a re-review, not
a premature queue entry.

---

**Q: Does the fix clean up accounts already stuck in the queue?**

**No.** It only prevents new ones. Anything already sitting at
`verification_status = 'Pending'` stays there — reject/verify it in PESO admin,
or delete the test account.

---

## Where the code lives

| Concern | File |
|---|---|
| Shared required-documents gate | `backend/shared/sync_profile_completed.php` |
| Status flip on upload (helper / parent) | `backend/helper/upload_documents.php`, `backend/parent/upload_documents.php` |
| Queue listing + fallback readiness branch | `backend/peso/get_pending_users.php` |
| Profile strength weights | `backend/helper/get_profile.php`, `backend/parent/get_profile.php` |
| Intentional re-review on doc delete | `backend/helper/delete_document.php`, `backend/parent/delete_document.php` |
