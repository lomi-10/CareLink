import type { JobPost } from '@/hooks/parent/useParentJobs';
import type { JobApplication } from '@/hooks/parent/useJobApplications';

export type HelperJobMatch = {
  score: number;
  reasons: string[];
};

/** Minimal shape needed by computeHelperJobMatch — satisfied by HelperProfile, RecommendedHelper, and applicationToMatchable(). */
export type MatchableHelper = {
  category_ids?: (string | number)[];
  categories?: string[];
  experience_years?: number | null;
  distance?: number | null;
  rating_average?: number | null;
  rating_count?: number | null;
  verification_status?: string;
  availability_status?: string;
};

/** Adapts a JobApplication's helper_* fields into the shape computeHelperJobMatch expects. */
export function applicationToMatchable(app: JobApplication): MatchableHelper {
  return {
    categories: app.helper_categories ?? [],
    experience_years: app.helper_experience_years ?? 0,
    distance: null,
    rating_average: app.helper_rating_average ?? 0,
    rating_count: app.helper_rating_count ?? 0,
    verification_status: app.verification_status,
    availability_status: app.availability_status,
  };
}

/**
 * Heuristic match score (0–100) + human-readable reasons for browse / profile UI.
 *
 * Scored only on factors that are available everywhere a helper can be compared
 * (category/role fit, experience, rating, PESO verification) so the same helper +
 * job pair gets the same % on the Dashboard, Browse Helpers, and Work Management
 * screens. Category/role fit is weighted heaviest since it's the strongest signal
 * of suitability. Distance and availability aren't known for every screen (e.g. a
 * job application has no distance data), so they're surfaced as extra "additional
 * info" reasons without affecting the score.
 */
export function computeHelperJobMatch(
  helper: MatchableHelper,
  job: JobPost | null | undefined
): HelperJobMatch {
  const reasons: string[] = [];
  let pts = 0;

  if (!job) {
    return {
      score: 0,
      reasons: ['Select an open job to see personalized match insights.'],
    };
  }

  const jobCat = job.category_id != null ? String(job.category_id) : '';
  const helperCatIds = (helper.category_ids ?? []).map(String);
  const jobCategoryName = (job.category_name || job.custom_category || '').trim().toLowerCase();
  const categoryMatched =
    (!!jobCat && helperCatIds.includes(jobCat)) ||
    (!!jobCategoryName && (helper.categories ?? []).some((c) => c.toLowerCase() === jobCategoryName));

  if (categoryMatched) {
    pts += 42;
    const label = job.category_name || job.custom_category || 'this role';
    reasons.push(`Specializes in ${label} — exactly what you're hiring for`);
  } else if (helper.categories?.length) {
    const title = (job.title || job.custom_job_title || '').toLowerCase();
    const overlap = helper.categories.some((c) => title && title.includes(c.toLowerCase().slice(0, 6)));
    if (overlap) {
      pts += 22;
      reasons.push('Skills align with your job title');
    }
  }

  const minExp = Number(job.min_experience_years ?? 0);
  const exp = helper.experience_years ?? 0;
  if (minExp > 0) {
    if (exp >= minExp) {
      pts += 26;
      reasons.push(`Meets your ${minExp}+ years experience ask`);
    } else if (exp >= minExp - 1) {
      pts += 12;
      reasons.push(`Close to your experience preference (${exp} yrs)`);
    }
  } else if (exp >= 3) {
    pts += 16;
    reasons.push(`${exp} years of relevant experience`);
  }

  const rating = helper.rating_average ?? 0;
  const count = helper.rating_count ?? 0;
  if (count > 0 && rating >= 4.2) {
    pts += 20;
    reasons.push(`Strong family ratings (${rating.toFixed(1)}★)`);
  } else if (count > 0 && rating >= 3.5) {
    pts += 10;
    reasons.push('Positive feedback from employers');
  }

  if (helper.verification_status === 'Verified') {
    pts += 12;
    reasons.push('PESO-verified profile');
  }

  // Additional info — useful context for the parent, doesn't affect the score
  // since it isn't available on every screen (e.g. job applications).
  if (helper.distance != null) {
    if (helper.distance < 3) {
      reasons.push('Very close — easier schedule coordination');
    } else if (helper.distance < 8) {
      reasons.push('Reasonable distance for regular work');
    }
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

export function pickPrimaryOpenJob(jobs: JobPost[]): JobPost | null {
  const open = jobs.filter((j) => j.status === 'Open');
  if (!open.length) return null;
  return open.sort((a, b) => {
    const ac = Number(a.application_count ?? 0);
    const bc = Number(b.application_count ?? 0);
    return bc - ac;
  })[0];
}
