// app/(helper)/browse/browseHelpers.ts
// Data types, grouping logic, and format utilities for the browse-jobs screen.

import type { JobPost } from '@/hooks/helper';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParentBrowseRow = {
  parent_id: string;
  parent_name: string;
  parent_verified: boolean;
  parent_rating: number;
  parent_profile_image?: string | null;
  recommendationPct: number;
  matchReasons?: string[];
  jobs: JobPost[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const MATCH_REASON_THRESHOLD = 70;

// ─── Format utilities ─────────────────────────────────────────────────────────

export function fmtTag(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fmtPeriod(p: string): string {
  if (p === 'month') return '/ month';
  if (p === 'day')   return '/ day';
  if (p === 'week')  return '/ week';
  return p ? `/ ${p}` : '';
}

export function fmtPeriodShort(p: string): string {
  if (p === 'month') return 'mo';
  if (p === 'day')   return 'day';
  if (p === 'week')  return 'wk';
  return p;
}

/** Maps a job's first category to an Ionicons glyph name. */
export function getCategoryIcon(job: JobPost): string {
  const cat = ((job.categories?.[0] ?? job.category_name ?? '')).toLowerCase();
  if (cat.includes('garden'))                        return 'leaf-outline';
  if (cat.includes('child') || cat.includes('baby')) return 'happy-outline';
  if (cat.includes('cook') || cat.includes('food'))  return 'restaurant-outline';
  if (cat.includes('driver'))                        return 'car-outline';
  if (cat.includes('elder') || cat.includes('nurs')) return 'medkit-outline';
  return 'home-outline';
}

// ─── Data grouping ────────────────────────────────────────────────────────────

function mergeMatchReasons(jobs: JobPost[], pct: number): string[] | undefined {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const j of jobs) {
    if (Math.round(Number(j.match_score ?? 0)) !== pct) continue;
    for (const r of j.match_reasons ?? []) {
      const t = String(r).trim();
      if (t && !seen.has(t)) { seen.add(t); out.push(t); }
    }
  }
  return out.length ? out : undefined;
}

/**
 * Groups a flat job list by parent, computing the highest match score per parent
 * and merging match reasons from the top-matching jobs.
 */
export function groupJobsByParent(jobList: JobPost[]): ParentBrowseRow[] {
  const map = new Map<string, ParentBrowseRow>();

  for (const job of jobList) {
    const pid = String(job.parent_id);
    const ms  = Math.round(Number(job.match_score ?? 0));
    const cur = map.get(pid);

    if (!cur) {
      map.set(pid, {
        parent_id: pid,
        parent_name: job.parent_name ?? 'Employer',
        parent_verified: !!job.parent_verified,
        parent_rating: Number(job.parent_rating ?? 0),
        parent_profile_image: job.parent_profile_image ?? null,
        recommendationPct: ms,
        jobs: [job],
      });
    } else {
      cur.jobs.push(job);
      cur.recommendationPct = Math.max(cur.recommendationPct, ms);
      if (!cur.parent_profile_image && job.parent_profile_image)
        cur.parent_profile_image = job.parent_profile_image;
    }
  }

  const rows = Array.from(map.values());
  for (const row of rows) {
    if (row.recommendationPct >= MATCH_REASON_THRESHOLD)
      row.matchReasons = mergeMatchReasons(row.jobs, row.recommendationPct);
  }

  return rows.sort((a, b) =>
    b.recommendationPct !== a.recommendationPct
      ? b.recommendationPct - a.recommendationPct
      : a.parent_name.localeCompare(b.parent_name)
  );
}
