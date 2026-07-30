# CareLink — Job Applications, Rejection & Work Mode Access · Q&A

From the "Kurt applies to all of Sean's jobs" walkthrough. Notion-ready.

---

## Applications & rejection

**Q: Does rejecting one application reject the helper's others with that employer?**

**No.** `parent/update_application_status.php` touches exactly one row:

```sql
UPDATE job_applications SET status = ? WHERE application_id = ?
```

**Q: Then what closes a helper's other applications?**

**Hiring, not rejecting.** `parent/hire_helper.php` auto-closes the helper's
*other* applications to the *same* employer:

```sql
UPDATE job_applications ... SET status = 'auto_rejected',
  parent_notes = 'Closed automatically: employer is proceeding with
                  another of your applications with them.'
WHERE jp.parent_id = ? AND ja.helper_id = ? AND ja.application_id <> ?
  AND ja.status IN ('Pending','Reviewed','Shortlisted','Interview Scheduled')
```

Intentional — once Sean is hiring Kurt for one role, Kurt's other pending
applications *to Sean* no longer make sense. So if every application flipped
closed at once, that was a **hire**, not a reject.

**Q: Can Kurt re-apply to the same job after being rejected?**

**No — and now he can see why.** Previously the job silently vanished from
browse, which was the real bug. Two things were fixed:

1. `browse_jobs.php` no longer hides applied-to jobs. It returns the status
   instead:

```php
'application_status' => ($job['my_application_status'] && $job['my_application_status'] !== 'Withdrawn')
    ? $job['my_application_status'] : null,
'can_apply' => !$job['my_application_status'] || $job['my_application_status'] === 'Withdrawn',
```

The UI swaps Apply for a status pill when `can_apply === false`
(`lib/applicationStatusLabel.ts` → "Not Selected For This Job").

2. `apply_job.php`'s guard actually works now. It used to `SELECT application_id`
   only, so the `'Withdrawn'` comparison was always false — meaning a duplicate
   apply could silently reset even a **hired** application back to `Pending`:

```php
// now selects status too, and only Withdrawn may re-apply
SELECT application_id, status FROM job_applications WHERE job_post_id = ? AND helper_id = ?
```

**Q: If Sean posts a *new* job, can Kurt apply?**

**Yes.** The lock is per `job_post_id`, not per employer. New post = new id Kurt
has never applied to.

**Q: Do job posts expire?**

**Yes, now.** `job_posts.expires_at` used to exist but nothing ever set it.
Parents can set an optional deadline; expired posts drop out of browse at query
time (no cron):

```sql
WHERE jp.status = 'Open' AND (jp.expires_at IS NULL OR jp.expires_at >= NOW())
```

---

## Work Mode access

**Q: Why could Sean open Work Mode with zero hired helpers?**

Two unrelated bugs, both fixed:

1. **Web skipped the check.** `app/(parent)/home/index.tsx`'s desktop branch
   rendered `ParentWorkHomeWeb` on `isWorkMode` alone, ignoring `hasActiveHire`
   (mobile checked it, web didn't). Web now shows the same locked screen.

2. **A stale `placements` row kept the count above zero.** `get_stats.php`
   counted raw `placements` rows with `status = 'Active'` — a column only flipped
   to `Terminated` by the `process_terminations.php` cron. If that cron hadn't
   run, an ended placement stayed `'Active'` forever. Now it cross-checks the
   live application status:

```sql
-- get_stats.php: unlock gate and dashboard must agree
JOIN job_applications ja ON ... AND ja.status IN ('hired','Accepted','termination_pending')
```

---

## Where the code lives

| Concern | File |
|---|---|
| Reject scope (one application only) | `backend/parent/update_application_status.php` |
| Sibling auto-close on hire | `backend/parent/hire_helper.php` |
| Browse visibility + `can_apply` | `backend/helper/browse_jobs.php` |
| Re-apply guard | `backend/helper/apply_job.php` |
| Status pill labels | `frontend/lib/applicationStatusLabel.ts` |
| Job expiry (set / display / filter) | `backend/parent/post_job.php`, `frontend/lib/jobExpiry.ts` |
| Placement finalized only on full contract sign | `backend/shared/finalize_hire_after_contract.inc.php` |
| Work Mode unlock count | `backend/parent/get_stats.php` |
| Web Work Mode gate | `frontend/app/(parent)/home/index.tsx` |

---

## Open product decision

Re-applying to a rejected job is **deliberately blocked**, and now clearly
communicated instead of hidden. If you later want to allow it, the pieces are:
relax the `apply_job.php` guard, and add a cooldown or attempt cap so it can't be
abused.
