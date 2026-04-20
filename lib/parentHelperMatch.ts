import type { HelperProfile } from '@/hooks/parent';
import type { JobPost } from '@/hooks/parent/useParentJobs';

export type HelperJobMatch = {
  score: number;
  reasons: string[];
};

/** Heuristic match score (0–100) + human-readable reasons for browse / profile UI. */
export function computeHelperJobMatch(
  helper: HelperProfile,
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
  if (jobCat && helper.category_ids?.includes(jobCat)) {
    pts += 28;
    const label = job.category_name || job.custom_category || 'this role';
    reasons.push(`Category fits your posting (${label})`);
  } else if (helper.categories?.length) {
    const title = (job.title || job.custom_job_title || '').toLowerCase();
    const overlap = helper.categories.some((c) => title && title.includes(c.toLowerCase().slice(0, 6)));
    if (overlap) {
      pts += 12;
      reasons.push('Skills align with your job title');
    }
  }

  const minExp = Number(job.min_experience_years ?? 0);
  const exp = helper.experience_years ?? 0;
  if (minExp > 0) {
    if (exp >= minExp) {
      pts += 18;
      reasons.push(`Meets your ${minExp}+ years experience ask`);
    } else if (exp >= minExp - 1) {
      pts += 8;
      reasons.push(`Close to your experience preference (${exp} yrs)`);
    }
  } else if (exp >= 3) {
    pts += 10;
    reasons.push('Solid work history');
  }

  if (helper.distance != null) {
    if (helper.distance < 3) {
      pts += 16;
      reasons.push('Very close — easier schedule coordination');
    } else if (helper.distance < 8) {
      pts += 10;
      reasons.push('Reasonable distance for regular work');
    }
  }

  const rating = helper.rating_average ?? 0;
  const count = helper.rating_count ?? 0;
  if (count > 0 && rating >= 4.2) {
    pts += 12;
    reasons.push(`Strong family ratings (${rating.toFixed(1)}★)`);
  } else if (count > 0 && rating >= 3.5) {
    pts += 6;
    reasons.push('Positive feedback from employers');
  }

  if (helper.verification_status === 'Verified') {
    pts += 10;
    reasons.push('PESO-verified profile');
  }

  if (helper.availability_status === 'Available') {
    pts += 6;
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
