import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { ymdLocal } from '@/lib/helperWorkApi';
import {
  fetchTerminationDetails,
  isTerminationPendingStatus,
  noticePeriodStillActive,
} from '@/lib/terminationApi';
import type { JobApplication } from '@/hooks/parent/useJobApplications';
import type { JobPost } from '@/hooks/parent/useParentJobs';

export type ActivePlacement = {
  application_id: string;
  job_post_id: string;
  helper_id: string;
  helper_name: string;
  helper_photo?: string;
  job_title: string;
  status: string;
  job_start_date?: string | null;
  salary_offered?: number;
  salary_period?: string;
  termination_last_day?: string | null;
};

function isHiredStatus(s: string) {
  return s === 'hired' || s === 'Accepted' || isTerminationPendingStatus(s);
}

type AppWithTerm = JobApplication & { termination_last_day?: string | null };

async function enrichTerminationLastDays(
  apps: JobApplication[],
  parentId: number,
): Promise<JobApplication[]> {
  const copies = apps.map((a) => ({ ...a } as AppWithTerm));
  await Promise.all(
    copies.map(async (a) => {
      if (!isTerminationPendingStatus(String(a.status))) return;
      const existing = a.termination_last_day?.trim();
      if (existing) return;
      const id = Number(a.application_id);
      if (!id || !parentId) return;
      try {
        const res = await fetchTerminationDetails(id, parentId, 'parent');
        if (res.success && res.termination_last_day?.trim()) {
          a.termination_last_day = res.termination_last_day;
        }
      } catch {
        /* fail-open */
      }
    }),
  );
  return copies;
}

function keepPlacementRow(p: ActivePlacement): boolean {
  if (!isTerminationPendingStatus(String(p.status))) return true;
  return noticePeriodStillActive(true, p.termination_last_day, ymdLocal());
}

function buildPlacements(apps: JobApplication[], jobs: JobPost[]): ActivePlacement[] {
  const jobById = new Map(jobs.map((j) => [String(j.job_post_id), j]));
  return apps
    .filter((a) => isHiredStatus(String(a.status)))
    .map((a) => {
      const job = jobById.get(String(a.job_post_id));
      const title =
        (a as JobApplication & { job_title?: string }).job_title ||
        job?.title ||
        job?.custom_job_title ||
        'Active role';
      const salaryOffered = (a as JobApplication & { salary_offered?: number }).salary_offered;
      const salaryPeriod = (a as JobApplication & { salary_period?: string }).salary_period;
      const ax = a as AppWithTerm;
      const terminationLast =
        ax.termination_last_day != null && String(ax.termination_last_day).trim() !== ''
          ? String(ax.termination_last_day).trim()
          : null;
      return {
        application_id: a.application_id,
        job_post_id: a.job_post_id,
        helper_id: a.helper_id,
        helper_name: a.helper_name,
        helper_photo: a.helper_photo,
        job_title: title,
        status: a.status,
        job_start_date: a.job_start_date ?? null,
        salary_offered: salaryOffered ?? job?.salary_offered,
        salary_period: salaryPeriod ?? job?.salary_period,
        termination_last_day: terminationLast,
      };
    })
    .filter(keepPlacementRow);
}

export function useParentActivePlacements() {
  const [placements, setPlacements] = useState<ActivePlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) {
        setPlacements([]);
        return;
      }
      const user = JSON.parse(raw) as { user_id: number };
      const parentId = user.user_id;

      const [appsRes, jobsRes] = await Promise.all([
        fetch(`${API_URL}/parent/get_job_applications.php?parent_id=${parentId}`),
        fetch(`${API_URL}/parent/get_posted_jobs.php?parent_id=${parentId}`),
      ]);

      const appsData = await appsRes.json();
      const jobsData = await jobsRes.json();

      let apps: JobApplication[] = appsData.success ? appsData.applications || [] : [];
      const jobs: JobPost[] = jobsData.success ? jobsData.jobs || [] : [];

      apps = apps.map((row) => {
        const r = row as AppWithTerm & Record<string, unknown>;
        const term =
          r.termination_last_day != null
            ? String(r.termination_last_day).trim() || null
            : null;
        return { ...row, termination_last_day: term } as JobApplication;
      });

      apps = await enrichTerminationLastDays(apps, parentId);

      setPlacements(buildPlacements(apps, jobs));
    } catch (e: unknown) {
      console.error('[useParentActivePlacements]', e);
      setError(e instanceof Error ? e.message : 'Failed to load');
      setPlacements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { placements, loading, error, refresh: load };
}
