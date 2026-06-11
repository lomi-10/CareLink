// components/parent/jobs/JobPostModal.tsx
import API_URL from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';

// Custom Components
import { LoadingSpinner, NotificationModal } from '@/components/shared';
import { PendingBanner } from '../verification/PendingBanner';
import { AgeRangeSelector } from './AgeRangeSelector';
import { BenefitsCard } from './BenefitsCard';
import { CategorySelector } from './CategorySelector';
import { DescriptionInput } from './DescriptionInput';
import { ExperienceSelector } from './ExperienceSelector';
import { JobTitleInput } from './JobTitleInput';
import { LocationSelector } from './LocationSelector';
import { PreferencesCard } from './PreferencesCard';
import { SalaryInputCard } from './SalaryInputCard';
import { SkillsSelector } from './SkillsSelector';
import { TrustBanner } from './TrustBanner';
import { WorkArrangementCard } from './WorkArrangementCard';
import { BROWN, CARAMEL, ICON_BG, DARK, MUTED, DIVIDER, GREEN, SUCCESS_BG, CREAM, SURFACE } from '../home/parentWarmTheme';

// Hooks
import { useJobForm } from '@/hooks/parent';
import { useUserVerification } from '@/hooks/peso';
import { useJobReferences } from '@/hooks/shared';

// Display-only label overrides — underlying value/state is unchanged
const DISPLAY_LABELS: Record<string, string> = {
  Any: 'Either',
};

interface JobPostModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
  existingJobData?: any;
}

export function JobPostModal({
  visible,
  onClose,
  onSaveSuccess,
  existingJobData
}: JobPostModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [currentStep, setCurrentStep] = useState(1);
  const [modalStep, setModalStep] = useState(1); // 1: Job Setup, 2: Work Details, 3: Requirements, 4: Review

  // Estimated Matches (Review step)
  const [matchEstimate, setMatchEstimate] = useState<{ available: number | null; highlyCompatible: number | null }>({ available: null, highlyCompatible: null });
  const [matchLoading, setMatchLoading] = useState(false);

  // Verification Hook
  const { verification } = useUserVerification();
  const isPending = verification.status === 'Pending';
  const isDisabled = isPending || submitting;

  // Reference Data Hook
  const { categories, jobs, skills, languages, religions, loading: referencesLoading } = useJobReferences();

  // Form Hook
  const {
    formData,
    errors,
    updateField,
    updateFields,
    validate,
    reset,
    populateForm,
    getSubmissionData,
    generateDescription
  } = useJobForm();

  const isDesktop = Platform.OS === 'web';

  // Initialize form if editing, and always start on step 1 when (re)opened
  useEffect(() => {
    if (existingJobData && visible) {
      populateForm(existingJobData);
      setModalStep(1);
    } else if (!existingJobData && visible) {
      reset();
      setCurrentStep(1);
      setModalStep(1);
    }
  }, [existingJobData, visible]);

  // ==========================================
  // LOGIC HELPERS
  // ==========================================
  const othersCat = useMemo(() =>
    categories.find(c => c.name.toLowerCase() === 'others'),
  [categories]);

  const isOthersSelected = useMemo(() =>
    othersCat ? formData.category_id === othersCat.category_id.toString() : false
  , [othersCat, formData.category_id]);

  const availableJobs = useMemo(() => {
    if (!formData.category_id) return [];
    return jobs.filter((job: any) => job.category_id?.toString() === formData.category_id);
  }, [jobs, formData.category_id]);

  const availableSkills = useMemo(() => {
    if (!formData.job_ids || formData.job_ids.length === 0) return [];
    return skills.filter((skill: any) => formData.job_ids.includes(skill.job_id?.toString()));
  }, [skills, formData.job_ids]);

  const selectedCategory = useMemo(() =>
    categories.find(c => c.category_id.toString() === formData.category_id),
  [categories, formData.category_id]);

  const selectedLanguageName = useMemo(() =>
    languages.find(l => l.language_id.toString() === formData.preferred_language_id)?.language_name,
  [languages, formData.preferred_language_id]);

  // ==========================================
  // STEP VALIDATION
  // ==========================================
  const validateStep1 = (): { isValid: boolean; error?: string } => {
    if (!formData.category_id) {
      return { isValid: false, error: "Please select a category first" };
    }
    if (formData.job_ids.length === 0 && !formData.custom_job_title.trim()) {
      return { isValid: false, error: "Please select a job or enter a custom title" };
    }
    return { isValid: true };
  };

  const validateStep2 = (): { isValid: boolean; error?: string } => {
    if (!formData.description.trim()) {
      return { isValid: false, error: "Please fill in the job description" };
    }
    if (!formData.municipality.trim()) {
      return { isValid: false, error: "Please select a municipality" };
    }
    const salaryMin = parseFloat(formData.salary_min);
    if (!formData.salary_min || isNaN(salaryMin)) {
      return { isValid: false, error: "Please enter the minimum salary" };
    }
    if (salaryMin < 7000) {
      return { isValid: false, error: "Minimum salary must be at least ₱7,000 (RA 10361)" };
    }
    if (formData.salary_max) {
      const salaryMax = parseFloat(formData.salary_max);
      if (!isNaN(salaryMax) && salaryMax < salaryMin) {
        return { isValid: false, error: "Maximum salary must be ≥ minimum salary" };
      }
    }
    return { isValid: true };
  };

  const validateStep3 = (): { isValid: boolean; error?: string } => {
    // Requirements & Benefits are all optional — nothing blocks moving to Review
    return { isValid: true };
  };

  const showStepError = (message: string) => {
    setNotification({ visible: true, message, type: 'error' });
  };

  const jumpToStep = (step: number) => {
    setModalStep(step);
  };

  // ==========================================
  // ESTIMATED MATCHES (Review step)
  // ==========================================
  useEffect(() => {
    if (modalStep !== 4) return;
    let cancelled = false;

    const fetchEstimate = async () => {
      setMatchLoading(true);
      try {
        const response = await fetch(`${API_URL}/parent/estimate_matches.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: formData.category_id,
            job_ids: formData.job_ids,
            province: formData.province,
            municipality: formData.municipality,
            salary_min: formData.salary_min,
            salary_max: formData.salary_max,
            min_experience_years: formData.min_experience_years,
            min_age: formData.min_age,
            max_age: formData.max_age,
            employment_type: formData.employment_type,
            work_schedule: formData.work_schedule,
          }),
        });
        const data = await response.json();
        if (cancelled) return;
        if (data.success && data.data) {
          setMatchEstimate({
            available: data.data.available ?? 0,
            highlyCompatible: data.data.highly_compatible ?? 0,
          });
        } else {
          setMatchEstimate({ available: null, highlyCompatible: null });
        }
      } catch (e) {
        if (!cancelled) setMatchEstimate({ available: null, highlyCompatible: null });
      } finally {
        if (!cancelled) setMatchLoading(false);
      }
    };

    fetchEstimate();
    return () => { cancelled = true; };
  }, [modalStep]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleSelectCategory = (categoryId: string) => {
    if (isDisabled) return;
    updateFields({
      category_id: categoryId,
      job_ids: [],
      skill_ids: [],
      custom_category: '',
      custom_job_title: '',
      title: '',
    });
    if (currentStep === 1) setCurrentStep(2);
  };

  const handleToggleJob = (jobId: string, jobTitle: string) => {
    if (isDisabled) return;
    const currentJobs = formData.job_ids || [];
    const newJobs = currentJobs.includes(jobId)
      ? currentJobs.filter(id => id !== jobId)
      : [...currentJobs, jobId];

    updateFields({
      job_ids: newJobs,
      skill_ids: [],
    });

    if (!formData.custom_job_title) {
      const selectedTitles = jobs
        .filter((j: any) => newJobs.includes(j.job_id.toString()))
        .map((j: any) => j.job_title);
      updateField('title', selectedTitles.join(', '));
    }
    if (currentStep === 2 && newJobs.length > 0) setCurrentStep(3);
  };

  const handleGenerateDescription = () => {
    const selectedCategoryObj = categories.find(c => c.category_id.toString() === formData.category_id);
    const selectedJobObjects = jobs.filter(j => formData.job_ids.includes(j.job_id.toString()));
    const generatedText = generateDescription(selectedCategoryObj || null, selectedJobObjects);
    updateField('description', generatedText);
  };

  const handleToggleSkill = (skillId: string | number) => {
    if (isDisabled) return;
    const idStr = skillId.toString();
    const currentSkills = formData.skill_ids || [];
    const newSkills = currentSkills.includes(idStr)
      ? currentSkills.filter(id => id !== idStr)
      : [...currentSkills, idStr];
    updateField('skill_ids', newSkills);
  };

  const handleSubmit = async () => {
    if (isDisabled) {
      setNotification({ visible: true, message: verification.message, type: 'error' });
      return;
    }

    const { isValid, firstError } = validate(categories);
    if (!isValid) {
      setNotification({ visible: true, message: firstError || 'Please fill in all required fields', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('Session expired. Please log in again.');
      const user = JSON.parse(userData);

      // Others logic: auto-generate custom category name if empty
      let submissionData = { ...getSubmissionData(), parent_id: user.user_id };
      if (formData.category_id === othersCat?.category_id.toString() && !formData.custom_category) {
        submissionData.custom_category = "Specialized Work";
      }

      const endpoint = existingJobData ? '/parent/edit_job.php' : '/parent/post_job.php';
      if (existingJobData) {
        (submissionData as any).job_post_id = existingJobData.job_post_id;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ visible: true, message: 'Job posting successful!', type: 'success' });
        setTimeout(() => {
          setNotification({ ...notification, visible: false });
          reset();
          onClose();
          if (onSaveSuccess) onSaveSuccess();
        }, 1500);
      } else {
        throw new Error(data.message || 'Failed to save job');
      }
    } catch (error: any) {
      setNotification({ visible: true, message: error.message || 'Connection error.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // RENDER: STEP INDICATOR
  // ==========================================
  const renderStepIndicator = () => (
    <View style={styles.modalStepIndicator}>
      {[
        { step: 1, label: 'Job Setup', icon: 'briefcase-outline' },
        { step: 2, label: 'Work Details', icon: 'list-outline' },
        { step: 3, label: 'Requirements', icon: 'options-outline' },
        { step: 4, label: 'Review', icon: 'checkmark-done-outline' },
      ].map((item) => (
        <React.Fragment key={item.step}>
          <View style={styles.stepWrapper}>
            <View style={[styles.stepCircle, modalStep >= item.step && styles.stepCircleActive]}>
              <Ionicons
                name={modalStep > item.step ? 'checkmark' : (item.icon as any)}
                size={16}
                color={modalStep >= item.step ? '#fff' : '#9CA3AF'}
              />
            </View>
            <Text style={[styles.stepLabel, modalStep >= item.step && styles.stepLabelActive]}>{item.label}</Text>
          </View>
          {item.step < 4 && <View style={[styles.stepLine, modalStep > item.step && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  // ==========================================
  // RENDER: STEP 1 — JOB SETUP
  // ==========================================
  const renderJobSetupStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionHeader}>Define the Role</Text>

      <View style={styles.selectionStepsContainer}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.miniStep, currentStep >= s && styles.miniStepActive]}>
            <Text style={[styles.miniStepText, currentStep >= s && styles.miniStepTextActive]}>{s}</Text>
          </View>
        ))}
      </View>

      <CategorySelector
        categories={categories}
        selectedCategoryIds={formData.category_id ? [formData.category_id] : []}
        customCategory={formData.custom_category || ''}
        onToggleCategory={handleSelectCategory}
        onCustomCategoryChange={(val) => updateField('custom_category', val)}
        error={errors.category}
        disabled={isDisabled}
      />

      <JobTitleInput
        categoryIds={formData.category_id ? [formData.category_id] : []}
        availableJobs={availableJobs}
        selectedJobIds={formData.job_ids}
        customJobTitle={formData.custom_job_title || ''}
        title={formData.title}
        onToggleJob={handleToggleJob}
        onCustomJobChange={(val) => updateField('custom_job_title', val)}
        onTitleChange={(val) => updateField('title', val)}
        error={errors.title}
        disabled={isDisabled || !formData.category_id}
      />

      <SkillsSelector
        selectedJobIds={formData.job_ids}
        availableSkills={availableSkills}
        selectedSkills={formData.skill_ids}
        customSkills={formData.custom_skills || ''}
        onToggleSkill={handleToggleSkill}
        onCustomSkillsChange={(val) => updateField('custom_skills', val)}
        disabled={isDisabled || (availableJobs.length > 0 && formData.job_ids.length === 0)}
      />

      <TrustBanner />
    </View>
  );

  // ==========================================
  // RENDER: STEP 2 — WORK DETAILS
  // ==========================================
  const renderWorkDetailsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionHeader}>Work Details & Location</Text>

      <DescriptionInput
        value={formData.description}
        onChange={(val) => updateField('description', val)}
        onGenerateDescription={handleGenerateDescription}
        error={errors.description}
        disabled={isDisabled}
      />

      <LocationSelector
        province={formData.province}
        municipality={formData.municipality}
        barangay={formData.barangay}
        onProvinceChange={(val) => updateField('province', val)}
        onMunicipalityChange={(val) => updateField('municipality', val)}
        onBarangayChange={(val) => updateField('barangay', val)}
        onLatitudeChange={(val) => updateField('latitude', val)}
        onLongitudeChange={(val) => updateField('longitude', val)}
        disabled={isDisabled}
      />

      <WorkArrangementCard
        employmentType={formData.employment_type}
        workSchedule={formData.work_schedule}
        onEmploymentTypeChange={(type) => updateField('employment_type', type)}
        onWorkScheduleChange={(sched) => updateField('work_schedule', sched)}
        disabled={isDisabled}
      />

      <SalaryInputCard
        salaryMin={formData.salary_min}
        salaryMax={formData.salary_max}
        salaryPeriod={formData.salary_period}
        onSalaryMinChange={(val) => updateField('salary_min', val)}
        onSalaryMaxChange={(val) => updateField('salary_max', val)}
        onPeriodChange={(period) => updateField('salary_period', period)}
        categoryIds={formData.category_id ? [formData.category_id] : []}
        error={errors.salary}
        errorMax={errors.salary_max}
        disabled={isDisabled}
      />

      <TrustBanner />
    </View>
  );

  // ==========================================
  // RENDER: STEP 3 — REQUIREMENTS
  // ==========================================
  const renderRequirementsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionHeader}>Requirements & Benefits</Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <AgeRangeSelector minAge={formData.min_age} maxAge={formData.max_age} onMinAgeChange={(val) => updateField('min_age', val)} onMaxAgeChange={(val) => updateField('max_age', val)} disabled={isDisabled} />
        </View>
        <View style={{ width: 16 }} />
        <View style={{ flex: 1 }}>
          <ExperienceSelector minExperience={formData.min_experience_years} onExperienceChange={(val) => updateField('min_experience_years', val)} disabled={isDisabled} />
        </View>
      </View>

      <BenefitsCard
        providesMeals={formData.provides_meals}
        providesAccommodation={formData.provides_accommodation}
        providesSSS={formData.provides_sss}
        providesPhilHealth={formData.provides_philhealth}
        providesPagIbig={formData.provides_pagibig}
        onMealsToggle={() => updateField('provides_meals', !formData.provides_meals)}
        onAccommodationToggle={() => updateField('provides_accommodation', !formData.provides_accommodation)}
        onSSSToggle={() => updateField('provides_sss', !formData.provides_sss)}
        onPhilHealthToggle={() => updateField('provides_philhealth', !formData.provides_philhealth)}
        onPagIbigToggle={() => updateField('provides_pagibig', !formData.provides_pagibig)}
        disabled={isDisabled}
      />

      <PreferencesCard
        religions={religions}
        languages={languages}
        selectedReligion={formData.preferred_religion}
        selectedLanguageId={formData.preferred_language_id}
        onReligionChange={(religion: string) => updateField('preferred_religion', religion)}
        onLanguageChange={(langId: string) => updateField('preferred_language_id', langId)}
        requirePoliceClearance={formData.require_police_clearance}
        preferTesdaNc2={formData.prefer_tesda_nc2}
        onPoliceClearanceChange={(val) => updateField('require_police_clearance', val)}
        onTesdaNc2Change={(val) => updateField('prefer_tesda_nc2', val)}
        disabled={isDisabled}
      />

      <TrustBanner />
    </View>
  );

  // ==========================================
  // RENDER: STEP 4 — REVIEW & PUBLISH
  // ==========================================
  const ReviewCard = ({
    title,
    icon,
    onEdit,
    children,
  }: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    onEdit: () => void;
    children: React.ReactNode;
  }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewCardHeader}>
        <View style={styles.reviewCardTitleRow}>
          <Ionicons name={icon} size={18} color={BROWN} />
          <Text style={styles.reviewCardTitle}>{title}</Text>
        </View>
        <TouchableOpacity style={styles.reviewEditButton} onPress={onEdit} activeOpacity={0.7}>
          <Ionicons name="pencil" size={13} color={BROWN} />
          <Text style={styles.reviewEditText}>Edit</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );

  const renderReviewStep = () => {
    const jobTitleDisplay = formData.title?.trim() || 'Untitled Job';
    const categoryDisplay = isOthersSelected
      ? (formData.custom_category || 'Custom Category')
      : (selectedCategory?.name || '—');
    const employmentDisplay = DISPLAY_LABELS[formData.employment_type] ?? formData.employment_type;
    const scheduleDisplay = DISPLAY_LABELS[formData.work_schedule] ?? formData.work_schedule;

    const salaryMinNum = parseFloat(formData.salary_min);
    const salaryMaxNum = formData.salary_max ? parseFloat(formData.salary_max) : null;
    const salaryDisplay = !isNaN(salaryMinNum)
      ? `₱${salaryMinNum.toLocaleString()}${salaryMaxNum ? ` - ₱${salaryMaxNum.toLocaleString()}` : ''} / ${formData.salary_period}`
      : '—';

    const locationDisplay = [formData.barangay, formData.municipality, formData.province].filter(Boolean).join(', ') || '—';

    const requirementItems: string[] = [];
    if (formData.min_experience_years > 0) requirementItems.push(`${formData.min_experience_years}+ years of experience`);
    if (formData.min_age !== 18 || formData.max_age !== 65) requirementItems.push(`Preferred age: ${formData.min_age} - ${formData.max_age} years old`);
    if (formData.preferred_religion) requirementItems.push(`Religion: ${formData.preferred_religion}`);
    if (formData.preferred_language_id && selectedLanguageName) requirementItems.push(`Language: ${selectedLanguageName}`);
    if (formData.require_police_clearance) requirementItems.push('Police Clearance required');
    if (formData.prefer_tesda_nc2) requirementItems.push('TESDA NC2 Certificate preferred');

    const benefitItems: string[] = [];
    if (formData.provides_meals) benefitItems.push('Free Meals');
    if (formData.provides_accommodation) benefitItems.push('Free Accommodation');
    if (formData.provides_sss) benefitItems.push('SSS');
    if (formData.provides_philhealth) benefitItems.push('PhilHealth');
    if (formData.provides_pagibig) benefitItems.push('Pag-IBIG');

    return (
      <View style={styles.stepContent}>
        <Text style={styles.sectionHeader}>Review & Publish</Text>
        <Text style={styles.sectionSubheader}>Double-check the details below before posting your job.</Text>

        <ReviewCard title="Job Summary" icon="briefcase-outline" onEdit={() => jumpToStep(1)}>
          <Text style={styles.reviewJobTitle}>{jobTitleDisplay}</Text>
          <Text style={styles.reviewSubtitle}>{categoryDisplay}</Text>
          <View style={styles.reviewRow}>
            <Ionicons name="people-outline" size={14} color={MUTED} />
            <Text style={styles.reviewRowText}>{employmentDisplay} · {scheduleDisplay}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Ionicons name="cash-outline" size={14} color={MUTED} />
            <Text style={styles.reviewRowText}>{salaryDisplay}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Ionicons name="location-outline" size={14} color={MUTED} />
            <Text style={styles.reviewRowText}>{locationDisplay}</Text>
          </View>
        </ReviewCard>

        <ReviewCard title="Job Description" icon="document-text-outline" onEdit={() => jumpToStep(2)}>
          <Text style={styles.reviewDescription}>{formData.description?.trim() || 'No description provided.'}</Text>
        </ReviewCard>

        <ReviewCard title="Requirements" icon="checkmark-circle-outline" onEdit={() => jumpToStep(3)}>
          {requirementItems.length > 0 ? (
            requirementItems.map((item, idx) => (
              <View key={idx} style={styles.reviewBulletRow}>
                <View style={styles.reviewBullet} />
                <Text style={styles.reviewBulletText}>{item}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.reviewEmptyText}>No specific requirements — open to all qualified helpers.</Text>
          )}
        </ReviewCard>

        <ReviewCard title="Benefits & Perks" icon="gift-outline" onEdit={() => jumpToStep(3)}>
          {benefitItems.length > 0 ? (
            benefitItems.map((item, idx) => (
              <View key={idx} style={styles.reviewBulletRow}>
                <View style={styles.reviewBullet} />
                <Text style={styles.reviewBulletText}>{item}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.reviewEmptyText}>No additional benefits specified.</Text>
          )}
        </ReviewCard>

        {/* Estimated Matches */}
        <View style={styles.matchesCard}>
          <View style={styles.reviewCardTitleRow}>
            <Ionicons name="people-circle-outline" size={20} color={BROWN} />
            <Text style={styles.reviewCardTitle}>Estimated Matches</Text>
          </View>
          <Text style={styles.matchesHint}>Based on verified helpers in your area matching this job.</Text>

          <View style={styles.matchesRow}>
            <View style={styles.matchStatBox}>
              <View style={styles.avatarStack}>
                {[0, 1, 2].map((i) => (
                  <Ionicons key={i} name="person-circle" size={28} color={CARAMEL} style={[styles.avatarIcon, i > 0 && { marginLeft: -10 }]} />
                ))}
              </View>
              {matchLoading ? (
                <ActivityIndicator size="small" color={BROWN} style={styles.matchStatSpinner} />
              ) : (
                <Text style={styles.matchStatNumber}>{matchEstimate.available ?? '—'}</Text>
              )}
              <Text style={styles.matchStatLabel}>Helpers available</Text>
            </View>

            <View style={[styles.matchStatBox, styles.matchStatBoxGreen]}>
              <View style={styles.avatarStack}>
                {[0, 1, 2].map((i) => (
                  <Ionicons key={i} name="person-circle" size={28} color={GREEN} style={[styles.avatarIcon, i > 0 && { marginLeft: -10 }]} />
                ))}
              </View>
              {matchLoading ? (
                <ActivityIndicator size="small" color={GREEN} style={styles.matchStatSpinner} />
              ) : (
                <Text style={[styles.matchStatNumber, { color: GREEN }]}>{matchEstimate.highlyCompatible ?? '—'}</Text>
              )}
              <Text style={styles.matchStatLabel}>Highly compatible</Text>
            </View>
          </View>
        </View>

        <TrustBanner />
      </View>
    );
  };

  // ==========================================
  // FOOTER NAVIGATION
  // ==========================================
  const NEXT_LABELS: Record<number, string> = {
    1: 'Next: Work Details',
    2: 'Next: Requirements',
    3: 'Next: Review',
  };

  const handleNext = () => {
    if (modalStep === 1) {
      const result = validateStep1();
      if (!result.isValid && result.error) return showStepError(result.error);
    } else if (modalStep === 2) {
      const result = validateStep2();
      if (!result.isValid && result.error) return showStepError(result.error);
    } else if (modalStep === 3) {
      const result = validateStep3();
      if (!result.isValid && result.error) return showStepError(result.error);
    }
    setModalStep(prev => prev + 1);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.modalContainer, isDesktop && styles.modalContainerDesktop]}>

          <LoadingSpinner visible={submitting || referencesLoading} message="Processing..." />
          <NotificationModal
            visible={notification.visible}
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification({ ...notification, visible: false })}
          />

          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{existingJobData ? 'Update Job' : 'Create Job Post'}</Text>
              <Text style={styles.headerSubtitle}>Provide details to find the best helper</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color={DARK} />
            </TouchableOpacity>
          </View>

          {isPending && <PendingBanner status="Pending" message="Verification required to post new jobs." />}

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={isDesktop}
            keyboardShouldPersistTaps="handled"
          >
            {renderStepIndicator()}

            <View style={styles.formContainer}>
              {modalStep === 1 && renderJobSetupStep()}
              {modalStep === 2 && renderWorkDetailsStep()}
              {modalStep === 3 && renderRequirementsStep()}
              {modalStep === 4 && renderReviewStep()}

              <View style={styles.footerActions}>
                <View style={styles.navButtonsRow}>
                  {modalStep > 1 && (
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => setModalStep(prev => prev - 1)}
                    >
                      <Ionicons name="arrow-back" size={20} color={MUTED} />
                      <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                  )}

                  {modalStep < 4 ? (
                    <TouchableOpacity
                      style={styles.nextButton}
                      onPress={handleNext}
                    >
                      <Text style={styles.nextButtonText}>{NEXT_LABELS[modalStep]}</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.submitButton, (submitting || isDisabled) && styles.submitButtonDisabled]}
                      onPress={handleSubmit}
                      disabled={submitting || isDisabled}
                    >
                      {submitting ? <ActivityIndicator color="#fff" /> : (
                        <>
                          <Ionicons name="rocket" size={20} color="#fff" />
                          <Text style={styles.submitButtonText}>
                            {isDisabled ? 'Verify First' : existingJobData ? 'Update Job' : 'Post Job'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {modalStep === 1 && (
                  <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelButtonText}>Discard Post</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    ...Platform.select({
      web: { justifyContent: 'center', padding: 16 },
      default: { justifyContent: 'flex-end' },
    }),
  },
  modalContainer: { backgroundColor: SURFACE, borderTopLeftRadius: 30, borderTopRightRadius: 30, width: '100%', height: '95%', overflow: 'hidden' },
  modalContainerDesktop: { width: '85%', maxWidth: 900, height: '90%', borderRadius: 24, marginBottom: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: DARK },
  headerSubtitle: { fontSize: 14, color: MUTED, marginTop: 2 },
  closeButton: { padding: 4 },
  scrollContent: { paddingBottom: 60 },
  formContainer: { paddingHorizontal: 24, paddingVertical: 12 },

  sectionHeader: { fontSize: 20, fontWeight: '800', color: DARK, marginBottom: 8 },
  sectionSubheader: { fontSize: 14, color: MUTED, marginBottom: 24 },
  divider: { height: 1, backgroundColor: DIVIDER, marginVertical: 32 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },

  // Step Indicator (4-step)
  modalStepIndicator: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginVertical: 24, paddingHorizontal: 12 },
  stepWrapper: { alignItems: 'center', gap: 6, width: 76 },
  stepCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: DIVIDER },
  stepCircleActive: { backgroundColor: BROWN, borderColor: BROWN },
  stepLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textAlign: 'center' },
  stepLabelActive: { color: BROWN },
  stepLine: { flex: 1, height: 2, backgroundColor: DIVIDER, marginHorizontal: 4, marginTop: 17 },
  stepLineActive: { backgroundColor: BROWN },

  // Job Setup Mini-Steps (1-2-3 indicator)
  selectionStepsContainer: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  miniStep: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  miniStepActive: { backgroundColor: ICON_BG },
  miniStepText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  miniStepTextActive: { color: BROWN },

  stepContent: { animationDuration: '0.3s' },

  footerActions: { marginTop: 40, borderTopWidth: 1, borderTopColor: DIVIDER, paddingTop: 24 },
  navButtonsRow: { flexDirection: 'row', gap: 12 },
  nextButton: { flex: 2, backgroundColor: BROWN, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backButton: { flex: 1, backgroundColor: '#F3F4F6', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  backButtonText: { color: MUTED, fontSize: 16, fontWeight: '600' },
  submitButton: { flex: 2, backgroundColor: BROWN, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitButtonDisabled: { backgroundColor: '#D1D5DB' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  cancelButtonText: { color: '#9CA3AF', fontSize: 15, fontWeight: '600' },

  errorText: { color: '#EF4444', fontSize: 13, marginTop: -12, marginBottom: 16, fontWeight: '500' },

  // Review Step — summary cards
  reviewCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: DIVIDER },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  reviewCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewCardTitle: { fontSize: 15, fontWeight: '700', color: DARK },
  reviewEditButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: CARAMEL, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  reviewEditText: { fontSize: 12, fontWeight: '700', color: BROWN },
  reviewJobTitle: { fontSize: 17, fontWeight: '700', color: DARK, marginBottom: 2 },
  reviewSubtitle: { fontSize: 13, color: MUTED, marginBottom: 10 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  reviewRowText: { fontSize: 13, color: DARK, flex: 1 },
  reviewDescription: { fontSize: 14, color: DARK, lineHeight: 20 },
  reviewBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 6 },
  reviewBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: CARAMEL, marginTop: 6 },
  reviewBulletText: { fontSize: 14, color: DARK, flex: 1 },
  reviewEmptyText: { fontSize: 13, color: MUTED, fontStyle: 'italic' },

  // Estimated Matches
  matchesCard: { backgroundColor: CREAM, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: DIVIDER },
  matchesHint: { fontSize: 12, color: MUTED, marginTop: 4, marginBottom: 16 },
  matchesRow: { flexDirection: 'row', gap: 12 },
  matchStatBox: { flex: 1, backgroundColor: SURFACE, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: DIVIDER },
  matchStatBoxGreen: { borderColor: SUCCESS_BG, backgroundColor: SUCCESS_BG },
  avatarStack: { flexDirection: 'row', marginBottom: 8 },
  avatarIcon: { backgroundColor: SURFACE, borderRadius: 14 },
  matchStatNumber: { fontSize: 24, fontWeight: '800', color: BROWN, marginBottom: 4 },
  matchStatSpinner: { marginBottom: 8 },
  matchStatLabel: { fontSize: 12, color: MUTED, fontWeight: '600', textAlign: 'center' },
});
