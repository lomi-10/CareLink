# CareLink — Modules & Test Cycles

Reference for Chapter 4 and the final defense. Derived from the actual codebase
(46 tables, ~160 endpoints, 4 portals), not from a plan — anything listed here
exists and can be demonstrated.

Companion documents:
- `chapter4-evaluation-instrument.md` — the UAT questionnaire and scoring
- `document-scanning-qa.md`, `job-applications-rejection-qa.md`,
  `peso-verification-queue-qa.md`, `generated-text-qa.md` — defensible answers
  to the questions panels actually ask

---

## Part 1 — The 12 modules

Group your Chapter 4 unit-test tables by these. Each is a real folder or table
cluster you can point at.

| # | Module | What it does | Lives in |
|---|---|---|---|
| 1 | **Authentication & Accounts** | Signup, login (email *or* mobile), email verification codes, password reset, verified email/contact changes | `backend/auth/`, `shared/auth_codes.php`, `shared/mailer.php` |
| 2 | **Helper Profile** | Personal details, address, photo, roles, skills, languages, work history, profile strength | `backend/helper/`, `helper_profiles` + 5 tables |
| 3 | **Employer Profile** | Household details, size and type, children/elderly, address | `backend/parent/`, `parent_profiles` + 3 tables |
| 4 | **Document Verification** | Upload, Gemini AI pre-screening, expiry/identity/duplicate checks, PESO approval, sharing rules | `helper/scan_id.php`, `shared/gemini_id.php`, `user_documents` |
| 5 | **PESO Verification** | Account review queue, document review, job post approval, rejection with reason | `backend/peso/` (30 endpoints) |
| 6 | **Job Posting** | Create/edit, categories→roles→skills, salary floor, deadlines, PESO gate, generated descriptions | `parent/post_job.php`, `job_posts` |
| 7 | **Matching & Search** | Weighted compatibility both directions, browse, filters, saved jobs, recommendations | `shared/job_match.php`, `browse_jobs.php`, `parentHelperMatch.ts` |
| 8 | **Applications & Hiring** | Apply, cover letters, shortlist, interviews, invitations, status lifecycle | `helper/apply_job.php`, `parent/`, `interviews/`, `job_applications` |
| 9 | **Contracts** | DOLE-compliant generation, dual digital signature, PDF, amendments, termination | `backend/contracts/`, `v1/applications/sign_contract.php` |
| 10 | **Work Mode** | Tasks + photo proof, check-in/out, attendance (opt-in), leave requests, payroll view | `backend/v1/` (32 endpoints), `placements` |
| 11 | **Communication** | Helper⇄employer chat, staff messaging, notifications, CareBot, video interviews | `backend/messages/`, `shared/staff_contacts.php` |
| 12 | **Administration & Revenue** | Super admin, audit trail, complaints, feedback, boosts, subscriptions, placement fees | `backend/admin/`, `webhooks/paymongo.php` |

**Four portals:** Helper · Employer · PESO Officer · Super Admin — each with its
own navigation, theme and permissions.

---

## Part 2 — Integration cycles

These are the cross-module chains. Each one is a Chapter 4 integration test:
name the modules it spans, the trigger, and the verifiable outcome.

### Cycle 1 — Registration → Verification
`Auth → Profile → Documents → PESO`

Signup → email code → profile setup → upload both documents → account enters
PESO queue → officer approves → helper becomes visible to employers.

**Verify:** account cannot reach the queue with only one document; approval flips
`verification_status` and makes the profile appear in employer search.

**Known behaviour to state:** profile *strength* (a completion score) is separate
from queue *readiness* (a checklist). They deliberately measure different things.

### Cycle 2 — Job Post → Approval → Visibility
`Employer Profile → Job Posting → PESO → Matching`

Post a job → status `Pending` → PESO approves → `Open` → appears in helper browse
with a match score.

**Verify:** a `Pending` post is invisible to helpers and cannot be boosted; an
expired `expires_at` removes it from browse without a cron.

### Cycle 3 — Discovery → Application
`Matching → Applications → Communication`

Helper browses → sees weighted match → applies with a cover letter and chosen
documents → employer sees the applicant with a compatibility breakdown.

**Verify:** the same job shows the *same* score on dashboard and browse (both use
`shared/job_match.php`); an already-applied job stays visible but shows status
instead of Apply; only shareable document types reach the employer.

### Cycle 4 — Shortlist → Interview → Hire
`Applications → Interviews → Contracts`

Shortlist → schedule interview → send contract → **both** parties sign →
placement created → Work Mode unlocks on the start date.

**Verify:** nothing activates on one signature; hiring auto-closes the helper's
other applications *to that same employer* with a stated reason; Work Mode stays
locked until `start_date`.

### Cycle 5 — Work Mode Operations
`Contracts → Work Mode → Communication`

Assign tasks → helper completes with optional photo → check-in/out → leave
request → employer approves → payroll reflects days and leave.

**Verify:** attendance is OFF by default and opt-in per placement; payroll is a
computed view that moves no money.

### Cycle 6 — Termination → Review
`Work Mode → Contracts → Matching`

Either side ends the placement → notice period → placement closes → both leave a
review → ratings feed future match scores.

**Verify:** the rating average visibly changes a subsequent match score — this is
the cycle that proves the feedback loop closes.

### Cycle 7 — Payment (Revenue)
`Job Posting / Contracts → PayMongo → Webhook`

Boost a post or subscribe → PayMongo checkout → webhook confirms → benefit
applied.

**Verify:** nothing is granted until the webhook fires (returning from checkout
is not payment); a boosted post sorts first but its match score is unchanged and
carries a visible "Boosted" tag; **no helper-facing path can charge anyone.**

### Cycle 8 — Oversight
`All modules → Admin`

Complaint filed → PESO or admin resolves → audit trail records it; feedback
submitted → visible to super admin and exportable.

**Verify:** `log_trail` captures the action; feedback exports to CSV correctly.

---

## Part 3 — Unit tests worth documenting

Pick items with a *computable* expected result — those defend best.

| Module | Test case | Expected |
|---|---|---|
| Matching | Helper matching category + roles + skills, same city | Score ≥ 85, reasons list category and distance |
| Matching | Same job scored on dashboard vs browse | Identical score (single shared scorer) |
| Matching | Boosted low-match post vs organic high-match | Boosted sorts first, **scores unchanged** |
| Salary | ₱9,000/month, daily period | Correct daily rate; below ₱7,000 rejected |
| Documents | Expired document scanned | Flagged, not auto-approved |
| Documents | ID name ≠ account name | Identity warning raised and shown to PESO |
| Documents | Legitimacy < 45 | Auto-rejected; ≥ 70 with no warnings → Passed |
| Verification | One document uploaded | Does **not** enter PESO queue |
| Auth | Same mobile on second account | Rejected — one number, one account |
| Auth | Wrong code 5× | Code dead, must request a new one |
| Contracts | PDF generated | All BK-1 fields present and correct |
| Contracts | One signature only | Placement **not** created |
| Payments | Webhook with tampered signature | Rejected; nothing granted |
| Payments | Same webhook event twice | Applied once (idempotent) |
| Payments | ₱199 fee split | ₱59.70 PESO + ₱139.30 platform = ₱199.00 |
| Work Mode | Leave approved | Payroll reflects it |
| Generation | Same job, 10 different employers | 10 different descriptions |

---

## Part 4 — Limitations to state before you're asked

Volunteering these reads as rigour. Being caught omitting them does not.

1. **Notifications are polled (30s), not pushed.** Adequate at tested load;
   scales poorly past a few hundred concurrent users. Upgrade path is Expo Push
   Notifications, which needs no persistent server — WebSockets would require
   leaving shared hosting.
2. **AI document scanning is assistive, not authoritative.** Gemini vision
   against known layouts, not a government database. A high-quality forgery can
   pass. **A PESO officer approves every document** — that is the real gate.
   Certainty would need PhilSys/PNP/TESDA integration.
3. **Endpoint authorisation compares ids from the request; there is no
   server-side session or token.** It prevents accidental cross-user access
   through the UI, not a crafted request. Token-based auth is the Chapter 5
   recommendation.
4. **Generated text is templates with seeded variation, not AI.** Say
   "template library," never "AI-generated." Personalised per user, but a helper
   with an empty profile gets the plain template.
5. **CareLink never holds or moves salary.** Payroll is a computed record;
   employers pay helpers directly. Only platform fees go through PayMongo, and
   only employers are ever charged (RA 8042, RA 10364).
6. **PESO revenue share accrues but is not disbursed** — that requires a signed
   MOA.

---

## Part 5 — Pre-defense checklist

**Must work in the live demo**
- [ ] Signup → verification email arrives → code accepted
- [ ] Document upload + AI scan returns a result
- [ ] PESO approves an account; helper appears in employer search
- [ ] Job post → PESO approval → visible with a match score
- [ ] Apply → shortlist → interview → contract → **both** sign → Work Mode
- [ ] Task, check-in, leave request, payroll view
- [ ] Boost or subscription completes and the benefit appears
- [ ] Admin feedback export downloads and opens in Excel

**Have ready to show**
- [ ] Match breakdown for a real pair (proves the algorithm is not a black box)
- [ ] A generated contract PDF
- [ ] A flagged document in PESO review
- [ ] Audit trail entries
- [ ] UAT results: demographics, weighted means per criterion, overall rating

**Rehearse answering**
- "Is the AI accurate?" → Part 4 item 2
- "How do you prevent fake documents?" → AI pre-screen + human PESO review
- "Can it scale?" → Part 4 item 1, with the push-notification path
- "How do you make money without charging helpers?" → three employer-only streams
- "What would you improve?" → Part 4 items 1 and 3, said plainly

---

## Part 6 — Known gaps at time of writing

Do not present these as finished:

- **Payments are unproven end to end.** The webhook rejects forged calls and the
  fee maths is verified, but no real payment has completed a full round trip.
  Test on the deployed site before defense.
- **Video interviews open in a browser tab**, not in-app.
- **No embedded map** — location is a link out plus Nominatim search, which is
  imprecise for some barangays.
- **The employer religion field saves but has no form input yet.**
- **Selecting "General Househelp" still auto-ticks every role.** Matching derives
  a helper's categories from their roles, so removing that needs a schema change.
