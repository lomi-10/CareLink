import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
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
};

function isHiredStatus(s: string) {
  return s === 'hired' || s === 'Accepted' || s === 'termination_pending';
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
      };
    });
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

      const apps: JobApplication[] = appsData.success ? appsData.applications || [] : [];
      const jobs: JobPost[] = jobsData.success ? jobsData.jobs || [] : [];

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
