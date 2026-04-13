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
  description: string;
  employment_type: string;
  work_schedule: string;
  
  // Salary
  salary_offered: number;
  salary_period: string;
  
  // Location
  province: string;
  municipality: string;
  barangay?: string;
  distance?: number;
  
  // Categories & Skills
  category_ids: string[];
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
  
  // Match Score
  match_score?: number;
  match_reasons?: string[];
  
  // Save status
  is_saved?: boolean;
  saved_at?: string;
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
  location_province?: string;
  location_municipality?: string;
  requires_sss?: boolean;
  requires_philhealth?: boolean;
  requires_pagibig?: boolean;
  requires_meals?: boolean;
  requires_accommodation?: boolean;
  verified_only?: boolean;
  min_experience?: number;
  posted_within?: string;
}

const defaultFilters: JobFilters = {
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
};

export function useBrowseJobs() {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPost[]>([]);
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);
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
  const generateSearchSuggestions = (query: string) => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      return;
    }

    const suggestions: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Add category suggestions
    const categories = ["yaya", "cook", "driver", "general househelp", "laundry", "gardener"];
    categories.forEach(cat => {
      if (cat.includes(lowerQuery)) {
        suggestions.push(cat);
      }
    });

    // Add location suggestions
    const locations = ["Ormoc City", "Tacloban", "Leyte", "Cebu"];
    locations.forEach(loc => {
      if (loc.toLowerCase().includes(lowerQuery)) {
        suggestions.push(loc);
      }
    });

    // Add skill suggestions
    const skills = ["childcare", "cooking", "cleaning", "driving"];
    skills.forEach(skill => {
      if (skill.includes(lowerQuery)) {
        suggestions.push(skill);
      }
    });

    setSearchSuggestions(suggestions.slice(0, 5));
  };

  // Apply all filters
  const applyFilters = () => {
    let filtered = [...jobs];

    // Search query filter
    if (filters.search_query.trim()) {
      const query = filters.search_query.toLowerCase();
      filtered = filtered.filter((job) => {
        return (
          job.title.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          job.categories.some(cat => cat.toLowerCase().includes(query)) ||
          job.skills.some(skill => skill.toLowerCase().includes(query)) ||
          job.municipality.toLowerCase().includes(query) ||
          job.province.toLowerCase().includes(query)
        );
      });
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter((job) =>
        job.category_ids.includes(filters.category)
      );
    }

    // Distance filter
    if (filters.distance !== 9999) {
      filtered = filtered.filter((job) => {
        if (!job.distance) return true;
        return job.distance <= filters.distance;
      });
    }

    // Employment type filter
    if (filters.employment_type !== 'all') {
      filtered = filtered.filter(
        (job) => 
          job.employment_type === filters.employment_type || 
          job.employment_type === 'Any'
      );
    }

    // Work schedule filter
    if (filters.work_schedule !== 'all') {
      filtered = filtered.filter(
        (job) => 
          job.work_schedule === filters.work_schedule || 
          job.work_schedule === 'Any'
      );
    }

    // Salary range filter
    filtered = filtered.filter((job) => {
      const monthlySalary = job.salary_period === 'Daily' 
        ? job.salary_offered * 26 
        : job.salary_offered;
      
      return monthlySalary >= filters.salary_min && monthlySalary <= filters.salary_max;
    });

    // Benefits filters
    if (filters.requires_sss) {
      filtered = filtered.filter(job => job.provides_sss);
    }
    if (filters.requires_philhealth) {
      filtered = filtered.filter(job => job.provides_philhealth);
    }
    if (filters.requires_pagibig) {
      filtered = filtered.filter(job => job.provides_pagibig);
    }
    if (filters.requires_meals) {
      filtered = filtered.filter(job => job.provides_meals);
    }
    if (filters.requires_accommodation) {
      filtered = filtered.filter(job => job.provides_accommodation);
    }

    // Verified only filter
    if (filters.verified_only) {
      filtered = filtered.filter(job => job.parent_verified);
    }

    // Experience filter
    if (filters.min_experience) {
      filtered = filtered.filter(job => {
        if (!job.min_experience_years) return true;
        return filters.min_experience ? filters.min_experience >= job.min_experience_years : true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'recommended':
          return (b.match_score || 0) - (a.match_score || 0);
        case 'nearest':
          return (a.distance || 999) - (b.distance || 999);
        case 'highest_salary':
          const salaryA = a.salary_period === 'Daily' ? a.salary_offered * 26 : a.salary_offered;
          const salaryB = b.salary_period === 'Daily' ? b.salary_offered * 26 : b.salary_offered;
          return salaryB - salaryA;
        case 'newest':
          return parseInt(b.job_post_id) - parseInt(a.job_post_id);
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
      generateSearchSuggestions(value);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters(defaultFilters);
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
          helper_id: user.user_id 
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