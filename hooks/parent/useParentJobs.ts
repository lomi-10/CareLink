// hooks/useParentJobs.ts
// Custom hook for fetching and managing parent's posted jobs

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

export interface JobPost {
  job_post_id: string;
  title: string;
  custom_job_title?: string;
  description: string;
  category_id?: string;
  category_name?: string;
  custom_category?: string;
  employment_type: string;
  work_schedule: string;
  salary_offered: number;
  salary_period: string;
  benefits?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  status: 'Open' | 'Filled' | 'Closed' | 'Expired';
  posted_at: string;
  expires_at: string;
  filled_at?: string;
  application_count: number;
  new_application_count: number;
  
  // --- ADDED THESE NEW FIELDS TO FIX TYPESCRIPT ERRORS ---
  min_age?: number;
  max_age?: number;
  min_experience_years?: number;
  require_police_clearance?: number | boolean;
  prefer_tesda_nc2?: number | boolean;
  provides_meals?: number | boolean;
  provides_accommodation?: number | boolean;
  provides_sss?: number | boolean;
  provides_philhealth?: number | boolean;
  provides_pagibig?: number | boolean;
  vacation_days?: number;
  sick_days?: number;
  work_hours?: string;
  days_off?: string; // JSON string from DB
  preferred_religion?: string;
  preferred_language_id?: string;
  preferred_language_name?: string;
  skill_names?: string; // Comma separated from DB join
  custom_skills?: string;
  contract_duration?: string;
  probation_period?: string;
}

export function useParentJobs() {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }

      const user = JSON.parse(userData);

      const response = await fetch(
        `${API_URL}/parent/get_posted_jobs.php?parent_id=${user.user_id}`
      );
      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs || []);
      } else {
        throw new Error(data.message || 'Failed to load jobs');
      }
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const getJobById = (jobId: string) => {
    return jobs.find((job) => job.job_post_id === jobId);
  };

  const getJobsByStatus = (status: string) => {
    if (status === 'all') return jobs;
    return jobs.filter((job) => job.status === status);
  };

  const getStats = () => {
    return {
      total: jobs.length,
      open: jobs.filter((j) => j.status === 'Open').length,
      filled: jobs.filter((j) => j.status === 'Filled').length,
      closed: jobs.filter((j) => j.status === 'Closed').length,
      expired: jobs.filter((j) => j.status === 'Expired').length,
      totalApplications: jobs.reduce((sum, j) => sum + j.application_count, 0),
      newApplications: jobs.reduce((sum, j) => sum + j.new_application_count, 0),
    };
  };

  return {
    jobs,
    loading,
    error,
    refresh: fetchJobs,
    getJobById,
    getJobsByStatus,
    stats: getStats(),
  };
}