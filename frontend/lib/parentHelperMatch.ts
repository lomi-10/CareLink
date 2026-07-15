import type { JobPost } from '@/hooks/parent/useParentJobs';
import type { JobApplication } from '@/hooks/parent/useJobApplications';
import { WORKING_DAYS_PER_MONTH } from '@/lib/salary';

export type HelperJobMatch = {
  score: number;
  reasons: string[];
};

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
    distance: null,
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
  const reasons: string[] = [];
  let pts = 0;

  // 1. Category match (25 pts) — binary
  const jobCat = job.category_id != null ? String(job.category_id) : '';
  const helperCatIds = (helper.category_ids ?? []).map(String);
  const jobCategoryName = (job.category_name || job.custom_category || '').trim().toLowerCase();
  const categoryMatched =
    (!!jobCat && helperCatIds.includes(jobCat)) ||
    (!!jobCategoryName && (helper.categories ?? []).some((c) => c.toLowerCase() === jobCategoryName));
  if (categoryMatched) {
    pts += 25;
    const label = job.category_name || job.custom_category || 'this role';
    reasons.push(`Specializes in ${label} — exactly what you're hiring for`);
  }

  // 2. Skills match (15 pts) — proportional to required skills the helper has
  const jobSkills = splitNames(job.skill_names);
  const helperSkills = (helper.skills ?? []).map((s) => s.toLowerCase());
  if (jobSkills.length > 0) {
    const matching = jobSkills.filter((s) => helperSkills.includes(s)).length;
    const skillPts = Math.round((matching / jobSkills.length) * 15);
    if (skillPts > 0) {
      pts += skillPts;
      reasons.push(`${matching}/${jobSkills.length} required skills match`);
    }
  } else {
    pts += 8; // no specific skills required — partial credit
  }

  // 3. Job role overlap (15 pts) — proportional to required roles the helper has
  const jobRoles = splitNames(job.role_names);
  const helperRoles = (helper.jobs ?? []).map((s) => s.toLowerCase());
  if (jobRoles.length > 0) {
    const matching = jobRoles.filter((r) => helperRoles.includes(r)).length;
    const rolePts = Math.round((matching / jobRoles.length) * 15);
    if (rolePts > 0) {
      pts += rolePts;
      reasons.push('Job roles align with yours');
    }
  } else if (categoryMatched) {
    pts += 8; // no specific roles required — partial credit if category matched
  }

  // 4. Salary fit (15 pts)
  // A job's salary is ALWAYS monthly — post_job.php enforces the ₱7,000/month floor
  // whatever the period, and salary_period is only the payout schedule (see lib/salary.ts).
  // This used to multiply a Daily-scheduled job by 26, turning a ₱8,000/month post into
  // a ₱208,000/month one and handing every helper a free salary-fit point.
  const jobMonthly = Number(job.salary_offered);
  if (helper.expected_salary != null) {
    // Helper profiles are the one place a Daily figure can still mean a daily RATE
    // (helper_profiles.salary_period is enum('Daily','Monthly')), so keep converting.
    const helperMonthly = helper.salary_period === 'Daily'
      ? helper.expected_salary * WORKING_DAYS_PER_MONTH
      : helper.expected_salary;
    if (helperMonthly <= jobMonthly) {
      pts += 15;
      reasons.push('Salary expectation fits this job');
    } else if (helperMonthly <= jobMonthly * 1.15) {
      pts += 8;
    }
  }

  // 5. Experience (10 pts)
  const minExp = Number(job.min_experience_years ?? 0);
  const exp = helper.experience_years ?? 0;
  if (exp >= minExp) {
    pts += 10;
    if (minExp > 0) reasons.push(`Meets your ${minExp}+ years experience ask`);
  } else if (exp >= minExp - 1) {
    pts += 5;
    reasons.push(`Close to your experience preference (${exp} yrs)`);
  }

  // 6. Location (10 pts) — distance from the requesting parent, when known
  if (helper.distance != null) {
    if (helper.distance <= 5) {
      pts += 10;
      reasons.push('Very close — easier schedule coordination');
    } else if (helper.distance <= 20) {
      pts += 7;
      reasons.push('Reasonable distance for regular work');
    } else if (helper.distance <= 50) {
      pts += 3;
    }
  }

  // 7. Helper's own rating (10 pts) — proportional, small neutral credit with no reviews yet
  const rating = helper.rating_average ?? 0;
  const count = helper.rating_count ?? 0;
  if (count > 0) {
    pts += Math.round((rating / 5) * 10);
    if (rating >= 4.5) reasons.push(`Highly rated (${rating.toFixed(1)}★)`);
  } else {
    pts += 5;
  }

  if (helper.availability_status === 'Available') {
    reasons.push('Marked available');
  }

  const score = Math.min(100, Math.round(pts));
  return {
    score,
    reasons: reasons.length ? reasons.slice(0, 5) : ['Compare experience, distance, and ratings to decide'],
  };
}

/**
 * Algorithm 3 — "Top Helpers" feed (parent has no active job post yet).
 * No job to compare against, so this surfaces the most capable and trustworthy
 * helpers overall: verification, rating, experience, skill breadth, and a
 * preference for General Househelp (all-around) helpers. Max 100
 * (30 + 25 + 20 + 15 + 10).
 */
export function computeTopHelperScore(helper: MatchableHelper): HelperJobMatch {
  const reasons: string[] = [];
  let pts = 0;

  // 1. PESO verification (30 pts) — trust matters most when there's no job to filter by
  if (helper.verification_status === 'Verified') {
    pts += 30;
    reasons.push('PESO-verified profile');
  }

  // 2. Rating (25 pts) — proportional, small neutral credit with no reviews yet
  const rating = helper.rating_average ?? 0;
  const count = helper.rating_count ?? 0;
  if (count > 0) {
    pts += Math.round((rating / 5) * 25);
    if (rating >= 4.5) reasons.push(`Highly rated (${rating.toFixed(1)}★)`);
  } else {
    pts += 8;
  }

  // 3. Experience (20 pts) — tiered
  const exp = helper.experience_years ?? 0;
  if (exp >= 5) {
    pts += 20;
    reasons.push(`${exp} years of experience`);
  } else if (exp >= 3) {
    pts += 15;
  } else if (exp >= 1) {
    pts += 10;
  } else {
    pts += 5;
  }

  // 4. Skill count (15 pts) — proportional, capped (10+ listed skills = full credit)
  const skillCount = helper.skills?.length ?? 0;
  pts += Math.min(15, Math.round((skillCount / 10) * 15));
  if (skillCount >= 5) reasons.push(`${skillCount} listed skills`);

  // 5. General Househelp bonus (10 pts) — most useful to a parent who doesn't
  // know exactly what they need yet; small credit for any other specialty.
  const categories = helper.categories ?? [];
  if (categories.includes('General Househelp')) {
    pts += 10;
    reasons.push('All-around helper — flexible for whatever you need');
  } else if (categories.length > 0) {
    pts += 5;
  }

  const score = Math.min(100, Math.round(pts));
  return {
    score,
    reasons: reasons.length ? reasons.slice(0, 5) : ['PESO-verified and ready to help'],
  };
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
