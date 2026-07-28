# CareLink — Job Applications, Rejection & Work Mode Access · Q&A

A study/reference sheet from a real walkthrough (using the "Kurt applies to all of
Sean's jobs" scenario) covering how rejection, re-application, and hiring interact,
plus two Work Mode access bugs found and fixed along the way. Notion-ready.

---

## The scenario that started this

> Kurt (helper) applied to all of Sean's (parent) job posts. Sean rejected Kurt's
> application. After that, Kurt could not apply again — is that right?

Two separate claims were tangled together here. One turned out not to be what
happens; the other was a real, confirmed gap.

---

## Q&A

**Q: Does rejecting one application reject a helper's other applications to the
same employer?**
A: **No.** `parent/update_application_status.php` updates **only the one**
`application_id` passed in (`WHERE application_id = ?`) — there is no cascade to
a helper's other applications with that employer. If Kurt had multiple pending
applications with Sean and only one was rejected, the others are untouched.

**Q: Then what DOES close a helper's other applications with an employer?**
A: **Hiring**, not rejecting. `parent/hire_helper.php` auto-closes the helper's
*other* applications to the *same* employer the moment one is moved to
`contract_pending`:
```
UPDATE job_applications ... SET status = 'auto_rejected',
  parent_notes = 'Closed automatically: employer is proceeding with
                   another of your applications with them.'
WHERE jp.parent_id = ? AND ja.helper_id = ? AND ja.application_id <> ?
  AND ja.status IN ('Pending','Reviewed','Shortlisted','Interview Scheduled')
```
This is intentional — once Sean is hiring Kurt for one role, Kurt's other pending
applications *to Sean* no longer make sense and are closed with a clear reason
(`auto_rejected`, distinct from a manual `Rejected`). So: **if you saw every one of
Kurt's applications flip to closed at once, that came from a hire action, not a
plain reject.**

**Q: Can Kurt re-apply to the *same* job after being rejected?**
A: **In practice, no — and this is the real bug.** Two endpoints disagree with
each other:
- `helper/browse_jobs.php` hides a job from the helper's browse list if they have
  **any** application for it that isn't `Withdrawn`:
  ```sql
  WHERE jp.status = 'Open' AND NOT EXISTS (
    SELECT 1 FROM job_applications ja
    WHERE ja.job_post_id = jp.job_post_id AND ja.helper_id = ? AND ja.status != 'Withdrawn'
  )
  ```
  `Rejected` is not `Withdrawn`, so once rejected, **the job disappears from
  Kurt's browse list** — he has no way to find it to re-apply.
- `helper/apply_job.php` would actually **allow** re-applying after a rejection —
  it resets the existing row back to `Pending` — but its guard is written
  backwards: it only *blocks* re-applying when the existing status is
  `Withdrawn` ("You have already applied to this job"), which is the one status
  that logically *should* be re-appliable.

**Net effect:** once Sean rejects Kurt for a specific job post, Kurt is
permanently locked out of that one job post, because he can never see it again
to hit "Apply." The endpoint that would allow it is unreachable.

**Q: Is that "correct" / intended behavior?**
A: It's a **product decision that was never made explicitly** — not a clear bug,
but not clearly right either:
- *In favor of keeping it strict:* stops a rejected helper from spamming the same
  employer.
- *Against:* a helper whose situation changed (newly PESO‑verified, added
  documents, fixed something the employer flagged) is shut out of that employer
  **forever**, with no recourse — and the job‑hiding logic and the
  re‑apply‑allowing logic actively contradict each other, which reads as
  unintentional.

**Not changed yet.** Two options were laid out for a future decision:
1. Keep the current strict lock, but make it *visible* to the helper ("This
   employer didn't move forward — you can't re‑apply to this job") instead of the
   job silently vanishing.
2. Allow re‑applying to a rejected job — show it in browse again labeled
   "Previously not selected," fix the inverted `Withdrawn` guard, optionally add
   a cooldown or a cap so it can't be abused.

**Q: If Sean posts a *new* job, can Kurt apply to that one?**
A: **Yes.** The browse exclusion is scoped to a specific `job_post_id`, not to the
employer. A new job post is a brand-new `job_post_id` Kurt has never applied to,
so it appears in his browse normally and he can apply. The lock only applies to
the exact job post he was rejected from.

---

## The two Work Mode access bugs found during this investigation

**Q: Why could Sean open Work Mode with zero hired helpers?**
A: Two separate, unrelated bugs — both now fixed.

1. **Web skipped the unlock check entirely.** `app/(parent)/home/index.tsx`'s
   desktop branch rendered `ParentWorkHomeWeb` whenever `isWorkMode` was true,
   without checking `hasActiveHire` — the mobile branch had that check, web
   didn't. So on desktop, toggling to Work Mode gave full access with zero
   placements. **Fixed:** web now shows the same "Work Mode is locked" screen as
   mobile until there's a real active placement.

2. **A stale `placements` row could keep the count above zero.** The unlock
   check (`parent/get_stats.php`) originally counted raw `placements` rows with
   `status = 'Active'`. That column is only flipped to `Terminated` by a cron job
   (`process_terminations.php`); if that cron hadn't run (common in local/dev,
   or just a timing gap), a placement whose employment had actually ended stayed
   `'Active'` in that table forever — keeping Work Mode unlocked even though the
   dashboard (which checks the *live* application status) correctly showed 0
   active helpers. **Fixed:** `get_stats.php` now joins to `job_applications` and
   requires the application to still be in a hired-ish state
   (`hired` / `Accepted` / `termination_pending`), so the unlock gate and the
   dashboard always agree.

A genuine active placement (`active_placements > 0` from a hire that actually
completed via `finalize_hire_after_contract.inc.php`) is required either way — a
parent cannot get real Work Mode access by any other route.

---

## Where the code lives

| Concern | File |
|---|---|
| Reject scope (single application only) | `backend/parent/update_application_status.php` |
| Sibling auto-close on hire | `backend/parent/hire_helper.php` |
| Browse exclusion (hides non-`Withdrawn` applied jobs) | `backend/helper/browse_jobs.php` |
| Re-apply logic + inverted `Withdrawn` guard | `backend/helper/apply_job.php` |
| Placement finalized only on full contract sign | `backend/shared/finalize_hire_after_contract.inc.php` |
| Work Mode unlock count (fixed) | `backend/parent/get_stats.php` |
| Web Work Mode gate (fixed) | `frontend/app/(parent)/home/index.tsx` |

---

## Known gap (flagged, not built)

Re-applying to a rejected job is **not currently possible** through the UI, due to
the browse-hiding / re-apply-guard mismatch above. This needs a product decision
(keep strict + communicate it, or allow re-apply with safeguards) before either
side gets built out further.
