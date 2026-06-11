// hooks/useJobForm.ts
import { useState } from 'react';
import { Category, Job } from '../shared/useJobReferences';

export interface JobFormData {
  // STRICT 1-to-1: Category & Job
  category_id: string;
  job_ids: string[];

  // MULTI-SELECT: Skills & Days off
  skill_ids: string[];
  days_off: string[];

  custom_category: string;
  custom_job_title: string;
  custom_skills: string;
  title: string;
  description: string;

  employment_type: 'Stay-in' | 'Stay-out' | 'Any';
  work_schedule: 'Full-time' | 'Part-time' | 'Any';
  salary_min: string;
  salary_max: string;
  salary_period: 'Daily' | 'Weekly' | 'Monthly';
  province: string;
  municipality: string;
  barangay: string;
  latitude: number | null;
  longitude: number | null;
  min_age: number;
  max_age: number;
  min_experience_years: number;
  start_date: string;
  work_hours: string;
  contract_duration: string;
  benefits: string;
  provides_meals: boolean;
  provides_accommodation: boolean;
  provides_sss: boolean;
  provides_philhealth: boolean;
  provides_pagibig: boolean;
  vacation_days: number;
  sick_days: number;
  preferred_religion: string;
  preferred_language_id: string;
  require_police_clearance: boolean;
  prefer_tesda_nc2: boolean;
}

const generateDescription = (category: Category | null, jobs: Job[]): string => {
  const jobTitles = jobs.map(j => j.job_title).join(', ') || 'helper';
  const categoryName = category?.name || 'general household';
  
  if (category?.category_id.toString() === '1') { // General Household
    return `We are looking for a reliable ${jobTitles} to join our family!

Responsibilities include:
• General cleaning and maintaining a tidy home
• Laundry and ironing clothes
• Cooking meals for the family
• Running errands (grocery shopping, paying bills)
• Assisting with childcare (if applicable)

Requirements:
• Honest, hardworking, and trustworthy
• Good communication skills
• Previous experience in ${categoryName} work is a plus
• Willing to learn and follow instructions

We offer a friendly, respectful working environment with fair compensation!`;
  } else if (category?.category_id.toString() === '2') { // Childcare/Nanny
    return `We are looking for a loving and responsible ${jobTitles} to take care of our children!

Responsibilities include:
• Supervise and care for our children at all times
• Prepare nutritious meals and snacks for the kids
• Help with homework and educational activities
• Play and engage children in fun, safe activities
• Ensure the children's safety and well-being

Requirements:
• Patient, caring, and energetic
• Loves working with children
• Previous childcare experience is a plus
• First aid knowledge is an advantage

We offer a warm, family-oriented environment with competitive pay!`;
  } else if (category?.category_id.toString() === '3') { // Cooking
    return `We are looking for a skilled ${jobTitles} to prepare delicious meals for our family!

Responsibilities include:
• Plan and prepare nutritious, tasty meals for the family
• Manage kitchen inventory and grocery shopping for ingredients
• Maintain a clean and organized kitchen
• Follow family dietary preferences and restrictions

Requirements:
• Passionate about cooking
• Experience in home cooking is preferred
• Knowledgeable about food safety and hygiene
• Creative and willing to try new recipes

We offer a flexible schedule and great compensation!`;
  } else if (category?.category_id.toString() === '4') { // Gardening
    return `We are looking for a dedicated ${jobTitles} to take care of our garden and outdoor spaces!

Responsibilities include:
• Planting, watering, and maintaining plants and flowers
• Mowing the lawn and trimming hedges
• Keeping the garden clean and free of debris
• Assisting with outdoor maintenance tasks

Requirements:
• Enjoys working with plants and outdoors
• Basic gardening knowledge is a plus
• Physically fit and able to do manual work
• Reliable and hardworking

We offer a nice working environment and fair pay!`;
  } else if (category?.category_id.toString() === '5') { // Laundry
    return `We are looking for a reliable ${jobTitles} to handle our laundry needs!

Responsibilities include:
• Washing, drying, and ironing clothes
• Properly sorting clothes by color and fabric type
• Folding and organizing clean laundry
• Following care instructions for delicate items

Requirements:
• Detail-oriented and careful with clothes
• Previous laundry experience is preferred
• Knowledgeable about different fabric care
• Reliable and consistent

We offer a steady schedule and competitive compensation!`;
  }
  
  return `We are looking for a reliable ${jobTitles} to join our family!

Responsibilities include:
• ${categoryName} related tasks
• Maintaining a clean and organized home
• Following family instructions carefully
• Other duties as assigned

Requirements:
• Honest and hardworking
• Good communication skills
• Willing to learn
• Previous experience is a plus

We offer a friendly, respectful working environment!`;
};

const DEFAULT_DESCRIPTION = generateDescription(null, []);

const initialFormData: JobFormData = {
  category_id: '',
  job_ids: [],
  skill_ids: [],
  custom_category: '',
  custom_job_title: '',
  custom_skills: '',
  title: '',
  description: '',
  employment_type: 'Any',
  work_schedule: 'Any',
  salary_min: '',
  salary_max: '',
  salary_period: 'Monthly',
  province: 'Leyte',
  municipality: 'Ormoc City',
  barangay: '',
  latitude: null,
  longitude: null,
  min_age: 18,
  max_age: 65,
  min_experience_years: 0,
  start_date: '',
  work_hours: '',
  days_off: [],
  contract_duration: 'Indefinite',
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

  const validate = (categories: Category[]): { isValid: boolean; firstError?: string } => {
    const newErrors: Record<string, string> = {};
    
    // 1. DYNAMICALLY find the "Others" ID from the database
    const othersCat = categories.find(c => c.name.toLowerCase() === 'others');
    const OTHERS_CATEGORY_ID = othersCat ? othersCat.category_id.toString() : '6';

    // 2. USE the dynamic ID for validation
    if (!formData.category_id) {
      newErrors.category = 'Category is required — please select one';
    } else if (formData.category_id === OTHERS_CATEGORY_ID && !formData.custom_category?.trim()) {
      newErrors.category = 'Please enter a custom category name';
    }
    
    if (formData.job_ids.length === 0 && !formData.custom_job_title.trim()) {
      newErrors.title = 'Job title is required — select a role or enter a custom title';
    }

    // 3. SKILLS ARE NOW OPTIONAL - no validation needed
    
    if (!formData.description.trim()) {
      newErrors.description = 'Job description is required — describe the responsibilities';
    }
    
    const salaryMin = parseFloat(formData.salary_min);
    if (!formData.salary_min || isNaN(salaryMin)) {
      newErrors.salary = 'Minimum salary is required — enter an amount';
    } else if (salaryMin < 7000) {
      newErrors.salary = 'Salary is below minimum — must be at least ₱7,000 (RA 10361)';
    }
    if (formData.salary_max) {
      const salaryMax = parseFloat(formData.salary_max);
      if (!isNaN(salaryMax) && salaryMax < salaryMin) {
        newErrors.salary_max = 'Maximum must be ≥ minimum salary';
      }
    }
    
    if (!formData.municipality.trim()) {
      newErrors.municipality = 'Location is required — enter a municipality';
    }
    
    setErrors(newErrors);
    const errorList = Object.values(newErrors).filter(Boolean);
    return { isValid: errorList.length === 0, firstError: errorList[0] };
  };

  const reset = () => {
    setFormData(initialFormData);
    setErrors({});
  };

  const populateForm = (data: any) => {
    const parseArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return []; }
      }
      return [];
    };

    setFormData({
      ...initialFormData,
      // Pass IDs as strings for the UI
      category_id: data.category_id ? data.category_id.toString() : '',
      job_ids: parseArray(data.job_ids),
      skill_ids: parseArray(data.skill_ids),
      custom_job_title: data.custom_job_title || '',
      custom_skills: data.custom_skills || '',
      days_off: parseArray(data.days_off),
      
      title: data.title || '',
      description: data.description || '',
      employment_type: data.employment_type || 'Any',
      work_schedule: data.work_schedule || 'Any',
      salary_min: data.salary_min ? data.salary_min.toString() : (data.salary_offered ? data.salary_offered.toString() : ''),
      salary_max: data.salary_max ? data.salary_max.toString() : '',
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
      parent_id: '', 
      
      // Send single IDs
      category_id: formData.category_id,
      job_ids: formData.job_ids,
      skill_ids: formData.skill_ids,
      days_off: formData.days_off,
      
      custom_category: formData.custom_category || null,
      custom_job_title: formData.custom_job_title || null,
      custom_skills: formData.custom_skills || null,
      title: formData.title.trim() || null,
      description: formData.description.trim(),
      
      employment_type: formData.employment_type,
      work_schedule: formData.work_schedule,
      salary_min: parseFloat(formData.salary_min),
      salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
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

  return { formData, errors, updateField, updateFields, validate, reset, getSubmissionData, populateForm, generateDescription };
}