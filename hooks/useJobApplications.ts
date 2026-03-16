// hooks/useJobApplications.ts
// UPDATED - Also checks if parent has posted any jobs

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../constants/api';

export interface JobApplication {
  application_id: string;
  job_post_id: string;
  helper_id: string;
  helper_name: string;
  helper_photo?: string;
  helper_age?: number;
  helper_gender?: string;
  helper_experience_years?: number;
  helper_rating_average?: number;
  helper_rating_count?: number;
  helper_categories?: string[];
  helper_municipality?: string;
  helper_province?: string;
  cover_letter?: string;
  status: 'Pending' | 'Reviewed' | 'Shortlisted' | 'Interview Scheduled' | 'Accepted' | 'Rejected' | 'Withdrawn';
  applied_at: string;
  reviewed_at?: string;
  parent_notes?: string;
}

export function useJobApplications(jobPostId: string) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPostedJobs, setHasPostedJobs] = useState(false);
  const [checkingJobs, setCheckingJobs] = useState(true);

  useEffect(() => {
    checkParentHasJobs();
  }, []);

  useEffect(() => {
    if (jobPostId) {
      console.log('[useJobApplications] Fetching applications for job:', jobPostId);
      fetchApplications();
    } else {
      console.log('[useJobApplications] No jobPostId provided - showing empty state');
      // Don't set error, just set loading to false
      // This allows the screen to show the "no jobs posted" message
      setLoading(false);
      setApplications([]);
    }
  }, [jobPostId]);

  // Check if parent has posted any jobs at all
  const checkParentHasJobs = async () => {
    try {
      setCheckingJobs(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        setHasPostedJobs(false);
        return;
      }

      const user = JSON.parse(userData);
      const response = await fetch(
        `${API_URL}/parent/get_posted_jobs.php?parent_id=${user.user_id}`
      );
      const data = await response.json();

      if (data.success) {
        const jobCount = data.jobs?.length || 0;
        console.log('[useJobApplications] Parent has posted jobs:', jobCount);
        setHasPostedJobs(jobCount > 0);
      }
    } catch (err) {
      console.error('[useJobApplications] Error checking posted jobs:', err);
      setHasPostedJobs(false);
    } finally {
      setCheckingJobs(false);
    }
  };

  const fetchApplications = async () => {
    try {
      console.log('[useJobApplications] Starting fetch...');
      setLoading(true);
      setError(null);

      const url = `${API_URL}/parent/get_job_applications.php?job_post_id=${jobPostId}`;
      console.log('[useJobApplications] Fetching from:', url);

      const response = await fetch(url);
      
      console.log('[useJobApplications] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      console.log('[useJobApplications] Raw response:', text.substring(0, 200));

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('[useJobApplications] JSON parse error:', parseError);
        console.error('[useJobApplications] Response text:', text);
        throw new Error('Invalid JSON response from server');
      }

      console.log('[useJobApplications] Parsed data:', {
        success: data.success,
        applicationsCount: data.applications?.length || 0,
      });

      if (data.success) {
        const apps = data.applications || [];
        console.log('[useJobApplications] Setting applications:', apps.length);
        setApplications(apps);
        setError(null);
      } else {
        console.error('[useJobApplications] API returned success=false:', data.message);
        throw new Error(data.message || 'Failed to load applications');
      }
    } catch (err: any) {
      console.error('[useJobApplications] Error caught:', err);
      console.error('[useJobApplications] Error details:', {
        message: err.message,
        stack: err.stack,
      });
      
      setError(err.message || 'Failed to load applications');
      setApplications([]);
    } finally {
      console.log('[useJobApplications] Fetch complete, setting loading=false');
      setLoading(false);
    }
  };

  const getApplicationsByStatus = (status: string) => {
    if (status === 'all') return applications;
    return applications.filter((app) => app.status === status);
  };

  const getStats = () => {
    const apps = applications || [];
    return {
      total: apps.length,
      pending: apps.filter((a) => a?.status === 'Pending').length,
      reviewed: apps.filter((a) => a?.status === 'Reviewed').length,
      shortlisted: apps.filter((a) => a?.status === 'Shortlisted').length,
      accepted: apps.filter((a) => a?.status === 'Accepted').length,
      rejected: apps.filter((a) => a?.status === 'Rejected').length,
    };
  };

  return {
    applications,
    loading,
    error,
    hasPostedJobs,
    checkingJobs,
    refresh: fetchApplications,
    getApplicationsByStatus,
    stats: getStats(),
  };
}