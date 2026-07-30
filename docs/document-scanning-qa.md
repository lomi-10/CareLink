# CareLink — Document Verification (AI Scan) · Q&A

How the AI pre-check works, and its honest limits. Notion-ready.

**In one line:** Gemini vision reads an uploaded document, scores legitimacy and
clarity, extracts fields, and flags problems — then **a PESO officer manually
approves every document.** That human step is the real gate.

---

**Q: Is the scanning "legit"? What's it based on?**

Google **Gemini 2.5 Flash** (vision), same API key as the chatbot. It's an
**assistive model judgment, not a government-database check** — no PhilSys / PNP /
TESDA integration. It raises or lowers confidence; it can't *prove* authenticity.

**Q: What's its accuracy?**

**There's no fixed percentage**, because it's a model reasoning over an image, not
a lookup. Quoting "99% accurate" would be dishonest.

**Q: What does it check?**

1. **Type match** — is this really the claimed document?
2. **Legitimacy 0–100** — layout, seals, official elements vs. the real template
   (prompt encodes PhilSys National ID + Barangay / Police / TESDA layouts).
3. **Clarity 0–100** — focus, glare, cropping.
4. **Tampering + field extraction** — incl. photo-of-a-screen, photocopy,
   edited fonts. Told explicitly **not to invent values**.

**Q: How does a scan become Passed / Flagged / Failed?**

From the legitimacy score, not the raw verdict (Gemini can say "Declined" on a
genuine doc with an odd title while still scoring it 90):

```php
// backend/helper/scan_id.php
if     ($legit >= 70) $sideMapped = empty($warnings) ? 'Passed' : 'Flagged';
elseif ($legit >= 45) $sideMapped = 'Flagged';
else                  $sideMapped = 'Failed';
```

Only **Failed** auto-rejects, so garbage can't sit in PESO's queue. Everything
else is stored for PESO. Valid IDs scan **front and back independently**, and the
overall status is the worst of the sides.

**Q: Will a forged document be noticed?**

**Obvious fakes yes** (wrong layout, random image, visible tampering,
screen/photocopy). A **high-quality forgery matching the template can pass** —
Gemini isn't forensic and can't call the issuing office. **PESO's review is the
safeguard.**

**Q: Are expired documents caught?**

**Yes** — a deterministic check after extraction:

```php
$ets = strtotime($expiryRaw);
if ($ets !== false && $ets < strtotime('today')) {
    $warnings[] = "Document appears EXPIRED (valid until {$expiryRaw}).";
}
```

**Q: Does it check the name matches the account holder?**

**Yes**, leniently — token overlap, tolerant of middle names and word order. Only
flags when the names share **no words at all** (i.e. someone else's ID):

```php
function carelink_names_overlap(string $a, string $b): bool {
    // ...tokenize both, drop tokens < 2 chars
    return count(array_intersect($ta, $tb)) > 0;   // no overlap → flag
}
```

**Q: Can the same ID be reused across accounts?**

It's **flagged** — if the extracted ID number already appears on another account,
the scan warns *"already on file under another account."*

**Q: Do those flags actually reach PESO admin?**

**Yes, now.** The backend always computed `ai_warnings`, but the admin panel never
rendered them — so an identity mismatch was invisible to the reviewer. Fixed:

```tsx
// frontend/components/peso/UserDetailPanel.tsx
{Array.isArray(doc.ai_warnings) && doc.ai_warnings.length > 0 && (
  <View style={st.warnBox}>
    <Text style={st.warnBoxTitle}>Flagged by AI — review before approving</Text>
    {doc.ai_warnings.map((w: string, i: number) => <Text key={i}>• {w}</Text>)}
  </View>
)}
```

**Q: Is scanning automatic?**

**No.** Upload and scan are separate — the user taps **"Start AI Scan"**
(`autoStart={false}`). Documents can be uploaded and reviewed in PESO admin
without ever being scanned.

**Q: Both roles, both platforms?**

**Yes** — helper and parent, web and mobile, via the shared `DocumentAIScan`
component and one backend endpoint.

**Q: Can PESO tell who's been scanned?**

**Yes** — the user-verification list has an **Any scan / AI-scanned / Not
scanned** filter backed by a per-user `ai_scanned` flag.

**Q: Can a helper erase her records after leaving?**

**No.** There's no account deletion, and once a user has **any** placement
(active or ended) their documents can't be deleted — only PESO can update them.
Identity evidence survives for disputes.

**Q: What would give true authenticity certainty?**

Integrating the **issuing registries** (PhilSys eVerify, PNP, TESDA-TWSP). Needs
official credentials and adviser sign-off — a scope decision, not just code.

---

## Say this in a review

> "It's an AI assistant that reads the document, checks it against the known
> layout of that ID, rates image quality, and flags anything fake, expired, not
> the account holder, or reused — and clearly fake images are auto-rejected. It is
> **not** a government-database check and **not** forgery-proof. **A PESO officer
> manually verifies and approves every document** — that's the actual gate."

---

## Decision flow

```
Upload → (user taps) Start AI Scan → Gemini vision
                                     ├─ type match, legitimacy 0–100, clarity 0–100
                                     ├─ tampering signs (incl. screen/photocopy)
                                     └─ extracted fields
                                            │
       deterministic checks ────────────────┤ expiry past today?    → warning
                                            │ name ≠ account?       → warning
                                            └ duplicate ID number?  → warning
                                            │
       legitimacy ≥70 + no warnings → Passed
       legitimacy ≥70 + warnings    → Flagged
       legitimacy 45–69             → Flagged
       legitimacy <45               → Failed → auto-reject (only case)
                                            │
                        PESO manual review = FINAL decision
```

---

## Where the code lives

| Concern | File |
|---|---|
| Gemini prompt, schema, per-type guidance | `backend/shared/gemini_id.php` |
| Scan endpoint, Passed/Flagged/Failed gate, deterministic checks | `backend/helper/scan_id.php` |
| Warnings + extracted fields sent to admin | `backend/peso/get_user_details.php` |
| Warnings rendered for the reviewer | `frontend/components/peso/UserDetailPanel.tsx` |
| Per-user `ai_scanned` flag | `backend/peso/get_pending_users.php` |
| Doc-deletion block after a placement | `backend/helper/delete_document.php`, `backend/parent/delete_document.php` |
| Scan UI (idle → scanning → results) | `frontend/components/shared/DocumentAIScan.tsx` |
| PESO AI-scan filter | `frontend/app/(peso)/users/index.tsx` |
| Which docs are shareable with employers | `frontend/constants/documents.ts` |

**Supported types:** Valid ID (PhilSys / Passport / Driver's License / UMID / PRC /
Postal / Voter's / SSS / GSIS), Barangay Clearance (+ Certificate / Certification /
Residency / Indigency), Police Clearance, TESDA NC II.

---

## Known limits

- Can't guarantee catching a **high-quality forgery** (needs issuing-agency check).
- Duplicate-ID check is a substring match on stored JSON — good signal, not a
  unique index.
- Name match is lenient by design; a same-surname impersonation may not flag.
- No liveness/anti-spoof beyond the screen/photocopy prompt hint.
