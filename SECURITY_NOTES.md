# CareLink — Security Notes

**For:** Jess. Written assuming no security background.

This is the single, merged security document. It replaces
`SECURITY_NOTES_document_uploads.md` (Round 1) and
`SECURITY_NOTES_app_wide_ownership_checks.md` (Rounds 2 and 2b), and adds the
newest work: verification gating and real login tokens.

**How to read it**

| Part | What it is |
|---|---|
| **1** | Every idea explained with an everyday analogy. Read this first — it's enough to answer a panel question. |
| **2** | The technical detail behind each one: what the code did, why it was dangerous, what changed. |
| **3** | Glossary. |
| **4** | How to check the fixes yourself. |
| **5** | What's still open — stated honestly. |

---

# Part 1 — The whole thing in plain words

Imagine your **school records office**. Every control below is something that
office does to stop the wrong person walking off with — or altering — the wrong
file.

### 1. The clerk used to hand over any file you named
You walk up and say *"give me the file for student 205."* The clerk hands it
over without asking who you are. Anyone can read anyone's file just by counting:
204, 205, 206…

That was CareLink. Endpoints took `user_id` straight from the request and
returned that person's ID documents, salary, contact number, birth date,
household composition, private chat messages — with nothing checking whether it
was yours.

**Fix:** the clerk now checks the file you asked for is actually yours.
→ *Technical name: **IDOR**. Part 2.1.*

### 2. …and it wasn't only reading — you could sign things in someone's name
Worse than reading a file: walking in and *changing* it. Editing someone's
records, dropping them from a class, signing a form as them.

CareLink's write endpoints had the identical hole. You could **edit someone
else's profile**, **send a chat message as them**, **submit a job application as
a helper**, **hire someone**, or **change any application's status** — by
guessing a number.

**Fix:** the same ownership check, applied to the endpoints that *change* things,
not just the ones that read.
→ *Part 2.2.*

### 3. The worst one: the blank staff-badge printer was left in the hallway
Everything above lets someone misuse an *existing* account. This one is
different. It's the badge printer sitting unattended in the corridor — anyone
walking past could print themselves a **staff badge**, then walk in the front
door legitimately forever after.

`admin/admin_create_user.php` had a comment saying *"should be called from
authenticated super admin only"* — and **no check enforcing it**. With no login
at all, anyone could create themselves a fully-privileged **admin** account.
`peso/create_peso_user.php` had the identical hole for PESO staff.

This is the most severe bug found in the entire project. After using it, an
attacker needs no other bug — they just log in.

**Fix:** both now require an existing approved staff account first.
→ *Part 2.3.*

### 4. …but the clerk was still just believing your answer
Fixing 1–3 meant the clerk asked *"who are you?"* — and believed whatever you
said. You could still say "I'm student 205" and be handed 205's file.

**Fix:** you must now show an **ID card the school issued**. You can't draw one
yourself, because it carries a long random number only the office knows. Student
numbers are guessable (1, 2, 3…); this isn't.
→ *That's the login **token**. Part 2.4.*

### 5. The office doesn't keep copies of the ID cards
It keeps a **fingerprint** of each card, not the card itself. If the filing
cabinet is stolen, the thief gets a pile of fingerprints — useless for walking
in and pretending to be you.
→ *That's **hashing**. Same reason passwords are hashed. Part 2.4.*

### 6. Envelopes get opened, not read off the label
Someone hands in an envelope labelled *"photo."* A careless clerk files it by
the label. A careful one **opens it and looks inside** — because a label is just
something the sender wrote.

A file called `photo.jpg` can contain anything, including a program. CareLink
now inspects the actual first bytes of every uploaded file.
→ *Technical name: **magic bytes**. Part 2.5.*

### 7. Documents aren't left on an open shelf
Filenames used to be like `barangay_15_1781674427.jpg` — the student number plus
roughly when they enrolled. That's not a secret, it's a weak password. And the
shelf was open: anyone with the name could take the file, without ever passing
the clerk.

Now you get a **numbered claim ticket, stamped by the office, that expires in 15
minutes.** Someone else's ticket won't open your file, and you can't forge the
stamp because you don't know the secret it's made with.
→ *That's the **signed document link**. Part 2.6.*

### 8. A valid ID card still doesn't make you enrolled
You can be a real person with a real card and *still* not be allowed to request
a transcript — because you haven't enrolled yet.

Being logged in is not the same as being allowed. A helper or employer who
hasn't been PESO-verified can't post jobs, apply, or message the other side.
Before this, the rule existed only in the app's buttons — the server would
happily obey a direct request.
→ *That's the **verification guard**. Part 2.7.*

> **The one-sentence version:** *prove who you are, prove you're allowed, and
> never trust a label.*

---

# Part 2 — The technical detail

## 2.1 Ownership checks on read endpoints (Round 2)

Every vulnerable endpoint had this shape:

```php
// BEFORE — anywhere in the app
$user_id = intval($_GET['user_id']);   // or parent_id, helper_id...
// ...then just uses it to fetch data. No check on WHO is asking.
```

The fix is always the same shape — a `requester_id`, checked against the thing
being accessed:

```php
// AFTER
$requester_id = isset($_GET['requester_id']) ? intval($_GET['requester_id']) : 0;
carelink_require_self($requester_id, $user_id, 'You are not allowed to view this.');
```

One shared function in `backend/shared/ownership_guard.php`, reused in ~25
files, so a later change (logging denials, say) happens in one place instead of
25. The frontend sends the logged-in user's own id as `requester_id` — silently,
read from the same `AsyncStorage` it already reads `user_id` from.

### Three shapes of "who's allowed"

Not every endpoint means "only me." Forcing a strict self-check on the cross-user
ones would have broken real features.

| Function | Means | Used for |
|---|---|---|
| `carelink_require_self` | this must be MY data | profile, notifications, messages, stats, placements, job posts — ~20 endpoints |
| `carelink_require_self_or_staff` | mine, **or** a verified PESO/admin | `peso/get_user_details.php` |
| `carelink_require_authenticated_user` | any real logged-in account | `helper/get_parent_profile.php` |

That last one matters: it's the screen where a helper looks at an employer's
profile *before applying*. A strict self-check would have broken Browse Jobs
entirely. The right bar there isn't "are you the parent," it's "are you a real
registered user, not an anonymous script."

`peso/get_user_details.php` turned out to already have a correct staff-check
function (`peso_require_staff()` in `peso/peso_auth.php`) — written, and never
called. Reused rather than replaced.

**The lesson:** "fix the IDOR" doesn't mean "lock it to one person." It means
decide who *should* be allowed, then enforce exactly that.

### What was fixed, by area

**Private messages** — the most serious group.
`get_messages.php`, `get_conversations.php` returned **any two users' entire
conversation history** to anyone guessing two numbers, no login.
`send_message.php` let anyone **send a message as any user** — forging messages
in someone's name mid-negotiation. `upload_image.php` let anyone upload a chat
image "as" any user. (`edit_message.php` was already correct — it checked the
real sender first.)

**Parent ↔ applicant data with salary and PII.**
`get_job_applications.php`, `get_applicant_profile.php`, `get_contract_terms.php`
returned an applicant's **contact number, birth date, address, salary
expectations, and signed contract terms** to anyone guessing a `parent_id`.
Plus `placement_history.php`, `placement_recently_ended.php`,
`get_hired_helpers.php`.

**PESO staff-only data.**
`peso/get_user_details.php` — full profile, uploaded ID documents, household and
children/elderly details — with **zero check that the caller was PESO**.

**Everything else.** Notifications, dashboard stats, saved jobs,
recommendations, posted-job lists, account status, pending-review lists, for
both roles. Nothing as sensitive as salary or messages, but the identical shape,
so the identical one-line fix. Two dead files were fixed too — cheap insurance
against someone wiring them up later and assuming they're safe.

Found mid-sweep and fixed although not on the original list:
`helper/my_applications.php` (any `helper_id` could be queried for a full
application history).

Checked and found **already correct**: `shared/placement_renewal_status.php` and
`edit_message.php`. Both verify the claimed identity against the real database
record. Worth recognising that shape when you see it.

## 2.2 The write endpoints (Round 2b, part one)

Round 2 searched for endpoints that **return** personal data. It did not
separately check endpoints that **change** it. Those had the same bug, in some
of the most important business logic in the app:

- `parent/hire_helper.php`, `edit_contract.php` — starting or regenerating a real employment contract
- `parent/request_termination.php`, `invite_helper.php`, `post_job.php` — ending a placement, inviting a helper, creating a listing
- `parent/update_application_status.php`, `update_job_status.php` — **no scoping at all**; any `application_id` or `job_post_id` could have its status changed by anyone who guessed the number
- `helper/save_job.php`, `unsave_job.php`, `update_application.php` — lower stakes, same gap
- `parent/log_profile_view.php`, `shared/mark_read.php` — minor

The two with no scoping needed an extra step: the frontend never sent an owner
id to compare against, so the fix looks up the record's **real** owning parent
from the database first, then checks the requester against that — deriving the
comparison value server-side instead of trusting a client-sent one.

Also found already correct, just written as an inline `if ($claimed !== $real)`
rather than a named function: `interviews/schedule.php`, `interviews/cancel.php`,
`helper/work_task_toggle.php`, `v1/applications/request_contract_changes.php`,
`peso/update_job_status.php`, and `v1/auth/verify_password.php` — which is
actually *stronger* than everything else here, since it requires the account's
real password, not a number, and rate-limits itself.

## 2.3 Unauthenticated admin account creation (Round 2b, part two)

`backend/admin/` was never actually covered by the Round 2 audit despite being
in scope. Two files:

- **`admin/admin_create_user.php`** — comment said *"SECURITY: Should be called from authenticated super admin only."* No check enforced it. Anyone, with no login, could POST and create a fully-privileged `admin` or `peso` account.
- **`peso/create_peso_user.php`** — the identical hole, for self-registering as PESO staff.

**Why this outranks every data-exposure bug:** the others let an attacker read
or act as an *existing* account. This one lets them **create a brand-new, fully
trusted account for themselves**. After that they need no bug at all.

**Fix:** both require an existing approved staff account —
`admin/admin_create_user.php` via a new `admin_require_staff()` guard mirroring
the PESO one, `peso/create_peso_user.php` via the existing
`peso_validate_staff_actor()` that was already sitting unused in `peso_auth.php`.

*Unrelated bonus found while fixing:* the admin "Create Admin User" screen and
part of the admin dashboard were calling the wrong URL (missing `/admin/` in the
path), so those buttons had been silently failing. Fixed in the same edit.

## 2.4 Login tokens — proving identity

Everything above compares two numbers **from the same request**. That proves the
numbers match. It proves nothing about who sent them.

Now: a successful login issues a random 32-byte token
(`backend/shared/auth_tokens.php`). The app sends it on every request; the
server looks it up to find the real user.

- Only a **SHA-256 hash** is stored — a leaked database contains nothing replayable
- Tokens **expire after 30 days**; logout deletes yours immediately
- Expired rows are cleaned up opportunistically

**Two chokepoints made this cheap instead of a 160-file rewrite:**

*Backend* — every protected endpoint already calls `carelink_require_self()`, so
upgrading that one function covered all of them at once. When a token is present
it decides, and the request's claimed id is ignored entirely:

```php
$authedId = carelink_authenticated_user_id($conn);
if ($authedId > 0) {
    if ($authedId !== $targetId) throw new Exception($message);
    return;                       // claimed id never consulted
}
if (carelink_auth_is_strict()) {
    throw new Exception('Your session has expired. Please sign in again.');
}
// otherwise fall through to the legacy requester_id comparison
```

*Frontend* — the app has hundreds of scattered `fetch()` calls and no central
API layer, so `frontend/lib/authFetch.ts` wraps `fetch` once at startup
(installed at module scope in `app/_layout.tsx`, before any screen mounts).
Every existing call — and every future one — carries the token automatically,
which also means a new screen can't forget it. It only touches requests to
`API_URL`, so Nominatim, Daily and PayMongo never see the token.

> ### ⚠️ Currently OFF — one line turns it on
> The server *prefers* the token but still accepts the old way when none is
> sent, so an un-updated app keeps working. To make it mandatory, add to
> `backend/config.local.php`:
> ```php
> 'AUTH_STRICT' => true,
> ```
> **Test first:** deploy → log out fully → log back in → confirm helper,
> employer **and** PESO/admin all work. *Then* flip it. If anything breaks, set
> it back to `false` and you're instantly working again. That's the point of
> having the switch.

## 2.5 Upload validation — never trust the label

Two different broken approaches existed side by side:

```php
// helper/upload_documents.php — OLD: trusted the FILENAME
$fileExt = strtolower(pathinfo($_FILES['valid_id']['name'], PATHINFO_EXTENSION));
```
```php
// parent/upload_documents.php — OLD: trusted the Content-Type HEADER
if (!in_array($file['type'], ['image/jpeg', 'image/png', 'application/pdf'])) { ... }
```

Both `$_FILES[...]['name']` and `$_FILES[...]['type']` are **text the uploading
app chose to send**. Anyone using Postman or a five-line script can set them to
anything while uploading any file.

`backend/shared/file_security.php` reads the real bytes instead:

```php
$finfo = new finfo(FILEINFO_MIME_TYPE);
$realMime = $finfo->file($file['tmp_name']);   // reads the ACTUAL bytes on disk
```

- Allowed: JPG, PNG, PDF — decided by **content**, not extension
- **5 MB cap** in one place (`CARELINK_DOC_MAX_BYTES`). Previously the parent endpoint capped at 5 MB and the helper endpoint had **no check at all**, relying on a PHP setting that varies by server — someone could have filled the disk.
- Also cleaned up: a raw SQL string with a variable pasted in (`DELETE FROM user_documents WHERE user_id = $user_id`). Not exploitable, since `intval()` ran a few lines earlier — but it's the exact *shape* that becomes SQL injection the moment it's copy-pasted somewhere unsanitised. Now a prepared statement, matching the rest of the file.

## 2.6 Signed, expiring document links

Filenames used to be `barangay_15_1781674427.jpg` — a small counting number plus
a timestamp you can estimate from a signup date. And even with the name, there
was no check: it was a static file the web server handed to anyone, **bypassing
`get_documents.php` entirely**. Fixing 2.1 wouldn't have helped.

**Layer 1 — unguessable names:**
```php
$random = bin2hex(random_bytes(16));   // 128 bits, cryptographically secure
return "{$prefix}_{$userId}_{$random}.{$ext}";
```

**Layer 2 — a signed, expiring link, required even for your own documents:**
```
.../shared/serve_document.php?document_id=42&expires=1781680000&token=22c79e5c...
```
```php
$expires = time() + $ttlSeconds;   // 15 minutes
$token = hash_hmac('sha256', "{$documentId}.{$expires}", carelink_doc_signing_secret());
```

`serve_document.php` recomputes the signature and checks the expiry. The secret
(`DOC_SIGNING_SECRET`) never leaves the server, so nobody can compute a valid
token for a different `document_id` without breaking SHA-256. A link pasted into
a chat self-destructs in 15 minutes.

- Compared with `hash_equals()`, not `==`, to avoid a **timing attack**
- `realpath()` + prefix check confirms the resolved file is still inside the uploads folder — the standard defense against **path traversal**

Round 2 found the same raw-URL bug in more places and switched them all to
`carelink_signed_document_url()`: `parent/get_applicant_profile.php`,
`peso/get_user_details.php`, `helper/get_parent_profile.php`, and both
`get_profile.php` files.

**Sharing rules (unchanged, and worth stating at defense):** Valid ID and
Barangay Clearance are **never** shared with employers — they carry home
addresses, and PESO alone reviews them. Only Police Clearance, TESDA NC2 and NBI
Clearance can be shared, and only when the helper explicitly chooses to, per
application.

## 2.7 Verification gating

Being authenticated ≠ being authorised. Enforced by
`backend/shared/verification_guard.php`:

| Endpoint | Rule |
|---|---|
| `parent/post_job.php` | employer must be verified |
| `helper/apply_job.php` | helper must be verified |
| `messages/send_message.php` | helper↔parent needs **both** verified |
| `parent/invite_helper.php` | employer verified — an invite writes a message and **bypassed `send_message.php` entirely** |
| `parent/create_direct_hire_offer.php` | both verified |

**Staff are deliberately exempt.** The gate only fires when one side is a helper
and the other an employer. A pending helper must still be able to ask PESO why a
document was rejected, and PESO must be able to reach them. Gating that would
close the only channel a pending user has.

---

# Part 3 — Glossary

- **IDOR (Insecure Direct Object Reference)** — accessing someone else's data by changing an ID in a request, because the server never checks whether that ID belongs to you. The #1 bug in this project, and in the OWASP Top 10.
- **Magic bytes / file signature** — every real file type starts with a fixed byte sequence. A real JPG starts `FF D8 FF`; a real PDF starts `%PDF`. Nothing to do with the filename — rename `virus.exe` to `photo.jpg` and the bytes are still an EXE.
- **MIME type** — a label like `image/jpeg`. The danger: on upload it comes from a `Content-Type` header **the uploader's app wrote**. It's text they chose, not a guarantee.
- **Hashing** — a one-way fingerprint. You can check a value against its hash, but you can't work backwards to the value. Used for passwords and session tokens, so a stolen database holds nothing usable.
- **HMAC** — signing data with a secret key. Anyone without the secret can't forge a valid signature; the server can always verify one. How the signed document link works.
- **Path traversal** — using a filename like `../../../etc/passwd` to escape the folder the server is supposed to be confined to.
- **Timing attack** — comparing secrets with `==` can leak how many characters matched, via how long the comparison took. Real and documented, which is why the fix uses `hash_equals()`.

---

# Part 4 — How to check it yourself

1. **Try the old attack.** Open `.../helper/get_documents.php?user_id=2` in a browser with no `requester_id`. You should get `{"success": false, "message": "You are not allowed to view documents for this account."}` instead of a document list.
2. **Confirm the real app still works.** Open the Helper or Parent document screen normally — you should see and upload your own documents exactly as before. The app sends `requester_id` silently.
3. **Look at a returned `file_url`.** It should be `.../shared/serve_document.php?document_id=12&expires=...&token=...`, not `.../uploads/documents/barangay_15_....jpg`. Paste it in a browser — the file displays. Now change `document_id` by 1 and reload: 403, not someone else's document.
4. **Test the verification gate.** As a pending account, try to message a verified one. The server refuses, not just the button.
5. **`php -l`** on anything you touch later. Every file changed here passes cleanly.

---

# Part 5 — What's still open

State these before you're asked. Being caught omitting them is worse than the
gaps themselves.

1. **`AUTH_STRICT` is off by default.** Until you switch it on, the old weaker path still works as a fallback. See the box in 2.4.
2. **CORS is still wide open** (`Access-Control-Allow-Origin: *`) on every endpoint. Deliberately not fixed piecemeal — narrowing 4 files out of 160 would be inconsistent and risks breaking the web build on a wrong guess at the production domain. It's its own task, done everywhere at once.
3. **These were manual, pattern-based audits — not proofs.** This is worth being blunt about: it happened **twice** that a "comprehensive" pass turned out not to be. Round 2 missed the entire `admin/` folder and every write endpoint. The real safety net going forward is the *rule* — always check the claimed actor against the real owner, on every new endpoint — not a belief that every existing file has been checked.
4. **AI document scanning is assistive, not authoritative.** Gemini compares against known layouts, not a government database. A good forgery can pass. **A PESO officer approves every document**, and that is the real gate. (The scan slots into the pipeline right after `carelink_validate_uploaded_file()` succeeds and before the file is saved: "is this really a JPG/PDF" → "does the content look like a real clearance" → save.)
5. **`finfo` is strong but not bulletproof** against a file that's a valid JPG by its header and smuggles something else later. That's the next layer of defense, not a replacement for this one.
6. **No rate limiting on most endpoints.** CareBot has it; the login lockout is client-side only and belongs on the server.
7. **Notifications are polled, not pushed.** Fine at tested load; the upgrade path is Expo Push Notifications, which needs no persistent server.
8. **CareLink never holds or moves salary.** Payroll is a computed view; employers pay helpers directly. Only platform fees go through PayMongo, and **only employers are ever charged** (RA 8042, RA 10364).

---

# For the defense

If asked *"how do you keep user data safe?"* — the whole answer in four
sentences:

> Every endpoint checks that the data being requested belongs to the person
> asking. Identity is proven with a server-issued session token, stored hashed
> and revoked on logout — not with an ID number the client can type. Uploaded
> files are validated by their actual bytes, and documents are served through
> expiring signed links rather than public URLs. Verification is enforced on the
> server, so a direct API call is refused exactly like an in-app one.

If they push for specifics, the longer version:

> I found that one bug — trusting a client-sent ID with no ownership check — was
> repeated across nearly 40 endpoints: read endpoints exposing salary, contact
> numbers, birth dates and private messages; write endpoints that could hire a
> helper, post a job or change an application's status as someone else; and most
> seriously, two account-creation endpoints with no authentication at all that
> would have let anyone grant themselves admin access. I built one reusable
> check, applied it consistently — including the cases where the right rule
> wasn't "only the owner" but "only staff" or "only logged-in users" — then
> replaced the trusted ID itself with a real session token, upgrading the single
> shared function rather than 160 files.

Then volunteer one limitation from Part 5. A clear control plus a known gap
reads as rigour; a flawless-sounding answer invites someone to go looking.
