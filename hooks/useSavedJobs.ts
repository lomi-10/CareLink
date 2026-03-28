// hooks/useSavedJobs.ts
// Hook for managing saved jobs

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../constants/api';
import { JobPost } from './useBrowseJobs';

export function useSavedJobs() {
  const [savedJobs, setSavedJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('recent'); // 'recent', 'match', 'nearest', 'salary', 'expiring'

  // Fetch saved jobs
  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }

      const user = JSON.parse(userData);

      // In production: await fetch(`${API_URL}/helper/saved_jobs.php?helper_id=${user.user_id}`);
      
      // Mock data for UI development
      const mockSavedJobs: JobPost[] = [
        {
          job_post_id: "3",
          parent_id: "4",
          title: "General Househelp",
          description: "Seeking reliable househelp for general cleaning, laundry, and light cooking.",
          employment_type: "Live-in",
          work_schedule: "Full-time",
          salary_offered: 7500,
          salary_period: "Monthly",
          province: "Leyte",
          municipality: "Ormoc City",
          distance: 2.3,
          category_ids: ["1"],
          categories: ["General Househelp"],
          job_ids: ["1", "2"],
          jobs: ["Househelp", "Laundry"],
          skill_ids: [],
          skills: [],
          provides_meals: true,
          provides_accommodation: true,
          provides_sss: true,
          provides_philhealth: true,
          provides_pagibig: false,
          vacation_days: 10,
          sick_days: 5,
          days_off: [],
          status: "Open",
          posted_at: "3 days ago",
          parent_name: "Garcia Family",
          parent_verified: false,
          match_score: 65,
          match_reasons: ["Location nearby"],
          is_saved: true,
          saved_at: "2 days ago",
        },
        {
          job_post_id: "5",
          parent_id: "6",
          title: "Live-out Driver",
          description: "Need a reliable driver for school and errands. Must have valid license and clean record.",
          employment_type: "Live-out",
          work_schedule: "Full-time",
          salary_offered: 9000,
          salary_period: "Monthly",
          province: "Leyte",
          municipality: "Tacloban City",
          distance: 12.5,
          category_ids: ["4"],
          categories: ["Driver"],
          job_ids: ["10"],
          jobs: ["Driver"],
          skill_ids: ["25"],
          skills: ["Defensive Driving"],
          provides_meals: false,
          provides_accommodation: false,
          provides_sss: true,
          provides_philhealth: true,
          provides_pagibig: true,
          vacation_days: 12,
          sick_days: 10,
          days_off: ["Sunday"],
          status: "Open",
          posted_at: "1 week ago",
          parent_name: "Reyes Family",
          parent_verified: true,
          match_score: 72,
          match_reasons: ["Salary in range", "Full-time matches"],
          is_saved: true,
          saved_at: "5 days ago",
        },
      ];

      // Sort the saved jobs
      const sorted = sortSavedJobs(mockSavedJobs, sortBy);
      setSavedJobs(sorted);
    } catch (err: any) {
      console.error('Error fetching saved jobs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sort saved jobs
  const sortSavedJobs = (jobs: JobPost[], sortType: string): JobPost[] => {
    const sorted = [...jobs];
    
    switch (sortType) {
      case 'recent':
        // Most recently saved first
        sorted.sort((a, b) => {
          if (!a.saved_at || !b.saved_at) return 0;
          return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
        });
        break;
      
      case 'match':
        // Highest match score first
        sorted.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
        break;
      
      case 'nearest':
        // Closest distance first
        sorted.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        break;
      
      case 'salary':
        // Highest salary first
        sorted.sort((a, b) => {
          const salaryA = a.salary_period === 'Daily' ? a.salary_offered * 26 : a.salary_offered;
          const salaryB = b.salary_period === 'Daily' ? b.salary_offered * 26 : b.salary_offered;
          return salaryB - salaryA;
        });
        break;
      
      case 'expiring':
        // Jobs expiring soon first (if we had expiry dates)
        break;
    }
    
    return sorted;
  };

  // Remove job from saved
  const removeSavedJob = async (jobId: string) => {
    try {
      // Optimistically update UI
      setSavedJobs(prev => prev.filter(job => job.job_post_id !== jobId));

      // In production: await fetch(`${API_URL}/helper/remove_saved_job.php`, { ... });
      
    } catch (err) {
      console.error('Error removing saved job:', err);
      // Revert on error
      fetchSavedJobs();
    }
  };

  // Remove all saved jobs
  const removeAllSaved = async () => {
    try {
      setSavedJobs([]);
      // In production: await fetch(`${API_URL}/helper/remove_all_saved.php`, { ... });
    } catch (err) {
      console.error('Error removing all saved jobs:', err);
      fetchSavedJobs();
    }
  };

  // Update sort and re-fetch
  const updateSort = (newSort: string) => {
    setSortBy(newSort);
    setSavedJobs(prev => sortSavedJobs(prev, newSort));
  };

  // Initial fetch
  useEffect(() => {
    fetchSavedJobs();
  }, []);

  // Re-sort when sortBy changes
  useEffect(() => {
    if (savedJobs.length > 0) {
      setSavedJobs(prev => sortSavedJobs(prev, sortBy));
    }
  }, [sortBy]);

  return {
    savedJobs,
    loading,
    error,
    sortBy,
    updateSort,
    removeSavedJob,
    removeAllSaved,
    refresh: fetchSavedJobs,
    totalCount: savedJobs.length,
  };
}
