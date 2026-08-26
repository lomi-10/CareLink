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

  // RA 10361 scope. The statute covers domestic work done on an occupational
  // basis and excludes work done "only occasionally or sporadically". A
  // one-time task falls outside CareLink entirely — see backend/parent/post_job.php.
  engagement_type: 'recurring' | 'one_time' | '';
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
  /** "Applications close on" date, YYYY-MM-DD. Empty = never expires. */
  expires_at: string;
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

// Extra household/job context used to make each generated description specific
// to THIS post (location, pay, arrangement, benefits…) rather than a generic,
// identical template. All optional — lines only appear when there's data.
export interface DescriptionContext {
  municipality?: string;
  barangay?: string;
  employmentType?: string;   // Stay-in / Stay-out / Any
  workSchedule?: string;     // Full-time / Part-time / Any
  salaryMin?: string | number;
  salaryMax?: string | number;
  salaryPeriod?: string;
  daysOff?: string[];
  minExperienceYears?: number;
  startDate?: string;
  contractDuration?: string;
  providesMeals?: boolean;
  providesAccommodation?: boolean;
  providesSss?: boolean;
  providesPhilhealth?: boolean;
  providesPagibig?: boolean;
  benefits?: string;
  customSkills?: string;
}

// Stable string hash → non-negative int, for deterministic variant selection.
const descSeed = (s: string): number => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
};
// Math.abs is load-bearing. descSeed returns an unsigned 32-bit value, but the
// callers derive variants with `seed >> 3` / `>> 5`, and `>>` is a SIGNED shift —
// any seed above 2^31 comes back negative, making `seed % len` negative and
// `arr[-n]` undefined. That put the literal string "undefined" into roughly half
// of all generated descriptions.
const descPick = <T,>(arr: T[], seed: number): T => arr[Math.abs(seed) % arr.length];

// Per-category tone + the "Responsibilities / Requirements" body.
const CATEGORY_COPY: Record<string, { adj: string; verb: string; body: string }> = {
  '1': {
    adj: 'reliable', verb: 'to help keep our home clean and running smoothly',
    body: `Responsibilities include:
• General cleaning and maintaining a tidy home
• Laundry and ironing clothes
• Cooking meals for the family
• Running errands (grocery shopping, paying bills)
• Assisting with childcare (if applicable)

Requirements:
• Honest, hardworking, and trustworthy
• Good communication skills
• Previous household experience is a plus
• Willing to learn and follow instructions`,
  },
  '2': {
    adj: 'loving and responsible', verb: 'to care for our children',
    body: `Responsibilities include:
• Supervise and care for our children at all times
• Prepare nutritious meals and snacks for the kids
• Help with homework and educational activities
• Play and engage children in fun, safe activities
• Ensure the children's safety and well-being

Requirements:
• Patient, caring, and energetic
• Loves working with children
• Previous childcare experience is a plus
• First aid knowledge is an advantage`,
  },
  '3': {
    adj: 'skilled', verb: 'to prepare delicious meals for our family',
    body: `Responsibilities include:
• Plan and prepare nutritious, tasty meals for the family
• Manage kitchen inventory and grocery shopping for ingredients
• Maintain a clean and organized kitchen
• Follow family dietary preferences and restrictions

Requirements:
• Passionate about cooking
• Experience in home cooking is preferred
• Knowledgeable about food safety and hygiene
• Creative and willing to try new recipes`,
  },
  '4': {
    adj: 'dedicated', verb: 'to take care of our garden and outdoor spaces',
    body: `Responsibilities include:
• Planting, watering, and maintaining plants and flowers
• Mowing the lawn and trimming hedges
• Keeping the garden clean and free of debris
• Assisting with outdoor maintenance tasks

Requirements:
• Enjoys working with plants and outdoors
• Basic gardening knowledge is a plus
• Physically fit and able to do manual work
• Reliable and hardworking`,
  },
  '5': {
    adj: 'careful and reliable', verb: 'to handle our family\'s laundry',
    body: `Responsibilities include:
• Washing, drying, and ironing clothes
• Properly sorting clothes by color and fabric type
• Folding and organizing clean laundry
• Following care instructions for delicate items

Requirements:
• Detail-oriented and careful with clothes
• Previous laundry experience is preferred
• Knowledgeable about different fabric care
• Reliable and consistent`,
  },
};

// Build the "About this role" detail lines from the actual form data.
const buildDetailLines = (ctx: DescriptionContext): string[] => {
  const lines: string[] = [];
  const place = [ctx.barangay, ctx.municipality].filter(Boolean).join(', ');

  const arrangement = [
    ctx.employmentType && ctx.employmentType !== 'Any' ? ctx.employmentType : '',
    ctx.workSchedule && ctx.workSchedule !== 'Any' ? ctx.workSchedule.toLowerCase() : '',
  ].filter(Boolean).join(', ');
  if (arrangement) lines.push(`• Arrangement: ${arrangement}`);
  if (place) lines.push(`• Location: ${place}`);

  const min = Number(ctx.salaryMin) || 0;
  const max = Number(ctx.salaryMax) || 0;
  const per = (ctx.salaryPeriod || 'Monthly').toLowerCase();
  if (min > 0 || max > 0) {
    const range = min > 0 && max > 0 && max !== min
      ? `₱${min.toLocaleString()}–₱${max.toLocaleString()}`
      : `₱${(max || min).toLocaleString()}`;
    lines.push(`• Salary: ${range} per ${per.replace(/ly$/, per === 'daily' ? 'day' : per === 'weekly' ? 'week' : 'month')}`);
  }
  if (ctx.daysOff && ctx.daysOff.length) lines.push(`• Rest day(s): ${ctx.daysOff.join(', ')}`);
  if (ctx.minExperienceYears && ctx.minExperienceYears > 0) lines.push(`• Experience: at least ${ctx.minExperienceYears} year${ctx.minExperienceYears === 1 ? '' : 's'} preferred`);
  if (ctx.startDate) lines.push(`• Preferred start: ${ctx.startDate}`);
  if (ctx.contractDuration) lines.push(`• Contract: ${ctx.contractDuration}`);

  const perks = [
    ctx.providesMeals && 'meals provided',
    ctx.providesAccommodation && 'accommodation provided',
    ctx.providesSss && 'SSS',
    ctx.providesPhilhealth && 'PhilHealth',
    ctx.providesPagibig && 'Pag-IBIG',
  ].filter(Boolean) as string[];
  if (perks.length) lines.push(`• We provide: ${perks.join(', ')}`);
  if (ctx.benefits && ctx.benefits.trim()) lines.push(`• Other benefits: ${ctx.benefits.trim()}`);

  return lines;
};

/** Max times a parent may press Generate for one job post. */
export const MAX_DESCRIPTION_GENERATIONS = 3;

const generateDescription = (
  category: Category | null,
  jobs: Job[],
  ctx: DescriptionContext = {},
  /** Identity of THIS employer + press count — see the seed note below. */
  variant = '',
): string => {
  const jobTitles = jobs.map(j => j.job_title).join(', ') || 'helper';
  const categoryName = category?.name || 'general household';
  const catId = category?.category_id?.toString() ?? '';
  const copy = CATEGORY_COPY[catId] ?? {
    adj: 'reliable', verb: 'to help around our home',
    body: `Responsibilities include:
• ${categoryName} related tasks
• Maintaining a clean and organized home
• Following family instructions carefully
• Other duties as assigned

Requirements:
• Honest and hardworking
• Good communication skills
• Willing to learn
• Previous experience is a plus`,
  };

  // Deterministic-but-varied phrasing: same job is stable, different jobs differ.
  // `variant` carries the employer's own identity and how many times they've
  // pressed Generate. Without it the seed was only category + city + salary, so
  // two families hiring the same role in the same town produced word-for-word
  // identical posts — the same flaw the cover letters had.
  const seed = descSeed(
    `${variant}|${jobTitles}|${catId}|${ctx.municipality ?? ''}|${ctx.barangay ?? ''}|${ctx.salaryMin ?? ''}|${ctx.employmentType ?? ''}`,
  );

  // Each part is picked with a differently-shifted seed, so the openings,
  // closings and headers vary independently rather than moving in lockstep.
  // 10 x 10 x 6 = 600 shells per category before the household's own details
  // (location, pay, rest days, benefits) are woven in.
  const intro = descPick([
    `We are looking for a ${copy.adj} ${jobTitles} ${copy.verb}.`,
    `Our family is searching for a ${copy.adj} ${jobTitles} ${copy.verb}.`,
    `We'd love to welcome a ${copy.adj} ${jobTitles} into our home ${copy.verb}.`,
    `Our household needs a ${copy.adj} ${jobTitles} ${copy.verb}.`,
    `We're hoping to find a ${copy.adj} ${jobTitles} ${copy.verb}.`,
    `Join our family as a ${copy.adj} ${jobTitles} — we need someone ${copy.verb}.`,
    `We have an opening for a ${copy.adj} ${jobTitles} ${copy.verb}.`,
    `Looking to hire a ${copy.adj} ${jobTitles} ${copy.verb}.`,
    `A ${copy.adj} ${jobTitles} is exactly who our home needs ${copy.verb}.`,
    `We are a family in need of a ${copy.adj} ${jobTitles} ${copy.verb}.`,
  ], seed);

  const closing = descPick([
    `We offer a friendly, respectful home and fair, on-time pay. We look forward to welcoming you to our family!`,
    `You'll be part of a warm, respectful household that values your work. We can't wait to hear from you!`,
    `We treat our helpers with fairness and respect. If this sounds like you, we'd be glad to meet you!`,
    `We believe in treating household help like family. Salary is always paid on time, and your rest days are yours.`,
    `Ours is a calm, orderly home and we're easy to work with. We'd be happy to talk if this feels like a fit.`,
    `If you're honest, dependable and take pride in your work, we'd love to hear from you.`,
    `We value long-term working relationships and treat our helpers well. Please reach out if you're interested.`,
    `You'd be joining a household that respects your time and pays fairly. We hope to hear from you soon.`,
    `We're looking for someone we can trust and keep for the long term. Message us if that sounds like you.`,
    `Kind, fair employers looking for the same in a helper. We'd be glad to meet you.`,
  ], seed >> 3);

  const detailLines = buildDetailLines(ctx);
  const detailBlock = detailLines.length
    ? `\n\n${descPick([
        'About this role:',
        'A few details about this role:',
        'Here are the details:',
        'What we are offering:',
        'The arrangement:',
        'Details of the position:',
      ], seed >> 5)}\n${detailLines.join('\n')}`
    : '';

  return `${intro}\n\n${copy.body}${detailBlock}\n\n${closing}`;
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
  engagement_type: '',
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
  expires_at: '',
  benefits: '',
  provides_meals: false,
  provides_accommodation: false,
  // Government contributions are legally required under RA 10361 once the wage
  // qualifies (CareLink's minimum salary is above that threshold), so they
  // default to true and can't be turned off in the form.
  provides_sss: true,
  provides_philhealth: true,
  provides_pagibig: true,
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
  /** Generate presses used on this post — capped, so it can't be spammed. */
  const [descGenCount, setDescGenCount] = useState(0);

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
    
    // RA 10361 scope, checked before anything else. A one-time task is not
    // household employment under the statute, so there is nothing to validate
    // past this point — the post cannot exist at all.
    if (!formData.engagement_type) {
      newErrors.engagement_type = 'Tell us what kind of engagement this is';
    } else if (formData.engagement_type === 'one_time') {
      newErrors.engagement_type =
        'CareLink currently supports recurring household employment covered by the Batas Kasambahay (RA 10361). '
        + 'One-time or occasional tasks fall outside that coverage and cannot be posted here.';
    }

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
    // Description is optional too — CareLink auto-writes one from the role if left blank.

    const salaryMin = parseFloat(formData.salary_min);
    if (!formData.salary_min || isNaN(salaryMin)) {
      newErrors.salary = 'Minimum salary is required — enter an amount';
    } else if (salaryMin < 7000) {
      newErrors.salary = 'CareLink’s minimum is ₱7,000 / month (set above the legal minimum for fair pay)';
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

    if (formData.expires_at) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const deadline = new Date(formData.expires_at + 'T00:00:00');
      if (deadline < today) {
        newErrors.expires_at = 'Application deadline cannot be in the past';
      }
    }

    setErrors(newErrors);
    const errorList = Object.values(newErrors).filter(Boolean);
    return { isValid: errorList.length === 0, firstError: errorList[0] };
  };

  const reset = () => {
    setFormData(initialFormData);
    setDescGenCount(0); // a new post gets a fresh allowance
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
      expires_at: data.expires_at ? String(data.expires_at).slice(0, 10) : '',
      benefits: data.benefits || '',
      provides_meals: !!data.provides_meals,
      provides_accommodation: !!data.provides_accommodation,
      // Always required (RA 10361) — force on even for older posts that saved them off.
      provides_sss: true,
      provides_philhealth: true,
      provides_pagibig: true,
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
      
      engagement_type: formData.engagement_type,
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
      expires_at: formData.expires_at || null,
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

  // Personalise the generated description with THIS post's actual details, so two
  // parents posting the same category get specific, non-identical descriptions.
  // `employerKey` is the household's own identity (set by the screen from the
  // signed-in account) and `descGenCount` is how many times Generate has been
  // pressed — together they make one employer's drafts unlike anyone else's, and
  // unlike their own previous press.
  const generateDescriptionWithContext = (category: Category | null, jobs: Job[], employerKey = '') =>
    generateDescription(category, jobs, {
      municipality: formData.municipality,
      barangay: formData.barangay,
      employmentType: formData.employment_type,
      workSchedule: formData.work_schedule,
      salaryMin: formData.salary_min,
      salaryMax: formData.salary_max,
      salaryPeriod: formData.salary_period,
      daysOff: formData.days_off,
      minExperienceYears: formData.min_experience_years,
      startDate: formData.start_date,
      contractDuration: formData.contract_duration,
      providesMeals: formData.provides_meals,
      providesAccommodation: formData.provides_accommodation,
      providesSss: formData.provides_sss,
      providesPhilhealth: formData.provides_philhealth,
      providesPagibig: formData.provides_pagibig,
      benefits: formData.benefits,
      customSkills: formData.custom_skills,
    }, `${employerKey}|${descGenCount}`);

  return {
    formData, errors, updateField, updateFields, validate, reset,
    getSubmissionData, populateForm,
    generateDescription: generateDescriptionWithContext,
    descGenCount,
    setDescGenCount,
    descGenerationsLeft: Math.max(0, MAX_DESCRIPTION_GENERATIONS - descGenCount),
  };
}