import type { JobPost } from '@/hooks/parent/useParentJobs';
import type { JobApplication } from '@/hooks/parent/useJobApplications';
import { WORKING_DAYS_PER_MONTH } from '@/lib/salary';

/**
 * One scored signal behind a match percentage. The UI turns these into a clear
 * "why this %" breakdown instead of a bare number.
 */
export type MatchFactor = {
  key: string;
  /** Short column label, e.g. "Skills", "Distance". */
  label: string;
  /** Points this helper earned on this signal. */
  earned: number;
  /** Points available on this signal. */
  max: number;
  /** True when it's a genuine positive (drives the "reasons" list + green ticks). */
  hit: boolean;
  /** Plain-English one-liner shown to the parent. */
  detail: string;
};

export type HelperJobMatch = {
  score: number;
  /** Human reasons, best-contributing first. Derived from `factors`. */
  reasons: string[];
  /** Full per-signal breakdown, highest contribution first. */
  factors: MatchFactor[];
};

/** Builds reasons + a sorted factor list from raw factors, keeping score untouched. */
function finalizeMatch(score: number, factors: MatchFactor[], fallback: string): HelperJobMatch {
  const sorted = [...factors].sort((a, b) => b.earned - a.earned);
  const reasons = sorted.filter((f) => f.hit && f.earned > 0).map((f) => f.detail).slice(0, 5);
  return {
    score: Math.min(100, Math.round(score)),
    reasons: reasons.length ? reasons : [fallback],
    factors: sorted,
  };
}

/** Minimal shape needed by computeHelperJobMatch / computeTopHelperScore —
 * satisfied by HelperProfile, RecommendedHelper, and applicationToMatchable(). */
export type MatchableHelper = {
  category_ids?: (string | number)[];
  categories?: string[];
  jobs?: string[];
  skills?: string[];
  experience_years?: number | null;
  distance?: number | null;
  expected_salary?: number | null;
  salary_period?: string;
  rating_average?: number | null;
  rating_count?: number | null;
  verification_status?: string;
  availability_status?: string;
};

/** Adapts a JobApplication's helper_* fields into the shape the scoring functions expect. */
export function applicationToMatchable(app: JobApplication): MatchableHelper {
  return {
    categories: app.helper_categories ?? [],
    jobs: app.helper_jobs ?? [],
    skills: app.helper_skills ?? [],
    experience_years: app.helper_experience_years ?? 0,
    // Same parent↔helper distance Browse uses, so the % is identical for a given
    // helper on both screens (a null here silently dropped the ~10 location points).
    distance: app.helper_distance ?? null,
    expected_salary: app.helper_expected_salary ?? null,
    salary_period: app.helper_salary_period,
    rating_average: app.helper_rating_average ?? 0,
    rating_count: app.helper_rating_count ?? 0,
    verification_status: app.verification_status,
    availability_status: app.availability_status,
  };
}

function splitNames(csv: string | undefined | null): string[] {
  return (csv ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Algorithm 2 — "Best Match for Your Job" (parent has an active, PESO-verified job post).
 * Scores a helper against one specific job: category, skills, job role, salary fit,
 * experience, location, and the helper's own rating. Max 100
 * (25 + 15 + 15 + 15 + 10 + 10 + 10).
 */
function computeJobSpecificMatch(helper: MatchableHelper, job: JobPost): HelperJobMatch {
  const factors: MatchFactor[] = [];
  let pts = 0;

  // 1. Category match (25 pts) — binary
  const jobCat = job.category_id != null ? String(job.category_id) : '';
  const helperCatIds = (helper.category_ids ?? []).map(String);
  const jobCategoryName = (job.category_name || job.custom_category || '').trim().toLowerCase();
  const catLabel = job.category_name || job.custom_category || 'this role';
  const categoryMatched =
    (!!jobCat && helperCatIds.includes(jobCat)) ||
    (!!jobCategoryName && (helper.categories ?? []).some((c) => c.toLowerCase() === jobCategoryName));
  pts += categoryMatched ? 25 : 0;
  factors.push({
    key: 'category', label: 'Category', earned: categoryMatched ? 25 : 0, max: 25, hit: categoryMatched,
    detail: categoryMatched
      ? `Specializes in ${catLabel} — exactly what you're hiring for`
      : `Works in a different category than ${catLabel}`,
  });

  // 2. Skills match (15 pts) — proportional to required skills the helper has
  const jobSkills = splitNames(job.skill_names);
  const helperSkills = (helper.skills ?? []).map((s) => s.toLowerCase());
  let skillPts = 0; let skillDetail: string; let skillHit = false;
  if (jobSkills.length > 0) {
    const matching = jobSkills.filter((s) => helperSkills.includes(s)).length;
    skillPts = Math.round((matching / jobSkills.length) * 15);
    skillHit = matching > 0;
    skillDetail = matching > 0
      ? `Has ${matching} of your ${jobSkills.length} required skill${jobSkills.length > 1 ? 's' : ''}`
      : `None of your ${jobSkills.length} required skills listed yet`;
  } else {
    skillPts = 8; // no specific skills required — partial credit
    skillDetail = 'No specific skills required for this job';
  }
  pts += skillPts;
  factors.push({ key: 'skills', label: 'Skills', earned: skillPts, max: 15, hit: skillHit, detail: skillDetail });

  // 3. Job role overlap (15 pts) — proportional to required roles the helper has
  const jobRoles = splitNames(job.role_names);
  const helperRoles = (helper.jobs ?? []).map((s) => s.toLowerCase());
  let rolePts = 0; let roleDetail: string; let roleHit = false;
  if (jobRoles.length > 0) {
    const matching = jobRoles.filter((r) => helperRoles.includes(r)).length;
    // Score against up to 3 "core" roles so a broad, over-listed post doesn't
    // gut a helper who does its main roles (category already covers the specialty).
    if (matching > 0) {
      const need = Math.min(jobRoles.length, 3);
      rolePts = Math.round(Math.min(1, matching / need) * 15);
      roleHit = true;
      roleDetail = 'Has done the job roles you need';
    } else {
      roleDetail = 'Different job roles from what you need';
    }
  } else if (categoryMatched) {
    rolePts = 8; // no specific roles required — partial credit if category matched
    roleDetail = 'No specific roles required beyond the category';
  } else {
    roleDetail = 'No specific roles required';
  }
  pts += rolePts;
  factors.push({ key: 'roles', label: 'Roles', earned: rolePts, max: 15, hit: roleHit, detail: roleDetail });

  // 4. Salary fit (15 pts)
  // A job's salary is ALWAYS monthly — post_job.php enforces the ₱7,000/month floor
  // whatever the period, and salary_period is only the payout schedule (see lib/salary.ts).
  const jobMonthly = Number(job.salary_offered);
  let salaryPts = 0; let salaryDetail = 'Helper has not set a salary expectation'; let salaryHit = false;
  if (helper.expected_salary != null) {
    // Helper profiles are the one place a Daily figure can still mean a daily RATE
    // (helper_profiles.salary_period is enum('Daily','Monthly')), so keep converting.
    const helperMonthly = helper.salary_period === 'Daily'
      ? helper.expected_salary * WORKING_DAYS_PER_MONTH
      : helper.expected_salary;
    if (helperMonthly <= jobMonthly) {
      salaryPts = 15; salaryHit = true;
      salaryDetail = 'Salary expectation fits your budget';
    } else if (helperMonthly <= jobMonthly * 1.15) {
      salaryPts = 8;
      salaryDetail = 'Salary expectation is slightly above your budget';
    } else {
      salaryDetail = 'Salary expectation is above your budget';
    }
  }
  pts += salaryPts;
  factors.push({ key: 'salary', label: 'Salary', earned: salaryPts, max: 15, hit: salaryHit, detail: salaryDetail });

  // 5. Experience (10 pts)
  const minExp = Number(job.min_experience_years ?? 0);
  const exp = helper.experience_years ?? 0;
  let expPts = 0; let expDetail: string; let expHit = false;
  if (exp >= minExp) {
    expPts = 10; expHit = minExp > 0 || exp > 0;
    expDetail = minExp > 0
      ? `Meets your ${minExp}+ year experience requirement (${exp} yrs)`
      : `${exp} year${exp === 1 ? '' : 's'} of experience`;
  } else if (exp >= minExp - 1) {
    expPts = 5;
    expDetail = `Just under your experience ask (${exp} of ${minExp} yrs)`;
  } else {
    expDetail = `Below your ${minExp}-year experience ask (${exp} yrs)`;
  }
  pts += expPts;
  factors.push({ key: 'experience', label: 'Experience', earned: expPts, max: 10, hit: expHit, detail: expDetail });

  // 6. Location (10 pts) — distance from the requesting parent, when known
  let locPts = 0; let locDetail = 'Distance not available'; let locHit = false;
  if (helper.distance != null) {
    const km = helper.distance;
    if (km <= 5) { locPts = 10; locHit = true; locDetail = `Very close — about ${km.toFixed(1)} km away`; }
    else if (km <= 20) { locPts = 7; locHit = true; locDetail = `Reasonable distance — about ${km.toFixed(0)} km away`; }
    else if (km <= 50) { locPts = 3; locDetail = `A bit far — about ${km.toFixed(0)} km away`; }
    else { locDetail = `Far — about ${km.toFixed(0)} km away`; }
  }
  pts += locPts;
  factors.push({ key: 'location', label: 'Distance', earned: locPts, max: 10, hit: locHit, detail: locDetail });

  // 7. Helper's own rating (10 pts) — proportional, small neutral credit with no reviews yet
  const rating = helper.rating_average ?? 0;
  const count = helper.rating_count ?? 0;
  let ratePts = 0; let rateDetail: string; let rateHit = false;
  if (count > 0) {
    ratePts = Math.round((rating / 5) * 10);
    rateHit = rating >= 4;
    rateDetail = `Rated ${rating.toFixed(1)}★ by ${count} employer${count === 1 ? '' : 's'}`;
  } else {
    ratePts = 7; // no reviews yet — neutral benefit of the doubt, not a penalty
    rateDetail = 'No reviews yet — new helper';
  }
  pts += ratePts;
  factors.push({ key: 'rating', label: 'Rating', earned: ratePts, max: 10, hit: rateHit, detail: rateDetail });

  return finalizeMatch(pts, factors, 'Compare experience, distance, and ratings to decide');
}

/**
 * Algorithm 3 — "Top Helpers" feed (parent has no active job post yet).
 * No job to compare against, so this surfaces the most capable and trustworthy
 * helpers overall: verification, rating, experience, skill breadth, and a
 * preference for General Househelp (all-around) helpers. Max 100
 * (30 + 25 + 20 + 15 + 10).
 */
export function computeTopHelperScore(helper: MatchableHelper): HelperJobMatch {
  const factors: MatchFactor[] = [];
  let pts = 0;

  // 1. PESO verification (30 pts) — trust matters most when there's no job to filter by
  const verified = helper.verification_status === 'Verified';
  pts += verified ? 30 : 0;
  factors.push({
    key: 'verification', label: 'Verified', earned: verified ? 30 : 0, max: 30, hit: verified,
    detail: verified ? 'PESO-verified profile you can trust' : 'Not yet PESO-verified',
  });

  // 2. Rating (25 pts) — proportional, small neutral credit with no reviews yet
  const rating = helper.rating_average ?? 0;
  const count = helper.rating_count ?? 0;
  let ratePts = 0; let rateDetail: string; let rateHit = false;
  if (count > 0) {
    ratePts = Math.round((rating / 5) * 25);
    rateHit = rating >= 4;
    rateDetail = `Rated ${rating.toFixed(1)}★ by ${count} employer${count === 1 ? '' : 's'}`;
  } else {
    ratePts = 8;
    rateDetail = 'No reviews yet — new helper';
  }
  pts += ratePts;
  factors.push({ key: 'rating', label: 'Rating', earned: ratePts, max: 25, hit: rateHit, detail: rateDetail });

  // 3. Experience (20 pts) — tiered
  const exp = helper.experience_years ?? 0;
  let expPts = 5;
  if (exp >= 5) expPts = 20;
  else if (exp >= 3) expPts = 15;
  else if (exp >= 1) expPts = 10;
  pts += expPts;
  factors.push({
    key: 'experience', label: 'Experience', earned: expPts, max: 20, hit: exp >= 3,
    detail: exp > 0 ? `${exp} year${exp === 1 ? '' : 's'} of experience` : 'New to household work',
  });

  // 4. Skill breadth (15 pts) — proportional, capped (10+ listed skills = full credit)
  const skillCount = helper.skills?.length ?? 0;
  const skillPts = Math.min(15, Math.round((skillCount / 10) * 15));
  pts += skillPts;
  factors.push({
    key: 'skills', label: 'Skills', earned: skillPts, max: 15, hit: skillCount >= 5,
    detail: skillCount > 0 ? `${skillCount} skill${skillCount === 1 ? '' : 's'} listed` : 'No skills listed yet',
  });

  // 5. All-around bonus (10 pts) — most useful to a parent who doesn't know exactly
  // what they need yet; small credit for any other specialty.
  const categories = helper.categories ?? [];
  const allAround = categories.includes('General Househelp');
  const anySpecialty = categories.length > 0;
  const catPts = allAround ? 10 : anySpecialty ? 5 : 0;
  pts += catPts;
  factors.push({
    key: 'versatility', label: 'Versatility', earned: catPts, max: 10, hit: allAround,
    detail: allAround
      ? 'All-around helper — flexible for whatever you need'
      : anySpecialty ? `Specializes in ${categories[0]}` : 'No specialty listed yet',
  });

  return finalizeMatch(pts, factors, 'PESO-verified and ready to help');
}

/**
 * Single entry point used by Dashboard, Browse Helpers, and Work Management so the
 * same helper gets the same percentage everywhere. Switches algorithm based on
 * whether there's an active job post to match against — see computeJobSpecificMatch
 * (Algorithm 2, "Best Match for Your Job") and computeTopHelperScore (Algorithm 3,
 * "Top Helpers" feed) above.
 */
export function computeHelperJobMatch(
  helper: MatchableHelper,
  job: JobPost | null | undefined
): HelperJobMatch {
  if (!job) {
    return computeTopHelperScore(helper);
  }
  return computeJobSpecificMatch(helper, job);
}

export function pickPrimaryOpenJob(jobs: JobPost[]): JobPost | null {
  const open = jobs.filter((j) => j.status === 'Open');
  if (!open.length) return null;
  return open.sort((a, b) => {
    const ac = Number(a.application_count ?? 0);
    const bc = Number(b.application_count ?? 0);
    return bc - ac;
  })[0];
}

/** Open posts, most-applied-to first — the jobs a parent is actively hiring for. */
export function activeJobPosts(jobs: JobPost[]): JobPost[] {
  return jobs
    .filter((j) => j.status === 'Open')
    .sort((a, b) => Number(b.application_count ?? 0) - Number(a.application_count ?? 0));
}

/**
 * Of the parent's open jobs, the one this helper matches BEST. Used so a helper's
 * detail/reasoning reflects their strongest relevant post instead of always the
 * first one (a helper can match one post at 87% and another at 42%).
 */
export function bestJobForHelper(helper: MatchableHelper, jobs: JobPost[]): JobPost | null {
  const open = activeJobPosts(jobs);
  if (!open.length) return null;
  return open.reduce((best, j) =>
    computeHelperJobMatch(helper, j).score > computeHelperJobMatch(helper, best).score ? j : best,
  open[0]);
}

export type ScoredHelper<H> = { helper: H; match: HelperJobMatch };

/**
 * Top `limit` helpers for one specific job, scored against THAT job and sorted by
 * fit. This is what powers "best matches per active post" — call it once per open
 * job instead of collapsing everything onto a single primary job.
 */
export function bestHelpersForJob<H extends MatchableHelper>(
  helpers: H[],
  job: JobPost | null,
  limit = 4,
): ScoredHelper<H>[] {
  return helpers
    .map((helper) => ({ helper, match: computeHelperJobMatch(helper, job) }))
    .filter((x) => x.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}
