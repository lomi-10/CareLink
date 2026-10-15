// hooks/useBrowseJobs.ts
// Enhanced with search and save functionality - NO MOCK DATA
// All data comes from API - shows empty state if no data

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true';

export interface JobPost {
  job_post_id: string;
  parent_id: string;
  
  // Basic Info
  title: string;
  /** The specific job roles behind the concise title — shown as chips in details. */
  job_names?: string[];
  description: string;
  employment_type: string;
  work_schedule: string;
  
  // Salary
  salary_offered: number;
  salary_period: string;
  slots?: number;
  
  // Location
  province: string;
  municipality: string;
  barangay?: string;
  distance?: number;
  
  // Categories & Skills
  category_ids: (string | number)[];
  categories: string[];
  job_ids: string[];
  jobs: string[];
  skill_ids: string[];
  skills: string[];
  
  // --- ADDED MISSING TYPESCRIPT PROPERTIES ---
  category_name?: string;
  custom_category?: string;
  preferred_language_id?: string | number;
  // ------------------------------------------

  // Requirements
  min_age?: number;
  max_age?: number;
  min_experience_years?: number;
  preferred_religion?: string;
  require_police_clearance?: boolean;
  prefer_tesda_nc2?: boolean;
  
  // Work Details
  start_date?: string;
  work_hours?: string;
  days_off: string[];
  contract_duration?: string;
  probation_period?: string;
  
  // Benefits
  benefits?: string;
  provides_meals?: boolean;
  provides_accommodation?: boolean;
  provides_sss?: boolean;
  provides_philhealth?: boolean;
  provides_pagibig?: boolean;
  vacation_days?: number;
  sick_days?: number;
  
  // Status
  status: string;
  posted_at: string;
  expires_at?: string;
  
  // Parent Info
  parent_name?: string;
  parent_rating?: number;
  parent_verified?: boolean;
  parent_profile_image?: string | null;
  parent_barangay?: string | null;
  parent_municipality?: string | null;
  parent_province?: string | null;
  parent_address?: string | null;
  parent_landmark?: string | null;
  
  // Match Score
  match_score?: number;
  match_reasons?: string[];
  is_new?: boolean;

  // Save status
  is_saved?: boolean;
  saved_at?: string;

  // The helper's existing application to this job, if any. Withdrawn (or no
  // application at all) means `application_status` is null and `can_apply`
  // is true; anything else (Pending, Rejected, hired, ...) means the helper
  // already has a relationship with this post and can't apply again.
  application_status?: string | null;
  can_apply?: boolean;
  /**
   * Employer paid to feature this post for 7 days. Affects sort position only —
   * the match score is unchanged. Must always be shown to the helper: a paid
   * placement is never presented as an organic result.
   */
  boosted?: boolean;
}

export interface JobFilters {
  // Existing filters
  category: string;
  distance: number;
  employment_type: string;
  work_schedule: string;
  salary_min: number;
  salary_max: number;
  sort: string;
  
  // NEW: Search & advanced filters
  search_query: string;
  requires_sss?: boolean;
  requires_philhealth?: boolean;
  requires_pagibig?: boolean;
  requires_meals?: boolean;
  requires_accommodation?: boolean;
  verified_only?: boolean;
  posted_within?: string;
}

export const DEFAULT_JOB_FILTERS: JobFilters = {
  category: 'all',
  distance: 9999,
  employment_type: 'all',
  work_schedule: 'all',
  salary_min: 0,
  salary_max: 999999,
  sort: 'recommended',
  search_query: '',
  verified_only: false,
  posted_within: 'all',
  requires_sss: false,
  requires_philhealth: false,
  requires_pagibig: false,
  requires_meals: false,
  requires_accommodation: false,
};

const normalizeSearchText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const includesAnyValue = (value: unknown) =>
  value === true || value === 1 || value === '1' || value === 'true';

const getMonthlySalary = (job: JobPost) => {
  const salary = Number(job.salary_offered) || 0;
  const period = normalizeSearchText(job.salary_period);
  if (period.startsWith('day')) return salary * 26;
  if (period.startsWith('week')) return salary * 52 / 12;
  if (period.startsWith('year') || period.startsWith('annual')) return salary / 12;
  return salary;
};

const getPostedTimestamp = (job: JobPost) =>
  Date.parse(job.posted_at.replace(' ', 'T'));

export function useBrowseJobs() {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPost[]>([]);
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_JOB_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      if(USE_MOCK){
        console.log(" DEMO MODE ON: LOADING UI MOCK DATA...");

        //const { MOCK_JOBS } = require('@/mockDataconstants/mockData');
        
        //setJobs(MOCK_JOBS);
        //setFilteredJobs(MOCK_JOBS);
        setJobs([]);
        setFilteredJobs([]);
        setLoading(false);
        return;
      }
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }

      const user = JSON.parse(userData);

      // Call API
      const response = await fetch(`${API_URL}/helper/browse_jobs.php?helper_id=${user.user_id}`);
      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs || []);
        setFilteredJobs(data.jobs || []);
      } else {
        // No jobs found - show empty state
        setJobs([]);
        setFilteredJobs([]);
      }
    } catch (err: any) {
      console.error('Error fetching jobs:', err.message);
      setError(err.message);
      // On error, show empty state
      setJobs([]);
      setFilteredJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Load recent searches from storage
  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem('recent_searches');
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    } catch (err) {
      console.error('Error loading recent searches:', err);
    }
  };

  // Save search to recent searches
  const saveRecentSearch = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      await AsyncStorage.setItem('recent_searches', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving recent search:', err);
    }
  };

  // Clear recent searches
  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem('recent_searches');
    } catch (err) {
      console.error('Error clearing recent searches:', err);
    }
  };

  // Generate search suggestions
  const generateSearchSuggestions = (query: string, availableJobs: JobPost[]) => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      setSearchSuggestions([]);
      return;
    }

    const candidates = availableJobs.flatMap((job) => [
      job.title,
      job.category_name,
      job.custom_category,
      ...(Array.isArray(job.categories) ? job.categories : []),
      ...(Array.isArray(job.job_names) ? job.job_names : []),
      ...(Array.isArray(job.jobs) ? job.jobs : []),
      ...(Array.isArray(job.skills) ? job.skills : []),
      job.barangay,
      job.municipality,
      job.province,
    ]);
    const seen = new Set<string>();
    const suggestions = candidates.filter((candidate): candidate is string => {
      if (typeof candidate !== 'string' || !candidate.trim()) return false;
      const normalized = normalizeSearchText(candidate);
      if (!normalized || seen.has(normalized) || !normalized.includes(normalizedQuery)) return false;
      seen.add(normalized);
      return true;
    });

    setSearchSuggestions(suggestions.slice(0, 6));
  };

  // Apply all filters
  const applyFilters = () => {
    let filtered = [...jobs];

    // Search query filter
    const searchTerms = normalizeSearchText(filters.search_query).split(/\s+/).filter(Boolean);
    if (searchTerms.length > 0) {
      filtered = filtered.filter((job) => {
        const searchableText = normalizeSearchText([
          job.title,
          job.description,
          job.category_name,
          job.custom_category,
          job.parent_name,
          job.barangay,
          job.municipality,
          job.province,
          job.parent_barangay,
          job.parent_municipality,
          job.parent_province,
          job.parent_address,
          job.parent_landmark,
          job.employment_type,
          job.work_schedule,
          ...(Array.isArray(job.categories) ? job.categories : []),
          ...(Array.isArray(job.job_names) ? job.job_names : []),
          ...(Array.isArray(job.jobs) ? job.jobs : []),
          ...(Array.isArray(job.skills) ? job.skills : []),
        ].join(' '));
        return searchTerms.every((term) => searchableText.includes(term));
      });
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter((job) =>
        Array.isArray(job.category_ids) && job.category_ids.some((id) => String(id) === filters.category)
      );
    }

    // Distance filter
    if (filters.distance !== 9999) {
      filtered = filtered.filter((job) => {
        return typeof job.distance === 'number' && Number.isFinite(job.distance) && job.distance <= filters.distance;
      });
    }

    // Employment type filter
    if (filters.employment_type !== 'all') {
      filtered = filtered.filter(
        (job) => 
          normalizeSearchText(job.employment_type) === normalizeSearchText(filters.employment_type) ||
          normalizeSearchText(job.employment_type) === 'any'
      );
    }

    // Work schedule filter
    if (filters.work_schedule !== 'all') {
      filtered = filtered.filter(
        (job) => 
          normalizeSearchText(job.work_schedule) === normalizeSearchText(filters.work_schedule) ||
          normalizeSearchText(job.work_schedule) === 'any'
      );
    }

    // Salary range filter
    filtered = filtered.filter((job) => {
      const monthlySalary = getMonthlySalary(job);
      return monthlySalary >= filters.salary_min && monthlySalary <= filters.salary_max;
    });

    // Benefits filters
    if (filters.requires_sss) {
      filtered = filtered.filter(job => includesAnyValue(job.provides_sss));
    }
    if (filters.requires_philhealth) {
      filtered = filtered.filter(job => includesAnyValue(job.provides_philhealth));
    }
    if (filters.requires_pagibig) {
      filtered = filtered.filter(job => includesAnyValue(job.provides_pagibig));
    }
    if (filters.requires_meals) {
      filtered = filtered.filter(job => includesAnyValue(job.provides_meals));
    }
    if (filters.requires_accommodation) {
      filtered = filtered.filter(job => includesAnyValue(job.provides_accommodation));
    }

    // Verified only filter
    if (filters.verified_only) {
      filtered = filtered.filter(job => includesAnyValue(job.parent_verified));
    }

    if (filters.posted_within && filters.posted_within !== 'all') {
      const days = Number(filters.posted_within);
      if (Number.isFinite(days) && days > 0) {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        filtered = filtered.filter((job) => {
          const postedAt = getPostedTimestamp(job);
          return Number.isFinite(postedAt) && postedAt >= cutoff;
        });
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'recommended':
          return (b.match_score || 0) - (a.match_score || 0);
        case 'nearest':
          return (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY);
        case 'highest_salary':
          return getMonthlySalary(b) - getMonthlySalary(a);
        case 'newest': {
          const postedA = getPostedTimestamp(a);
          const postedB = getPostedTimestamp(b);
          if (Number.isFinite(postedA) && Number.isFinite(postedB)) return postedB - postedA;
          if (Number.isFinite(postedA)) return -1;
          if (Number.isFinite(postedB)) return 1;
          return (Number(b.job_post_id) || 0) - (Number(a.job_post_id) || 0);
        }
        default:
          return 0;
      }
    });

    setFilteredJobs(filtered);
  };

  // Update filter
  const updateFilter = (key: keyof JobFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    
    // If updating search query, generate suggestions
    if (key === 'search_query') {
      generateSearchSuggestions(String(value ?? ''), jobs);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters(DEFAULT_JOB_FILTERS);
    setSearchSuggestions([]);
  };

  // Toggle save job
  const toggleSaveJob = async (jobId: string) => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) return;

      const user = JSON.parse(userData);

      // Find the job
      const job = jobs.find(j => j.job_post_id === jobId);
      if (!job) return;

      // Optimistically update UI
      const newSavedStatus = !job.is_saved;
      
      setJobs(prevJobs => 
        prevJobs.map(j => 
          j.job_post_id === jobId 
            ? { ...j, is_saved: newSavedStatus, saved_at: newSavedStatus ? new Date().toISOString() : undefined }
            : j
        )
      );

      setFilteredJobs(prevJobs => 
        prevJobs.map(j => 
          j.job_post_id === jobId 
            ? { ...j, is_saved: newSavedStatus, saved_at: newSavedStatus ? new Date().toISOString() : undefined }
            : j
        )
      );

      // Call API
      const endpoint = newSavedStatus ? '/helper/save_job.php' : '/helper/unsave_job.php';
      await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_post_id: jobId,
          helper_id: user.user_id,
          requester_id: user.user_id,
        })
      });

    } catch (err) {
      console.error('Error toggling save job:', err);
      // Revert on error
      fetchJobs();
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchJobs();
    loadRecentSearches();
  }, []);

  // Apply filters when filters change
  useEffect(() => {
    applyFilters();
  }, [filters, jobs]);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sort' || key === 'search_query') return false;
    if (key === 'category') return value !== DEFAULT_JOB_FILTERS.category;
    if (key === 'distance') return value !== DEFAULT_JOB_FILTERS.distance;
    if (key === 'salary_min') return value !== DEFAULT_JOB_FILTERS.salary_min;
    if (key === 'salary_max') return value !== DEFAULT_JOB_FILTERS.salary_max;
    if (key === 'employment_type' || key === 'work_schedule') return value !== 'all';
    if (key === 'posted_within') return value !== 'all';
    return value === true;
  }).length;

  return {
    jobs: filteredJobs,
    allJobs: jobs,
    filters,
    loading,
    error,
    updateFilter,
    resetFilters,
    refresh: fetchJobs,
    totalCount: jobs.length,
    filteredCount: filteredJobs.length,
    activeFilterCount,
    
    // Search features
    searchSuggestions,
    recentSearches,
    saveRecentSearch,
    clearRecentSearches,
    
    // Save feature
    toggleSaveJob,
    savedCount: jobs.filter(j => j.is_saved).length,
  };
}