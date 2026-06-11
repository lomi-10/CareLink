// hooks/useSavedJobs.ts
// PHP: helper/saved_jobs.php, helper/unsave_job.php

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';
import { JobPost } from './useBrowseJobs';

export function useSavedJobs() {
  const [savedJobs, setSavedJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('recent'); // 'recent', 'match', 'nearest', 'salary'

  const fetchSavedJobs = useCallback(async (sort: string = sortBy) => {
    try {
      setLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('Not logged in');
      const user = JSON.parse(userData);

      const response = await fetch(`${API_URL}/helper/saved_jobs.php?helper_id=${user.user_id}&sort=${sort}`);
      const data = await response.json();

      if (!data.success) throw new Error(data.message || 'Failed to load saved jobs');
      setSavedJobs(data.saved_jobs ?? []);
    } catch (err: any) {
      console.error('Error fetching saved jobs:', err);
      setError(err.message);
      setSavedJobs([]);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  const removeSavedJob = async (jobId: string) => {
    const previous = savedJobs;
    try {
      // Optimistically update UI
      setSavedJobs(prev => prev.filter(job => job.job_post_id !== jobId));

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('Not logged in');
      const user = JSON.parse(userData);

      const response = await fetch(`${API_URL}/helper/unsave_job.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: jobId, helper_id: user.user_id }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to remove job');
    } catch (err) {
      console.error('Error removing saved job:', err);
      // Revert on error
      setSavedJobs(previous);
      throw err;
    }
  };

  const removeAllSaved = async () => {
    const previous = savedJobs;
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('Not logged in');
      const user = JSON.parse(userData);

      setSavedJobs([]);

      await Promise.all(previous.map(job =>
        fetch(`${API_URL}/helper/unsave_job.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_post_id: job.job_post_id, helper_id: user.user_id }),
        })
      ));
    } catch (err) {
      console.error('Error removing all saved jobs:', err);
      setSavedJobs(previous);
      throw err;
    }
  };

  const updateSort = (newSort: string) => {
    setSortBy(newSort);
    fetchSavedJobs(newSort);
  };

  useEffect(() => {
    fetchSavedJobs(sortBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    savedJobs,
    loading,
    error,
    sortBy,
    updateSort,
    removeSavedJob,
    removeAllSaved,
    refresh: () => fetchSavedJobs(sortBy),
    totalCount: savedJobs.length,
  };
}
