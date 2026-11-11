   # CareLink — Modules & Test Cycles

Reference for Chapter 4 and the final defense. Derived from the actual codebase
(52 tables, ~180 endpoints, 4 portals), not from a plan — anything listed here
exists and can be demonstrated.

Companion documents:
- `chapter4-evaluation-instrument.md` — the UAT questionnaire and scoring
- `document-scanning-qa.md`, `job-applications-rejection-qa.md`,
  `peso-verification-queue-qa.md`, `generated-text-qa.md` — defensible answers
  to the questions panels actually ask
- `open-issues-qa.md` — the current bug/feature queue from testing (Part 7
  below is the short version; that document is the working list)

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
| 5 | **PESO Verification** | Account and document review, job-post approval, NSRP export, reports & analytics | `backend/peso/` (30 endpoints) |
| 6 | **Job Posting** | Create/edit, categories→roles→skills, salary floor, deadlines, PESO gate, generated descriptions | `parent/post_job.php`, `job_posts` |
| 7 | **Matching & Search** | Weighted compatibility both directions, browse, filters, saved jobs, recommendations | `shared/job_match.php`, `browse_jobs.php`, `parentHelperMatch.ts` |
| 8 | **Applications & Hiring** | Apply, cover letters, shortlist, interviews, invitations, status lifecycle | `helper/apply_job.php`, `parent/`, `interviews/`, `job_applications` |
| 9 | **Contracts** | DOLE-compliant generation, dual digital signature, PDF, amendments, termination | `backend/contracts/`, `v1/applications/sign_contract.php` |
| 10 | **Work Mode** | Contract and leave management, payroll estimates, payslips | `backend/v1/`, `placements`, `leave_requests` |
| 11 | **Communication** | Helper⇄employer chat, staff messaging, notifications, CareBot, video interviews | `backend/messages/`, `shared/staff_contacts.php` |
| 12 | **Administration & Revenue** | Super admin, audit trail, complaints, boosts, subscriptions, Digital Contract & Facilitation Fee | `backend/admin/`, `webhooks/paymongo.php` |

**Four portals:** Helper · Employer · PESO Officer · Super Admin — each with its
own navigation, theme and permissions.

---

## Part 2 — Detailed feature inventory

Everything below is built and demonstrable. Grouped by the 12 modules above so a
Chapter 4 unit-test table can cite a module and pick features from its list.

### 1. Authentication & Accounts
- Signup as helper or employer; **login with email *or* mobile number**
- Helper signup requires a birth date and rejects under-18 or invalid dates on
  the server before creating the account
- Email verification by 6-digit code, with resend and expiry
- Password reset by emailed code; password strength meter on entry
- **Login lockout** — 5 attempts then a 1-minute lock, persisted so leaving the
  screen or killing the app does not reset it
- Verified email and contact-number changes (code sent to the *new* address)
- **Server-issued session tokens** — 32-byte random, stored SHA-256 hashed,
  30-day expiry, revoked on logout (see Part 5 item 3 for rollout state)
- One mobile number per account, enforced at signup and at change
- Role-aware routing: helper, employer, PESO and super admin land in their own portal

### 2. Helper Profile
- Personal details, birth date, gender, civil status and bio; helper accounts
  must meet the platform's 18+ eligibility rule
- This is a CareLink product safeguard pending child-protection features, not a
  statement that 18 is the statutory minimum under Philippine law
- Birth date and civil status remain available for PESO review and required
  contract generation, but are omitted from employer-facing profile and
  application data; age is not a matching factor
- Preferred Weekly Rest Day, requested by the helper and carried into contract
  terms when the helper has set one
- Address with barangay/municipality/province plus **map-free geocoding** via
  Nominatim, with a server-side fallback for hand-typed addresses
- Job roles chosen from the reference catalogue; skills; languages spoken
- Work history entries with dates and employer names
- Expected salary and period, employment type, work schedule preferences
- **Profile strength meter** — a completion score that names the missing items
- Guided setup coach on the home screen for incomplete profiles
- Profile view counter; saved-profile bookmarks by employers
- Appearance settings: light/dark and a warm dark-brown theme

### 3. Employer Profile
- Household composition: size, housing type, children (ages, special needs),
  elderly (ages, condition, care level), pets
- Address with the same geocoding treatment as helpers
- Household bio; religion is not collected from helpers or employers
- Profile completion tracking with a 90% gate before PESO review
- Employer average and individual star ratings visible to helpers before they
  apply; written comments are visible only to PESO/admin

### 4. Document Verification
- Upload Valid ID (front **and** back), Barangay Clearance, and optionally
  TESDA NC2, NBI Clearance, Police Clearance
- **JPG / PNG / PDF accepted, validated by magic bytes** — the real first bytes
  of the file, not the filename or the Content-Type header — with a 5 MB cap
- **Gemini AI pre-screen** returning a legitimacy score, a clarity score,
  extracted fields, and warnings (expiry, name mismatch, tampering signals)
- Scores ≥ 70 with no warnings receive an AI **Passed pre-screen** label, not
  approval; the document remains Pending until PESO acts. Scores from 45–69 or
  with warnings are Flagged for PESO review. Scores below 45 are automatically
  Rejected, so do not claim every outcome is decided by a person
- **Signed, expiring document URLs** — 15-minute HMAC links served through
  `serve_document.php`, never a static path
- **PESO credential seals** — a scalloped gold/emerald/blue seal per credential
  rather than one generic "Verified" pill. Valid ID, Barangay Clearance and
  TESDA NC2 can be sealed; **NBI and Police Clearance never are**, because PESO
  cannot authenticate NBI/PNP records and says so on the badge
- Required vs optional split: only Valid ID + Barangay Clearance are the
  verification bar, and optional credentials are never reported as "missing"
- Sharing rules: Valid ID and Barangay Clearance are **never** shown to
  employers (they carry home addresses); the helper chooses per application
  which of the shareable three to attach
- Verification history timeline per document

### 5. PESO Verification
- **User verification queue** with Overview and Documents tabs, filters by role
  and status, and search
- **Full-screen document viewer** — the page on a dark stage with 100–400% zoom
  and two-axis pan, the **AI-extracted details beside it** for direct comparison,
  inline PDF rendering on web, and Approve/Reject from the same screen
- Approve wording follows authority: "Approve" for sealable credentials,
  "Accept on file" for NBI/Police
- Missing-required-document guard: approving without a Valid ID or Barangay
  Clearance names what is missing and demands an explicit acknowledgement
- **Job verification** with a Priority Review band — salary against the floor,
  employer standing, completeness, statutory benefits — a compliance checklist,
  and Approve / Request Changes / Reject with reasons
- **Credential flagging** — raise a fraud concern on an already-verified
  document, optionally withdrawing verification; flags survive a re-upload
- PESO staff can create fellow PESO officer accounts (audited)
- Categories & skills reference management
- **NSRP PDF export** for a helper's employment-services form
- PESO reports & analytics, including compliance, placement, complaint and
  workforce summaries (detailed below)

### 6. Job Posting
- Category → roles → skills cascade drawn from the reference catalogue
- Salary with period, plus meals, accommodation, SSS, PhilHealth, Pag-IBIG
- Work schedule, days off, contract duration, preferred start date
- Preferences: language and minimum experience; job posts have no age-range or
  religion preference
- **Estimated match count before posting** — how many helpers this post would reach
- The estimate and candidate discovery include only helpers meeting the 18+
  platform eligibility rule; age is not disclosed to employers or used in the
  compatibility score
- Generated job descriptions personalised from the post's own details
- Description wording that may imply age or religion restrictions triggers a
  warning; the post is flagged for contextual PESO review before publication
- PESO gate: `Pending` until approved, invisible and un-boostable until then
- Expiry dates remove a post from browse without a cron job
- **Boosting** — a paid post sorts first, carries a visible "Boosted" tag, and
  its match score is deliberately unchanged

### 7. Matching & Search
- **Weighted compatibility, both directions**: Category 25 · Roles 15 ·
  Skills 15 · Salary 15 · Distance 10 · Experience 10 · Rating 10
- Age is not disclosed or used as a score factor, and religion is not collected;
  helper rest-day requests are an employment-term accommodation, not a ranking input
- One shared scorer, so the same pair scores identically on dashboard and browse
- **Match breakdown shown to the user** — the reasons, not just the number
- Browse with filters (category, salary, employment type, schedule, distance)
- Saved jobs, saved profiles, saved searches
- Recommendations on both home screens
- Distance from geocoded coordinates, with a graceful fallback when absent

### 8. Applications & Hiring
- Apply with a cover letter — **30 templates with seeded variation**, capped at
  3 generations per application
- Choose which shareable documents to attach, per application
- Status lifecycle: Pending → Reviewed → Shortlisted → Interview Scheduled →
  Accepted → contract_pending → hired, plus Withdrawn / Rejected / auto_rejected
- Employer-side review with a compatibility breakdown and applicant profile
- **Reject with a reason**, sent to the helper
- **Job invitations** — an employer invites a specific helper; the helper accepts
  or declines in chat, and the invite modal hides jobs they already applied to
- **Direct hire offers** — an employer hires a helper without a public post,
  routed through PESO review before terms reach the helper
- A helper's Preferred Weekly Rest Day is shared in application/hiring context
  and carried into contract terms for employer discussion and agreement
- Interview scheduling: in-person, video call or phone, with two-sided confirmation
- Hiring auto-closes that helper's other applications **to the same employer**,
  with a stated reason

### 9. Contracts
- DOLE **BK-1 compliant** generation from the agreed terms
- **Dual digital signature** — nothing activates on one signature
- PDF export with every BK-1 field populated
- Amendment requests: either side proposes changes, the other accepts
- Termination with notice period and a recorded reason
- Renewal intent capture near contract end
- PESO can review contracts across the platform

### 10. Work Mode
- **Contract and leave** — helpers submit leave requests; employers approve or decline
- **Payroll and payslips** — estimates use the agreed contract pay schedule and approved paid/unpaid leave; attendance is not recorded and CareLink moves no money
- Placement reviews from both sides once the placement ends

### 11. Communication
- Helper ⇄ employer chat with image and **camera** attachments
- Job invitations rendered as actionable cards inside chat
- Staff messaging: PESO ⇄ any user, reachable from any case screen
- **Notifications** with a detail modal, deep-linking to the exact record
- **CareBot** — a Gemini assistant whose transcript survives closing the panel;
  it warns users not to enter sensitive details because messages are processed
  by an external AI service
- **Video interviews via Daily.co**, rooms created server-side with a 2-hour expiry
- **Verification guard** — a pending helper or employer cannot message the other
  side, post, apply, invite or direct-hire; PESO staff are deliberately exempt so
  a pending user can still ask why a document was rejected

### 12. Administration & Revenue
- Super admin portal: user management, complaint forwarding, audit log
- Super admin creates both PESO officer and fellow super-admin accounts
- **Audit trail** (`log_trail`) on every verification, approval and staff action
- **Complaint case management** — see the dedicated breakdown below
- UAT responses are collected through Google Forms, outside CareLink; they are not stored in the app
- Revenue: employer subscriptions (CareLink Plus), post boosts, and the
  Digital Contract & Facilitation Fee
- **PayMongo hosted checkout with webhook signature verification**, idempotent
  event handling, and a webhook-independent reconciliation path
- The one-time employer fee is recorded when the signed contract activates a
  placement — **100% platform, 0% PESO** (RA 8759: a PESO
  provides employment facilitation free of charge; see Part 5 item 6)
- Demo control panel for user-testing sessions, structurally unable to touch
  non-demo data

### Complaint handling (spans modules 5, 11 and 12)
Worth its own list — it is the most involved workflow in the system.

- Filed by either party against a helper or an employer, with or without a placement
- **Categorised** at submission: misconduct, non-payment, unsafe conditions,
  abuse or mistreatment, contract dispute, harassment, fraud, other
- Captures **what · when · where · how** — subject, incident date and time,
  incident address to barangay level, and the reporter's own account
- **Escalation ladder Barangay → PESO → DOLE.** Barangay is not integrated: the
  PESO officer refers by hand and records it, and the ladder marks a step done
  only when a referral was actually logged
- **Action log replaces Resolve/Dismiss** — Under review, Action to be taken
  (requires a target date), Action taken, Referred to barangay, Referred to
  DOLE, Resolve, Dismiss
- Any entry can be marked **internal** — PESO-only, notifies nobody
- **Case tracker visible to both parties**, with internal notes withheld, the
  officer's name replaced by "PESO Ormoc", and the reporter's description hidden
  from the person reported
- Prior-history chip on the reported party — how many other complaints and how
  many were upheld
- **Public safety markings** (caution / serious) shown when browsing that
  account. Four rules enforced server-side: only from a **resolved** case, no
  narrative or names published, employers can be marked exactly as helpers can,
  and every marking is liftable with a recorded reason

### PESO reports & analytics
- Headline cards, placements over time, verification queue
- RA 10361 compliance: average salary against the floor, benefits compliance,
  contract status
- **Workforce demographics** — helper gender split, placements by gender, and
  **complaint rate per 100 helpers** rather than a raw count, which would only
  track headcount
- **Geography** — helpers and employers inside vs beyond Ormoc, with the top
  outside municipalities named
- **Category leaders** — job posts, placements and helper specialty side by side
- **Who gets reported** — helpers vs employers, with a plain-language verdict
- **Six-sheet Excel workbook** (Summary · Helpers · Employers · Placements ·
  Complaints · Demographics) carrying name, age, gender, barangay, municipality,
  within/beyond Ormoc, category specialty, verification, and placement and
  complaint counts. Placements name both parties; complaints name who filed and
  who was reported
- **In-app preview before export** — the workbook's own tab strip, rendered from
  the same server-side data the file is built from

### Cross-cutting: security controls
Full detail in `SECURITY_NOTES.md` — the short version, because panels ask.

- **Ownership checks on ~40 endpoints** — a request cannot read or change another
  account's data by changing an id
- **Session tokens** issued at login, stored hashed, revoked on logout
- **Upload validation by content**, not filename or header
- **Signed expiring document links** compared with `hash_equals()`
- **Verification enforced server-side**, so a direct API call is refused exactly
  like an in-app one
- Staff-only endpoints behind `peso_require_staff()` / `admin_require_staff()`
- Audit rows on every staff action that changes someone's standing

### Cross-cutting: design system
- Four portals, each themed: helper, employer, PESO (warm orange, light **and**
  dark), super admin
- Fredoka typeface throughout; shared primitives so the PESO portal reads as one product
- Web is designed as web, not stretched mobile — master-detail panes instead of
  modals wherever a desktop screen allows it
- Mobile form modals are bottom sheets; dark mode is a warm brown, not inverted grey
- Empty states, loading states and error states written as copy, not left blank

---
## Part 3 — Integration cycles

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

Helper requests leave → employer approves or declines → payroll estimate reflects
the agreed pay schedule and approved paid/unpaid leave; payslips remain available.

**Verify:** no attendance or task tracking is present; payroll is an estimate based
on contract terms and leave records, and CareLink does not process payments.

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

Complaint filed → PESO or admin resolves → audit trail records it; UAT responses
are collected and exported separately in Google Forms.

**Verify:** `log_trail` captures the action; no in-app feedback or evaluation data is stored.

---

## Part 4 — Unit tests worth documenting

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
| Auth | Helper signup with an under-18 or invalid birth date | Rejected by the server before account creation |
| Auth | Wrong code 5× | Code dead, must request a new one |
| Privacy | Employer helper-directory, application-list, applicant-profile, and hire-option APIs | No helper birth date, age, civil status, or religion fields |
| Privacy | Helper views employer profile | Religion is not collected or returned |
| Job posting | Description contains age/religion-only wording | Employer warning; post stays Pending and PESO sees a review flag |
| Ratings | Helper views employer profile | Star ratings visible; written review text absent |
| Contracts | PDF generated | All BK-1 fields present and correct |
| Contracts | One signature only | Placement **not** created |
| Payments | Webhook with tampered signature | Rejected; nothing granted |
| Payments | Same webhook event twice | Applied once (idempotent) |
| Payments | ₱199 Digital Contract & Facilitation Fee split | ₱0.00 PESO + ₱199.00 platform — PESO takes no share |
| Work Mode | Leave approved | Payroll reflects it |
| Generation | Same job, 10 different employers | 10 different descriptions |

Run the local guard checks with `php backend/tests/safeguards_test.php`. The API
regression test in `backend/tests/employer_helper_privacy_api_test.php` requires a
test deployment and fixture IDs for an employer, an available helper, and their
application; it checks the actual JSON responses and rejects an under-18 signup.

---

## Part 5 — Limitations to state before you're asked

Volunteering these reads as rigour. Being caught omitting them does not.

1. **Notifications are polled (30s), not pushed.** Adequate at tested load;
   scales poorly past a few hundred concurrent users. Upgrade path is Expo Push
   Notifications, which needs no persistent server — WebSockets would require
   leaving shared hosting.
2. **AI document scanning is assistive, not authoritative.** Gemini vision
   against known layouts, not a government database. A high-quality forgery can
   pass. **A PESO officer approves every document** — that is the real gate.
   Certainty would need PhilSys/PNP/TESDA integration.
3. **Session tokens exist but are not yet mandatory.** Login issues a hashed,
   expiring token and every protected endpoint prefers it; the legacy
   "id from the request" path is still accepted as a fallback so an un-updated
   app keeps working. Setting `AUTH_STRICT => true` in `config.local.php` makes
   the token required. **Say it in that order** — the control is built, the
   switch is off pending a full login regression test. Until it is on, the
   guarantee is "prevents cross-user access through the UI", not "resists a
   crafted request".
4. **Generated text is templates with seeded variation, not AI.** Say
   "template library," never "AI-generated." Personalised per user, but a helper
   with an empty profile gets the plain template.
5. **CareLink never holds or moves salary.** Payroll is a computed record;
   employers pay helpers directly. Only platform fees go through PayMongo, and
   only employers are ever charged (RA 8042, RA 10364).
6. **PESO receives no revenue, by law.** Under RA 8759 a Public Employment
   Service Office provides employment facilitation **free of charge**, and PESO
   Ormoc City confirmed they take no share. Earlier drafts described an accruing
   30% "partnership share" pending an MOA — that was a misunderstanding and the
   split is now 0% PESO / 100% platform in code. If a panel asks what PESO gets
   out of CareLink, the answer is operational: a digitised verification queue,
   case management, and labour-market data — **not money**.

---

## Part 6 — Pre-defense checklist

**Must work in the live demo**
- [ ] Signup → verification email arrives → code accepted
- [ ] Document upload + AI scan returns a result
- [ ] PESO approves an account; helper appears in employer search
- [ ] Job post → PESO approval → visible with a match score
- [ ] Apply → shortlist → interview → contract → **both** sign → Work Mode
- [ ] Contract and leave request → employer decision → payroll/payslip view
- [ ] Boost or subscription completes and the benefit appears
- [ ] UAT questionnaire is available through Google Forms, outside the app

**Have ready to show**
- [ ] Match breakdown for a real pair (proves the algorithm is not a black box)
- [ ] A generated contract PDF
- [ ] A flagged document in PESO review
- [ ] Audit trail entries
- [ ] UAT results: demographics, weighted means per criterion, overall rating

**Rehearse answering**
- "Is the AI accurate?" → Part 5 item 2
- "How do you prevent fake documents?" → AI pre-screen + human PESO review
- "Can it scale?" → Part 5 item 1, with the push-notification path
- "How do you make money without charging helpers?" → three employer-only streams
- "What would you improve?" → Part 5 items 1 and 3, said plainly

---

## Part 7 — Known gaps at time of writing

Do not present these as finished:

- **Payments are unproven end to end.** The webhook rejects forged calls and the
  fee maths is verified, but no real payment has completed a full round trip.
  Test on the deployed site before defense.
- **Video interviews open in a browser tab**, not in-app.
- **No embedded map** — location is a link out plus Nominatim search, which is
  imprecise for some barangays.
- **Selecting "General Househelp" still auto-ticks every role.** Matching derives
  a helper's categories from their roles, so removing that needs a schema change.
- **Barangay referral is manual.** The complaint escalation ladder records that a
  referral happened; it does not notify a barangay. Stated as a future
  enhancement, not a working integration.
- **Public safety markings are a judgement call.** The guards are enforced —
  resolved cases only, no narrative published, liftable — but what counts as
  "serious" versus "caution" is an officer's decision. Agree the threshold
  internally before UAT.
- **Super-admin account deletion is not built.** PESO can mark and PESO can
  recommend; removing an account is described in the workflow but not
  implemented.
- **CORS is wide open** (`Access-Control-Allow-Origin: *`) across the backend, and
  most endpoints allow only `Content-Type`. Turning `AUTH_STRICT` on adds an
  `Authorization` header to every request, which will trigger a preflight those
  endpoints currently refuse. Fix CORS **before** flipping that switch.
