// hooks/useBrowseJobs.ts
// Custom hook for browsing and filtering job postings

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../constants/api';

export interface JobPost {
  job_post_id: string;
  parent_id: string;
  
  // Basic Info
  title: string;
  description: string;
  employment_type: string; // 'Live-in', 'Live-out', 'Any'
  work_schedule: string; // 'Full-time', 'Part-time', 'Any'
  
  // Salary
  salary_offered: number;
  salary_period: string; // 'Daily', 'Monthly'
  
  // Location
  province: string;
  municipality: string;
  barangay?: string;
  distance?: number; // Distance from helper in km
  
  // Categories & Skills (multi-select)
  category_ids: string[];
  categories: string[]; // Category names
  job_ids: string[];
  jobs: string[]; // Job titles
  skill_ids: string[];
  skills: string[]; // Skill names
  
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
  status: string; // 'Open', 'Filled', 'Closed', 'Expired'
  posted_at: string;
  expires_at?: string;
  
  // Parent Info
  parent_name?: string;
  parent_rating?: number;
  parent_verified?: boolean;
  
  // Match Score (calculated)
  match_score?: number;
  match_reasons?: string[];
}

export interface JobFilters {
  category: string; // 'all' or category_id
  distance: number; // in km (5, 10, 20, 50, 9999 for 'all')
  employment_type: string; // 'all', 'Live-in', 'Live-out'
  work_schedule: string; // 'all', 'Full-time', 'Part-time'
  salary_min: number;
  salary_max: number;
  sort: string; // 'recommended', 'nearest', 'highest_salary', 'newest'
}

const defaultFilters: JobFilters = {
  category: 'all',
  distance: 20,
  employment_type: 'all',
  work_schedule: 'all',
  salary_min: 0,
  salary_max: 50000,
  sort: 'recommended',
};

export function useBrowseJobs() {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPost[]>([]);
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [helperLocation, setHelperLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }

      const user = JSON.parse(userData);

      // Fetch all open jobs
      const response = await fetch(`${API_URL}/helper/browse_jobs.php?helper_id=${user.user_id}`);
      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs);
        setFilteredJobs(data.jobs);
      } else {
        throw new Error(data.message || 'Failed to load jobs');
      }
    } catch (err: any) {
      console.log('Backend not ready, using mock data...');
      
      // 🚀 MOCK DATA FOR UI DEVELOPMENT
      const mockJobs: JobPost[] = [
        {
          job_post_id: "1",
          parent_id: "2",
          title: "Live-in Yaya Needed",
          description: "We are a young family looking for a caring and experienced yaya to help care for our 2-year-old child. Must be patient, trustworthy, and good with children.",
          employment_type: "Live-in",
          work_schedule: "Full-time",
          salary_offered: 8000,
          salary_period: "Monthly",
          province: "Leyte",
          municipality: "Ormoc City",
          barangay: "District 12",
          distance: 1.2,
          category_ids: ["2"],
          categories: ["Yaya"],
          job_ids: ["5"],
          jobs: ["Yaya"],
          skill_ids: ["9", "11"],
          skills: ["Infant Care", "Child Development"],
          min_age: 25,
          max_age: 45,
          min_experience_years: 2,
          require_police_clearance: true,
          prefer_tesda_nc2: true,
          start_date: "April 1, 2026",
          work_hours: "24/7 with breaks",
          days_off: ["Sunday"],
          contract_duration: "1 year",
          probation_period: "3 months",
          provides_meals: true,
          provides_accommodation: true,
          provides_sss: true,
          provides_philhealth: true,
          provides_pagibig: true,
          vacation_days: 15,
          sick_days: 10,
          status: "Open",
          posted_at: "2 hours ago",
          parent_name: "Cruz Family",
          parent_verified: true,
          parent_rating: 4.8,
          match_score: 92,
          match_reasons: ["Category matches", "Location nearby", "Salary in range"],
        },
        {
          job_post_id: "2",
          parent_id: "3",
          title: "Part-time Cook Needed",
          description: "Looking for a skilled cook to prepare meals 3 days a week (Mon, Wed, Fri). Must know Filipino and some Western dishes.",
          employment_type: "Live-out",
          work_schedule: "Part-time",
          salary_offered: 400,
          salary_period: "Daily",
          province: "Leyte",
          municipality: "Ormoc City",
          distance: 4.5,
          category_ids: ["3"],
          categories: ["Cook"],
          job_ids: ["7"],
          jobs: ["Cook"],
          skill_ids: ["15", "16"],
          skills: ["Filipino Cuisine", "Meal Planning"],
          min_experience_years: 1,
          work_hours: "10am-6pm",
          days_off: ["Tuesday", "Thursday", "Saturday", "Sunday"],
          provides_meals: true,
          provides_sss: false,
          provides_philhealth: false,
          provides_pagibig: false,
          status: "Open",
          posted_at: "1 day ago",
          parent_name: "Santos Family",
          parent_verified: true,
          match_score: 78,
          match_reasons: ["Location nearby", "Part-time matches preference"],
        },
        {
          job_post_id: "3",
          parent_id: "4",
          title: "General Househelp",
          description: "Seeking reliable househelp for general cleaning, laundry, and light cooking. No childcare needed.",
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
          min_experience_years: 1,
          work_hours: "10am-6pm",
          days_off: ["Tuesday", "Thursday", "Saturday", "Sunday"],
          provides_meals: true,
          provides_accommodation: true,
          provides_sss: true,
          provides_philhealth: true,
          provides_pagibig: false,
          vacation_days: 10,
          sick_days: 5,
          status: "Open",
          posted_at: "3 days ago",
          parent_name: "Garcia Family",
          parent_verified: false,
          match_score: 65,
          match_reasons: ["Location nearby"],
        },
      ];

      setJobs(mockJobs);
      setFilteredJobs(mockJobs);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...jobs];

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter((job) =>
        job.category_ids.includes(filters.category)
      );
    }

    // Filter by distance
    if (filters.distance !== 9999 && helperLocation) {
      filtered = filtered.filter((job) => {
        if (!job.distance) return true; // Include if no distance data
        return job.distance <= filters.distance;
      });
    }

    // Filter by employment type
    if (filters.employment_type !== 'all') {
      filtered = filtered.filter(
        (job) => 
          job.employment_type === filters.employment_type || 
          job.employment_type === 'Any'
      );
    }

    // Filter by work schedule
    if (filters.work_schedule !== 'all') {
      filtered = filtered.filter(
        (job) => 
          job.work_schedule === filters.work_schedule || 
          job.work_schedule === 'Any'
      );
    }

    // Filter by salary range
    filtered = filtered.filter((job) => {
      const monthlySalary = job.salary_period === 'Daily' 
        ? job.salary_offered * 26 // Estimate monthly from daily
        : job.salary_offered;
      
      return monthlySalary >= filters.salary_min && monthlySalary <= filters.salary_max;
    });

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
          // Assume newer jobs have higher job_post_id
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
  };

  // Reset filters
  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  // Initial fetch
  useEffect(() => {
    fetchJobs();
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
  };
}