# CareLink — Open Issues (post-testing round)

Everything raised after the deployed test round, with root cause where it's
already known. Nothing here is fixed yet — this is the work queue.

**Legend** — Effort: S (under an hour) · M (half a day) · L (a day or more) ·
XL (needs a decision first)

---

## A. Blocking / data-integrity

### A1 — Contact number lives in three places · M
**Reported:** signup accepts a number already used in a profile.

**Root cause:** the number exists in `users.phone` *and*
`helper_profiles.contact_number` *and* `parent_profiles.contact_number`.
`signup.php` only checks `users.phone`, which is optional and usually blank, so
a number entered during signup collides with nothing.

I fixed the *profile save* path (`shared/phone_identity.php` blocks a number held
by another account), but **signup still checks only one of the three columns**.

**Fix:** call `carelink_phone_conflict()` from `signup.php` too. Longer term,
make `users.phone` the single source and have the profile columns read from it —
you're right that three copies is a normalisation problem, and it's why the bug
keeps reappearing in a new place.

### A2 — Address search misses places, and typed addresses have no coordinates · M
**Reported:** testers can't find their barangay and type it manually; latitude
and longitude come back NULL.

**Root cause:** `LocationSearchInput.tsx` only calls `onSelect` when the user
picks a Nominatim suggestion. Typing sets the text but never sets coordinates.
Nominatim's Philippine barangay coverage is genuinely patchy, so this is common.

**Why it matters:** distance is 10 points of the match score. A helper with no
coordinates silently loses them and can't understand why their matches are poor.

**Fix:** on manual entry, geocode the typed string on blur; if that fails, fall
back to the municipality's coordinates so distance is approximate rather than
absent. Longer term, ship a PSGC barangay list so Ormoc barangays always resolve.

### A3 — Parent Work Mode lock is bypassable · M
**Reported:** the locked screen appears, but navigating to Messages or Profile
changes the bottom bar and grants access to Tasks and Helper Management.

**Root cause:** the lock is enforced on the Work Home screen, not on the tab bar.
Other screens render the work-mode bar without re-checking `hasActiveHire`.

**Fix:** move the check into the tab bar and the work-mode screens themselves, so
there's one gate rather than one per screen. Worth doing carefully — this is the
same class of bug as the web Work Mode gate fixed earlier.

---

## B. Payments

### B1 — Plus purchase does nothing in-app, and can be bought repeatedly · M
**Reported:** email arrives, system unchanged, "Purchase" still shown, can buy
again indefinitely.

**Root cause:** two separate things.
1. Activation only happens in the webhook. If the webhook isn't reachable,
   PayMongo takes the payment and nothing is granted — that's the current state.
2. Even once it works, there's no success modal and the menu entry doesn't change.

**Fix:**
- Confirm the webhook is registered against the live URL in **Test Mode**.
- On return from checkout, poll subscription status briefly and show a **receipt
  modal** — what they bought, what it unlocks, when it renews.
- Menu entry becomes **"CareLink Plus · Active"** and the screen leads with the
  receipt, not the upgrade button.
- `subscribe.php` already refuses a duplicate while a period is live; surface
  that instead of letting the button look available.

---

## C. Documents

### C1 — Document detail unreachable with only one side uploaded · S
Front **and** back are both required to open the detail screen. Someone who has
uploaded only the front can't get in to upload the back. Should open with either.

### C2 — Scan-result image opens *behind* the results screen · S
Helper mobile: full-screen zoom works from the document screen, but from the scan
results screen the image renders underneath. Modal stacking / z-order.

### C3 — Parent-side photo zoom doesn't work at all · S
Same viewer, never wired on the parent side.

### C4 — Rejection notification gives no explanation · M
**Reported:** tapping it redirects immediately, so the reason is never read.

**Fix:** tapping opens a **modal with the full message first**, then a button to
go to Documents. On arrival, outline the rejected document in red and say what to
do next. Applies to every notification with a reason attached, not just
rejections.

---

## D. Profile & onboarding

### D1 — "General Househelp" still ticks every job role · L
Still outstanding. Selecting it checks all ~32 roles, which reads as clutter.

**Why it isn't a small fix:** a helper's *categories* are derived from their job
roles (`helper_jobs` → `ref_jobs.category_id`). Leaving roles unticked zeroes the
25-point category weight — the largest single component of matching.

**Fix:** add a `helper_categories` table so a category can be held directly,
then read categories from both sources. Touches four endpoints that derive
categories. I started this once and reverted rather than leave browse broken.

### D2 — No confirmation at 100% profile strength · S
Both roles. There's a celebration at 90% but nothing at completion.

### D3 — Verified badge doesn't refresh · S
"Pending verification" persists until logout/login. The screen holds the status
from its initial fetch and never refetches after PESO approves.

**Fix:** refetch profile on screen focus (the pattern already used for the profile
photo).

---

## E. Staff portals

### E1 — PESO "Request more info" should open a conversation · S
Currently a modal that goes nowhere. Should route to **Messages** with that user
selected — the messaging screen now exists, so this is just wiring.

### E2 — PESO complaints need a detail view · M
Only Resolve/Dismiss, which is too blunt to act on. Needs a right-hand detail
panel matching the rest of the PESO design, a **Message the user** action, and
outcomes beyond two buttons (request info, warn, escalate, resolve with a note).

### E3 — Super admin complaints need the same · M
Plus **Forward to PESO** and **Message the user**.

### E4 — Super admin user verification can't scroll, can't suspend · S
The list doesn't scroll and there's no suspend action, so the screen can't
actually be used for its purpose.

### E5 — Complaint minimum length is too strict · S
The 20-character minimum blocks short but legitimate reports. Remove it; keep a
non-empty check.

---

## F. Features to build

### F1 — Feedback for employers, with a real question set · M
**Reported:** parents have no feedback entry; 5 questions isn't enough for UAT.

**Fix:** add **Send feedback** to the parent menu; expand to 12–15 questions
drawn from `chapter4-evaluation-instrument.md` so the in-app data matches the
written instrument. One submission per account, and if questions are added later,
show only the unanswered ones — a returning user answers just the new ones, a new
user answers everything in order.

**Note:** this makes the in-app form a real UAT instrument rather than a
supplement, which is a genuine improvement for Chapter 4.

### F2 — CareBot needs more context · M
Give it the current user's role, verification state and where they are in the
journey, so answers are specific rather than generic.

---

## G. Decisions needed before building

### G1 — Hiring without a job post · XL
**Reported:** a parent wants to hire a helper directly; and what if they agree
off-platform with no contract?

**Two separate problems.**

*Direct hire.* Reasonable and worth supporting. The clean way is a **direct hire
request**: the employer picks a helper and proposes terms; that proposal still
becomes a real contract both parties sign, and PESO still sees the placement.
What it skips is the public job post, not the safeguards. Chat before any of that
is fine — messaging is not the thing that needs gating.

*Off-platform hiring.* You cannot technically prevent two adults agreeing
privately, and any attempt (blocking contact details, locking chat) punishes
honest users and is trivially bypassed. The professional answer is to make the
on-platform path **worth staying on**, and to say so plainly in your defense:

- The contract is the helper's protection under RA 10361 — no contract means no
  documented salary, rest days or benefits.
- PESO verification, the placement record and dispute history only exist for
  on-platform hires.
- Reviews and work history — which get a helper their *next* job — only accrue
  here.

Add a short notice at the point of hire explaining what both sides lose by going
off-platform. Deterrence and disclosure, not enforcement. A panel will accept
that; claiming you can prevent it invites a question you can't answer.

### G2 — Replace Jitsi · XL
Jitsi has failed repeatedly in testing.

| Option | Free tier | Effort | Notes |
|---|---|---|---|
| **Jitsi (embedded)** | Free | S | Same service, in-app rather than a browser tab. May not fix the underlying reliability. |
| **LiveKit Cloud** | ~generous free tier | M | Purpose-built, good React Native SDK. Needs a token endpoint on your backend. |
| **Agora** | 10k free minutes/month | M | Very reliable in PH, mature SDK. Needs an App ID and token server. |
| **Daily.co** | ~free tier | S–M | Simplest embed of the three, prebuilt UI. |

**Recommendation:** for a capstone demo, **Daily.co or LiveKit**. Both need a
small token endpoint — a few dozen lines — and both are markedly more reliable
than public Jitsi. Agora is the strongest in the Philippines specifically, but
its setup is the heaviest.

**Worth asking:** is video essential to the defense, or would scheduling an
interview and meeting outside the app be acceptable? Interview *scheduling* works
today; only the in-app call is unreliable.

---

## Suggested order

1. **A1, A3** — data integrity and a bypassable lock
2. **B1** — payments must work before defense
3. **C1–C3, D2, D3, E1, E4, E5** — small, high-visibility fixes; a good batch
4. **C4, E2, E3** — notification and complaint detail views
5. **F1** — feedback, before UAT
6. **D1, G1, G2** — the ones needing schema changes or decisions

Items in group 3 are the cheapest wins per unit of tester frustration, and
several are the ones testers actually complained about.
