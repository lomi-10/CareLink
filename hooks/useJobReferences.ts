// hooks/useJobReferences.ts
// UPDATED - Multi-filter functions for category/job/skill arrays with Type-Safe ID matching

import { useState, useEffect } from 'react';
import API_URL from '../constants/api';

export interface Category {
  category_id: string | number;
  name: string;
  icon: string;
}

export interface Job {
  job_id: string | number;
  category_id: string | number;
  job_title: string;
}

export interface Skill {
  skill_id: string | number;
  job_id: string | number;
  skill_name: string;
  description?: string;
}

export interface Language {
  language_id: string | number;
  language_name: string;
}

export function useJobReferences() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [religions] = useState<string[]>([
    'Roman Catholic',
    'Islam',
    'Iglesia ni Cristo',
    'Protestant',
    'Buddhist',
    'Other',
    'No Preference',
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferences();
  }, []);

  const fetchReferences = async () => {
    try {
      setLoading(true);

      const [categoriesRes, jobsRes, skillsRes, languagesRes] = await Promise.all([
        fetch(`${API_URL}/shared/get_categories.php`),
        fetch(`${API_URL}/shared/get_jobs.php`),
        fetch(`${API_URL}/shared/get_skills.php`),
        fetch(`${API_URL}/shared/get_languages.php`),
      ]);

      const [categoriesData, jobsData, skillsData, languagesData] = await Promise.all([
        categoriesRes.json(),
        jobsRes.json(),
        skillsRes.json(),
        languagesRes.json(),
      ]);

      if (categoriesData.success) {
        const categoriesWithIcons = categoriesData.categories.map((cat: any) => ({
          category_id: cat.category_id,
          name: cat.category_name,
          icon: getCategoryIcon(cat.category_id.toString()),
        }));
        setCategories(categoriesWithIcons);
      }

      if (jobsData.success) {
        setJobs(jobsData.jobs || []);
      }

      if (skillsData.success) {
        setSkills(skillsData.skills || []);
      }

      if (languagesData.success) {
        setLanguages(languagesData.languages || []);
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching references:', err);
      setError(err.message || 'Failed to load reference data');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (categoryId: string): string => {
    const iconMap: Record<string, string> = {
      '1': 'home',
      '2': 'person',
      '3': 'restaurant',
      '4': 'leaf',
      '5': 'shirt',
      '6': 'ellipsis-horizontal',
    };
    return iconMap[categoryId] || 'briefcase';
  };

  // FIXED: Converted job.category_id to string for safe comparison
  const getJobsByCategories = (categoryIds: string[]): Job[] => {
    if (categoryIds.length === 0) return [];

    // If General Household (id=1) is selected, show ALL jobs
    if (categoryIds.includes('1')) {
      return jobs;
    }

    // Otherwise, show jobs from selected categories
    return jobs.filter((job) => categoryIds.includes(job.category_id.toString()));
  };

  // Get jobs filtered by single category (keep for backward compatibility)
  const getJobsByCategory = (categoryId: string): Job[] => {
    return getJobsByCategories([categoryId]);
  };

  // FIXED: Converted skill.job_id to string for safe comparison
  const getSkillsByJobs = (jobIds: string[]): Skill[] => {
    if (jobIds.length === 0) return [];

    return skills.filter((skill) => jobIds.includes(skill.job_id.toString()));
  };

  // Get skills filtered by single job (keep for backward compatibility)
  const getSkillsByJob = (jobId: string): Skill[] => {
    return getSkillsByJobs([jobId]);
  };

  // Get all skills for jobs in selected categories
  const getSkillsForCategories = (categoryIds: string[]): Skill[] => {
    if (categoryIds.length === 0) return [];

    const categoryJobs = getJobsByCategories(categoryIds);
    // Convert to strings so it aligns with jobIds format
    const jobIds = categoryJobs.map((job) => job.job_id.toString());

    return skills.filter((skill) => jobIds.includes(skill.job_id.toString()));
  };

  return {
    categories,
    jobs,
    skills,
    languages,
    religions,
    loading,
    error,
    refresh: fetchReferences,
    
    // Single-select functions (backward compatibility)
    getJobsByCategory,
    getSkillsByJob,
    
    // NEW: Multi-select functions
    getJobsByCategories,
    getSkillsByJobs,
    getSkillsForCategories,
  };
}