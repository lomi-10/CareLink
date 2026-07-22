// lib/jobTitle.ts — builds a concise, professional job-post title.
//
// WHY THIS EXISTS: titles used to be every selected role joined with commas, so
// picking all 7 roles under "Cook" produced a ~110-character headline that wrapped
// across three lines on every helper job card, application row and contract. Real
// job boards use ONE short title ("Cook") and list the specifics in the body — the
// category is precisely the professional umbrella term for its roles, so that's
// what a multi-role post is titled. The individual roles are never lost; they're
// rendered as chips in the job details.
//
// MIRRORS backend/shared/job_title.php — keep the two in sync. The server rebuilds
// the title from category_id + job_ids so it never has to trust the client.

const FALLBACK_TITLE = 'Household Helper';

/**
 * @param categoryName e.g. "Cook" (ref_categories.category_name)
 * @param roleNames    the selected role titles, e.g. ["Family Cook", "Baker / Pastry Cook"]
 * @param customTitle  optional parent-written title — always wins when non-empty
 */
export function buildJobTitle(
  categoryName?: string | null,
  roleNames?: (string | null | undefined)[] | null,
  customTitle?: string | null,
): string {
  const custom = (customTitle ?? '').trim();
  if (custom) return custom;

  const roles = (roleNames ?? []).map((r) => (r ?? '').trim()).filter(Boolean);
  const category = (categoryName ?? '').trim();

  // 1 role is already specific and readable — use it as-is.
  if (roles.length === 1) return roles[0];

  // 2 roles still read naturally joined.
  if (roles.length === 2) return `${roles[0]} & ${roles[1]}`;

  // 3+ roles: the category is the umbrella term for all of them.
  if (roles.length >= 3) return category || roles[0];

  // No roles picked — fall back to the category, else a generic label.
  return category || FALLBACK_TITLE;
}
