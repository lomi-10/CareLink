// lib/boost.ts
// Shared read of job_posts.featured_until, so mobile and web can never
// disagree about whether a post is currently boosted.
//
// A boost is time-bounded: featured_until is set by the PayMongo webhook to
// NOW() + 7 days. Once it passes, the post silently returns to normal ranking —
// there is nothing to clean up.

/** MySQL DATETIME ("2026-08-09 23:59:59") -> ms, tolerating ISO too. */
function parseSqlDate(value: string): number {
  return new Date(String(value).replace(' ', 'T')).getTime();
}

export function isJobBoosted(job: { featured_until?: string | null } | null | undefined): boolean {
  const until = job?.featured_until;
  if (!until) return false;
  const t = parseSqlDate(until);
  return !isNaN(t) && t > Date.now();
}

/** "Boosted until Aug 9", or null when not boosted. */
export function boostLabel(job: { featured_until?: string | null } | null | undefined): string | null {
  if (!isJobBoosted(job)) return null;
  const t = parseSqlDate(job!.featured_until as string);
  return `Boosted until ${new Date(t).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`;
}
