// hooks/useJobForm.ts
// FIXED - Removed double-stringification for arrays

import { useState } from 'react';

export interface JobFormData {
  // MULTI-SELECT: Category & Jobs & Skills
  category_ids: string[];
  job_ids: string[];
  skill_ids: string[];
  custom_category: string;
  custom_job_title: string;
  custom_skill_title: string;
  title: string;
  description: string;

  // Work Arrangement
  employment_type: 'Live-in' | 'Live-out' | 'Any';
  work_schedule: 'Full-time' | 'Part-time' | 'Any';

  // Salary
  salary_offered: string;
  salary_period: 'Daily' | 'Monthly';

  // Location
  province: string;
  municipality: string;
  barangay: string;

  // Age Range
  min_age: number;
  max_age: number;

  // Experience
  min_experience_years: number;

  // Work Schedule Details
  start_date: string;
  work_hours: string;
  days_off: string[];

  // Contract Details
  contract_duration: string;
  probation_period: string;

  // Benefits
  benefits: string;
  provides_meals: boolean;
  provides_accommodation: boolean;
  provides_sss: boolean;
  provides_philhealth: boolean;
  provides_pagibig: boolean;
  vacation_days: number;
  sick_days: number;

  // Preferences
  preferred_religion: string;
  preferred_language_id: string;

  // Requirements
  require_police_clearance: boolean;
  prefer_tesda_nc2: boolean;
}

const initialFormData: JobFormData = {
  category_ids: [],
  job_ids: [],
  skill_ids: [],
  custom_category: '',
  custom_job_title: '',
  custom_skill_title: '',
  title: '',
  description: '',
  
  employment_type: 'Any',
  work_schedule: 'Any',
  
  salary_offered: '',
  salary_period: 'Monthly',
  
  province: 'Leyte',
  municipality: 'Ormoc City',
  barangay: '',
  
  min_age: 18,
  max_age: 65,
  
  min_experience_years: 0,
  
  start_date: '',
  work_hours: '',
  days_off: [],
  
  contract_duration: 'Indefinite',
  probation_period: 'None',
  
  benefits: '',
  provides_meals: false,
  provides_accommodation: false,
  provides_sss: false,
  provides_philhealth: false,
  provides_pagibig: false,
  vacation_days: 0,
  sick_days: 0,
  
  preferred_religion: '',
  preferred_language_id: '',
  
  require_police_clearance: false,
  prefer_tesda_nc2: false,
};

export function useJobForm() {
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof JobFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const updateFields = (updates: Partial<JobFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (formData.category_ids.length === 0 && !formData.custom_category.trim()) {
      newErrors.category = 'Please select at least one category';
    }
    
    if (formData.job_ids.length === 0 && !formData.title.trim()) {
      newErrors.title = 'Please select at least one job or enter a custom title';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Job description is required';
    }
    
    const salary = parseFloat(formData.salary_offered);
    if (!formData.salary_offered || isNaN(salary)) {
      newErrors.salary = 'Salary is required';
    } else if (salary < 6000) {
      newErrors.salary = 'Minimum salary is ₱6,000';
    }
    
    if (!formData.municipality.trim()) {
      newErrors.municipality = 'Municipality is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const reset = () => {
    setFormData(initialFormData);
    setErrors({});
  };

  const populateForm = (data: any) => {
    // Safely parse JSON strings from the DB back into native arrays
    const parseArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return []; }
      }
      return [];
    };

    setFormData({
      category_ids: parseArray(data.category_ids),
      job_ids: parseArray(data.job_ids),
      skill_ids: parseArray(data.skill_ids),
      days_off: parseArray(data.days_off),
      
      custom_category: data.custom_category || '',
      custom_job_title: data.custom_job_title || '',
      custom_skill_title: data.custom_skill_title || '',
      title: data.title || '',
      description: data.description || '',
      
      employment_type: data.employment_type || 'Any',
      work_schedule: data.work_schedule || 'Any',
      
      salary_offered: data.salary_offered ? data.salary_offered.toString() : '',
      salary_period: data.salary_period || 'Monthly',
      
      province: data.province || 'Leyte',
      municipality: data.municipality || 'Ormoc City',
      barangay: data.barangay || '',
      
      min_age: data.min_age || 18,
      max_age: data.max_age || 65,
      min_experience_years: data.min_experience_years || 0,
      
      start_date: data.start_date || '',
      work_hours: data.work_hours || '',
      
      contract_duration: data.contract_duration || 'Indefinite',
      probation_period: data.probation_period || 'None',
      
      benefits: data.benefits || '',
      provides_meals: !!data.provides_meals,
      provides_accommodation: !!data.provides_accommodation,
      provides_sss: !!data.provides_sss,
      provides_philhealth: !!data.provides_philhealth,
      provides_pagibig: !!data.provides_pagibig,
      vacation_days: data.vacation_days || 0,
      sick_days: data.sick_days || 0,
      
      preferred_religion: data.preferred_religion || '',
      preferred_language_id: data.preferred_language_id || '',
      
      require_police_clearance: !!data.require_police_clearance,
      prefer_tesda_nc2: !!data.prefer_tesda_nc2,
    });
  };

  const getSubmissionData = () => {
    return {
      parent_id: '', // Will be filled by the component
      
      // FIXED: Send native arrays instead of JSON strings to prevent double-encoding
      category_ids: formData.category_ids,
      job_ids: formData.job_ids,
      skill_ids: formData.skill_ids,
      days_off: formData.days_off,
      
      custom_category: formData.custom_category || null,
      custom_job_title: formData.custom_job_title || null,
      custom_skill_title: formData.custom_skill_title || null,
      title: formData.title.trim() || null,
      description: formData.description.trim(),
      
      employment_type: formData.employment_type,
      work_schedule: formData.work_schedule,
      
      salary_offered: parseFloat(formData.salary_offered),
      salary_period: formData.salary_period,
      
      province: formData.province,
      municipality: formData.municipality.trim(),
      barangay: formData.barangay.trim() || null,
      
      min_age: formData.min_age,
      max_age: formData.max_age,
      min_experience_years: formData.min_experience_years,
      
      start_date: formData.start_date || null,
      work_hours: formData.work_hours || null,
      
      contract_duration: formData.contract_duration || null,
      probation_period: formData.probation_period || null,
      
      benefits: formData.benefits.trim() || null,
      provides_meals: formData.provides_meals ? 1 : 0,
      provides_accommodation: formData.provides_accommodation ? 1 : 0,
      provides_sss: formData.provides_sss ? 1 : 0,
      provides_philhealth: formData.provides_philhealth ? 1 : 0,
      provides_pagibig: formData.provides_pagibig ? 1 : 0,
      vacation_days: formData.vacation_days,
      sick_days: formData.sick_days,
      
      preferred_religion: formData.preferred_religion || null,
      preferred_language_id: formData.preferred_language_id || null,
      
      require_police_clearance: formData.require_police_clearance ? 1 : 0,
      prefer_tesda_nc2: formData.prefer_tesda_nc2 ? 1 : 0,
    };
  };

  return {
    formData,
    errors,
    updateField,
    updateFields,
    validate,
    reset,
    getSubmissionData,
    populateForm,
  };
}