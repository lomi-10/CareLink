# CareLink — Document Verification (AI Scan) · Q&A + Code Review Notes

A study/reference sheet for the document‑scanning feature. Covers what it does, how
it decides, its honest limits, the recent enhancements, and where the code lives.
Written so it can be pasted into Notion and defended in a review.

---

## 1. The one‑paragraph summary

When a helper or parent uploads a verification document, CareLink can run an
**AI pre‑check** (Google Gemini vision) that reads the document, judges whether it
looks like a genuine document of the claimed type, rates image clarity, extracts the
printed fields, and flags anything suspicious. It then runs a few **deterministic
cross‑checks** (expiry, name‑vs‑account, duplicate ID). The AI **never makes the
final call** — it pre‑screens and flags; a **PESO officer manually reviews and
approves** every document. That human step is the real verification gate.

---

## 2. Q&A

**Q: Is the scanning "legit"? What is it based on?**
A: It's Google **Gemini 2.5 Flash** (vision), reusing the same API key as the
chatbot. It's an **assistive model judgment**, not a check against a government
database. There is no PhilSys / PNP / TESDA API integration, so it cannot *prove*
authenticity — it raises or lowers confidence and catches obvious problems.

**Q: What accuracy is it based on?**
A: There is **no fixed accuracy percentage**, because it is a model reasoning over an
image, not a database lookup. Quoting "99% accurate" would be dishonest. It is a
**first‑pass filter**; the authoritative decision is PESO's manual review.

**Q: What exactly does the AI check? (per document type)**
1. **Type match** (`is_expected_document`) — is this really the claimed document?
2. **Template/legitimacy score 0–100** (`template_match`) — how well the layout,
   seals, and official elements match a genuine document. The prompt encodes the real
   PhilSys National ID layout plus Barangay / Police / TESDA templates.
3. **Clarity score 0–100** — readability (focus, glare, cropping).
4. **Tampering signs + field extraction** — notes anything suspicious (now including
   *photo‑of‑a‑screen*, *photocopy*, *edited/mismatched fonts*) and pulls the printed
   fields (name, ID number, dates). It is told **not to invent values**.

**Q: How does a scan become Passed / Flagged / Failed?**
A: From the legitimacy score:
- **≥ 70 → Passed** (but downgraded to **Flagged** if there are any warnings)
- **45–69 → Flagged** (uncertain → PESO reviews)
- **< 45 → Failed** (clear fake / wrong / random image)
Only a **Failed** auto‑rejects the document, so garbage can't sit in PESO's queue.
Everything else is stored and left for PESO.

**Q: Will a forged document be noticed?**
A: **Obvious/lazy fakes yes** (wrong layout, random image, visible tampering,
screen/photocopy). A **high‑quality forgery that matches the template can pass the
AI** — Gemini is not a forensic tool and can't confirm with the issuing office.
**PESO's manual review is the safeguard for that.**

**Q: Will an outdated / expired document be noticed?**
A: **Yes, now.** After the AI extracts a "Valid Until" date, a deterministic check
compares it to today; if it's past, the scan adds *"Document appears EXPIRED"* and
downgrades to **Flagged** for PESO. (Before, the date was only extracted, never
checked — that was the tester's valid catch.)

**Q: Does it check the name matches the account holder?**
A: **Yes.** The name on the document is compared to the account's name. It's
**lenient** (token overlap — tolerant of middle names and word order) and only flags
when they share **no words at all** (i.e., someone else's ID). Flag → Flagged for PESO.

**Q: Can the same ID be reused across accounts?**
A: It's **flagged**. If the extracted ID/reference number already appears on another
account, the scan warns *"already on file under another account."* → Flagged for PESO.

**Q: Is scanning automatic?**
A: **No.** Upload and scan are separate. A document can be uploaded and viewed in PESO
admin **without** a scan; the user taps **"Start AI Scan"** to run it. (Good for
presentations and lets PESO see un‑scanned documents.)

**Q: Does this apply to both roles and both platforms?**
A: **Yes** — helper and parent, web and mobile, through the shared `DocumentAIScan`
component and the same backend.

**Q: Can PESO tell who's been scanned vs not?**
A: **Yes.** The PESO user‑verification list has an **Any scan / AI‑scanned / Not
scanned** filter (backed by a per‑user `ai_scanned` flag).

**Q: If a hired helper does something wrong and leaves, can she erase her records?**
A: **No.** There is no account‑deletion feature, so the account and all
placement/contract/complaint records persist. And once a user has **any** placement
(active or ended), their **documents can no longer be deleted** — only PESO can update
them. This keeps the identity evidence PESO would need for a dispute.

**Q: What's the only way to get true authenticity certainty?**
A: Integrating with the **issuing registries** (PhilSys eVerify, PNP, TESDA‑TWSP).
That needs official credentials and adviser sign‑off — a scope decision, not just code.

---

## 3. The honest boundary (say this in a review)

> "It's an AI assistant that reads the document, checks it against the known layout of
> that ID/certificate, rates image quality, flags anything that looks fake, expired,
> not the account holder, or reused — and clearly fake/wrong images are auto‑rejected.
> It is **not** a government‑database check and **not** forgery‑proof; it's a first
> pass. **A PESO officer manually verifies and approves every document** — that's the
> actual gate. True forgery/authenticity certainty would require connecting to the
> issuing agency's records."

---

## 4. Decision flow (per side scanned)

```
Upload  →  (user taps) Start AI Scan  →  Gemini vision
                                          ├─ type match, template 0–100, clarity 0–100
                                          ├─ tampering signs (incl. screen/photocopy)
                                          └─ extracted fields
                                        │
        deterministic checks on fields ─┤ expiry past today?      → warning
                                         │ name ≠ account?         → warning
                                         └ duplicate ID number?    → warning
                                        │
        template ≥70 & no warnings → Passed
        template ≥70 & warnings    → Flagged
        template 45–69             → Flagged
        template <45               → Failed  → auto‑reject (only case)
                                        │
                          PESO manual review = FINAL decision
```

---

## 5. Where the code lives

| Concern | File |
|---|---|
| Gemini prompt, schema, per‑type guidance, scoring | `backend/shared/gemini_id.php` |
| Scan endpoint + Passed/Flagged/Failed gate + deterministic checks (expiry, name, duplicate) | `backend/helper/scan_id.php` |
| Per‑user `ai_scanned` flag for PESO list | `backend/peso/get_pending_users.php` |
| Record retention (block doc deletion after any placement) | `backend/helper/delete_document.php`, `backend/parent/delete_document.php` |
| Scan UI (idle → scanning → results), manual `autoStart={false}` | `frontend/components/shared/DocumentAIScan.tsx` and its call sites in `app/(helper)/profile/document-detail.tsx`, `app/(parent)/profile/document-detail.tsx`, `components/helper/web/HelperProfileWeb.tsx`, `components/parent/web/ParentProfileWeb.tsx` |
| PESO AI‑scan filter | `frontend/app/(peso)/users/index.tsx` |
| Which docs are shareable with employers (Valid ID + Barangay are PESO‑only) | `frontend/constants/documents.ts` |

---

## 6. Supported document types

Valid ID (PhilSys/Passport/Driver's License/UMID/PRC/Postal/Voter's/SSS/GSIS),
Barangay Clearance (and Certificate/Certification/Residency/Indigency),
Police Clearance, TESDA NC II. Valid ID scans **front and back independently**.

---

## 7. Known limits / future work (be upfront)

- Cannot guarantee catching a **high‑quality forgery** (needs issuing‑agency check).
- Duplicate‑ID check is a substring match on stored extracted data — good signal, not
  a guaranteed unique index (could be hardened with a dedicated indexed column).
- Name match is intentionally lenient to avoid false positives; a deliberate
  same‑surname impersonation may not flag — PESO still reviews.
- No liveness/anti‑spoof beyond the screen/photocopy prompt hint.
