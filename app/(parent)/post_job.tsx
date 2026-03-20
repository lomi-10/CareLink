// app/(parent)/post_job.tsx
// UPDATED - Multi-select categories/jobs/skills + Centered Desktop Document UI

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform, // <-- ADDED THIS
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

// Custom Hooks
import { useJobForm } from '@/hooks/useJobForm';
import { useJobReferences } from '@/hooks/useJobReferences';
import { useResponsive } from '@/hooks/useResponsive';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';

// Components
import {
  CategorySelector,
  JobTitleInput,
  WorkArrangementCard,
  SalaryInputCard,
  PreferencesCard,
  DescriptionInput,
  SkillsSelector,
  AgeRangeSelector,
  ExperienceSelector,
  WorkScheduleCard,
  ContractDetailsCard,
  BenefitsCard,
  LocationSelector,
} from '@/components/parent/jobs';

// Common Components
import { NotificationModal, LoadingSpinner } from '@/components/common';
import { PendingBanner } from '@/components/parent/verification/PendingBanner';

export default function PostJob() {
  const router = useRouter();
  const { edit_id } = useLocalSearchParams();
  const { isDesktop } = useResponsive();

  // Verification status
  const { verification, isPending } = useVerificationStatus();
  const isDisabled = !verification.canPostJobs;

  // Custom hooks
  const { formData, errors, updateField, updateFields, validate, reset, getSubmissionData, populateForm } = useJobForm();
  const {
    categories,
    jobs,
    skills,
    languages,
    religions,
    loading: referencesLoading,
    getJobsByCategories,
    getSkillsByJobs,
  } = useJobReferences();
  const [loadingEdit, setLoadingEdit] = useState(false);

  // FETCH DATA IF EDITING
  useEffect(() => {
    if (edit_id) {
      fetchJobDetails(edit_id as string);
    }
  }, [edit_id]);

  const fetchJobDetails = async (id: string) => {
    try {
      setLoadingEdit(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) return;
      const user = JSON.parse(userData);

      const response = await fetch(`${API_URL}/parent/get_job_details.php?job_post_id=${id}&parent_id=${user.user_id}`);
      const data = await response.json();
      
      if (data.success && data.job) {
        populateForm(data.job); // Automatically fills the inputs!
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Failed to load job details', error);
      setNotification({ visible: true, message: 'Failed to load job details', type: 'error' });
    } finally {
      setLoadingEdit(false);
    }
  };

  // UI states
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ visible: false, message: '', type: 'success' });

  // MULTI-SELECT: Get jobs for selected categories
  const availableJobs = formData.category_ids.length > 0
    ? getJobsByCategories(formData.category_ids)
    : [];

  // MULTI-SELECT: Get skills for selected jobs
  const availableSkills = formData.job_ids.length > 0
    ? getSkillsByJobs(formData.job_ids)
    : [];

  // Handle category toggle
  const handleToggleCategory = (categoryId: string | number) => {
    if (isDisabled) return;

    const idStr = categoryId.toString();
    const currentCategories = formData.category_ids;
    const newCategories = currentCategories.includes(idStr)
      ? currentCategories.filter((id) => id !== idStr)
      : [...currentCategories, idStr];

    updateFields({
      category_ids: newCategories,
      job_ids: [], // RESET jobs when categories change
      skill_ids: [], // RESET skills when categories change
    });
  };

  // Handle job toggle
  const handleToggleJob = (jobId: string | number, jobTitle: string) => {
    if (isDisabled) return;

    const idStr = jobId.toString();
    const currentJobs = formData.job_ids;
    const newJobs = currentJobs.includes(idStr)
      ? currentJobs.filter((id) => id !== idStr)
      : [...currentJobs, idStr];

    // Update title if it's the first job being selected
    const newTitle = newJobs.length === 1 && currentJobs.length === 0
      ? jobTitle
      : formData.title;

    updateFields({
      job_ids: newJobs,
      title: newTitle,
      skill_ids: [], // RESET skills when jobs change
    });
  };

  // Handle skill toggle
  const handleToggleSkill = (skillId: string | number) => {
    if (isDisabled) return;

    const idStr = skillId.toString();
    const currentSkills = formData.skill_ids;
    const newSkills = currentSkills.includes(idStr)
      ? currentSkills.filter((id) => id !== idStr)
      : [...currentSkills, idStr];  

    updateField('skill_ids', newSkills);
  };

  // Handle days off toggle
  const handleDaysOffToggle = (day: string) => {
    if (isDisabled) return;

    const currentDays = formData.days_off;
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];

    updateField('days_off', newDays);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (isDisabled) {
      setNotification({
        visible: true,
        message: verification.message,
        type: 'error',
      });
      return;
    }

    if (!validate()) {
      setNotification({
        visible: true,
        message: 'Please fill in all required fields correctly',
        type: 'error',
      });
      return;
    }

    try {
      setSubmitting(true);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }
      const user = JSON.parse(userData);

      const submissionData = {
        ...getSubmissionData(),
        parent_id: user.user_id,
      };

      // SMART ENDPOINT SWITCHING: Post new vs Edit existing
      const endpoint = edit_id ? '/parent/edit_job.php' : '/parent/post_job.php';
      if (edit_id) {
        (submissionData as any).job_post_id = edit_id; // Add ID so backend knows what to update
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({
          visible: true,
          message: 'Job posted successfully!',
          type: 'success',
        });

        setTimeout(() => {
          reset();
          router.push('/(parent)/jobs');
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to post job');
      }
    } catch (error: any) {
      console.error('Error posting job:', error);
      setNotification({
        visible: true,
        message: error.message || 'Failed to post job. Please try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (referencesLoading || loadingEdit) {
    return <LoadingSpinner visible={true} message="Loading..." />;
  }

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={submitting} message="Posting job..." />

      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, visible: false })}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{edit_id ? 'Edit Job' : 'Post a Job'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Pending Banner */}
      {isPending && (
        <PendingBanner
          status="Pending"
          message="You can view the form but cannot post jobs until verified"
        />
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
      >
        <View style={[styles.formContainer, isDesktop && styles.formContainerDesktop]}>
          {/* Category Selection - MULTI-SELECT */}
          <CategorySelector
            categories={categories}
            selectedCategoryIds={formData.category_ids}
            customCategory={formData.custom_category}
            onToggleCategory={handleToggleCategory}
            onCustomCategoryChange={(value: string) => updateField('custom_category', value)}
            error={errors.category}
            disabled={isDisabled}
          />

          {/* Job Title - MULTI-SELECT */}
          <JobTitleInput
            categoryIds={formData.category_ids}
            availableJobs={availableJobs}
            selectedJobIds={formData.job_ids}
            customJobTitle={formData.custom_job_title}
            title={formData.title}
            onToggleJob={handleToggleJob}
            onCustomJobChange={(value: string) => updateField('custom_job_title', value)}
            onTitleChange={(value: string) => updateField('title', value)}
            error={errors.title}
            disabled={isDisabled}
          />

          {/* Skills Selector - MULTI-SELECT */}
          <SkillsSelector
            selectedJobIds={formData.job_ids}
            availableSkills={availableSkills}
            selectedSkills={formData.skill_ids}
            onToggleSkill={handleToggleSkill}
            disabled={isDisabled}
          />

          {/* Job Description */}
          <DescriptionInput
            value={formData.description}
            onChange={(value) => updateField('description', value)}
            error={errors.description}
            disabled={isDisabled}
          />
 
          {/* Location Selector - NEW */}
          <LocationSelector
            province={formData.province}
            municipality={formData.municipality}
            barangay={formData.barangay}
            onProvinceChange={(value) => updateField('province', value)}
            onMunicipalityChange={(value) => updateField('municipality', value)}
            onBarangayChange={(value) => updateField('barangay', value)}
            disabled={isDisabled}
          />

          {/* Work Arrangement */}
          <WorkArrangementCard
            employmentType={formData.employment_type}
            workSchedule={formData.work_schedule}
            onEmploymentTypeChange={(type: string) => updateField('employment_type', type)}
            onWorkScheduleChange={(schedule: string) => updateField('work_schedule', schedule)}
            disabled={isDisabled}
          />

          {/* Salary & Benefits */}
          <SalaryInputCard
            salaryOffered={formData.salary_offered}
            salaryPeriod={formData.salary_period}
            benefits={formData.benefits}
            onSalaryChange={(value: string) => updateField('salary_offered', value)}
            onPeriodChange={(period) => updateField('salary_period', period)}
            onBenefitsChange={(value: string) => updateField('benefits', value)}
            error={errors.salary}
            disabled={isDisabled}
          />

          {/* Age Range Selector - NEW */}
          <AgeRangeSelector
            minAge={formData.min_age}
            maxAge={formData.max_age}
            onMinAgeChange={(value) => updateField('min_age', value)}
            onMaxAgeChange={(value) => updateField('max_age', value)}
            disabled={isDisabled}
          />

          {/* Experience Selector - NEW */}
          <ExperienceSelector
            minExperience={formData.min_experience_years}
            onExperienceChange={(value) => updateField('min_experience_years', value)}
            disabled={isDisabled}
          />

          {/* Work Schedule Card - NEW */}
          <WorkScheduleCard
            startDate={formData.start_date}
            workHours={formData.work_hours}
            daysOff={formData.days_off}
            onStartDateChange={(value) => updateField('start_date', value)}
            onWorkHoursChange={(value) => updateField('work_hours', value)}
            onDaysOffToggle={handleDaysOffToggle}
            disabled={isDisabled}
          />

          {/* Contract Details Card - NEW */}
          <ContractDetailsCard
            contractDuration={formData.contract_duration}
            probationPeriod={formData.probation_period}
            onContractDurationChange={(value) => updateField('contract_duration', value)}
            onProbationPeriodChange={(value) => updateField('probation_period', value)}
            disabled={isDisabled}
          />

          {/* Benefits Card - NEW ENHANCED */}
          <BenefitsCard
            benefits={formData.benefits}
            providesMeals={formData.provides_meals}
            providesAccommodation={formData.provides_accommodation}
            providesSSS={formData.provides_sss}
            providesPhilHealth={formData.provides_philhealth}
            providesPagIbig={formData.provides_pagibig}
            vacationDays={formData.vacation_days}
            sickDays={formData.sick_days}
            onBenefitsChange={(value) => updateField('benefits', value)}
            onMealsToggle={() => updateField('provides_meals', !formData.provides_meals)}
            onAccommodationToggle={() => updateField('provides_accommodation', !formData.provides_accommodation)}
            onSSSToggle={() => updateField('provides_sss', !formData.provides_sss)}
            onPhilHealthToggle={() => updateField('provides_philhealth', !formData.provides_philhealth)}
            onPagIbigToggle={() => updateField('provides_pagibig', !formData.provides_pagibig)}
            onVacationDaysChange={(value) => updateField('vacation_days', value)}
            onSickDaysChange={(value) => updateField('sick_days', value)}
            disabled={isDisabled}
          />

          {/* Optional Preferences */}
          <PreferencesCard
            religions={religions}
            languages={languages}
            selectedReligion={formData.preferred_religion}
            selectedLanguageId={formData.preferred_language_id}
            requirePoliceClearance={formData.require_police_clearance}
            preferTesdaNc2={formData.prefer_tesda_nc2}
            onReligionChange={(religion: string) => updateField('preferred_religion', religion)}
            onLanguageChange={(langId: string) => updateField('preferred_language_id', langId)}
            onPoliceClearanceChange={(value: boolean) =>
              updateField('require_police_clearance', value)
            }
            onTesdaNc2Change={(value: boolean) => updateField('prefer_tesda_nc2', value)}
            disabled={isDisabled}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || isDisabled) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || isDisabled}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {isDisabled ? 'Verification Required' : edit_id ? 'Update Job' : 'Post Job'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7b8a99ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scrollContentDesktop: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 60, // Give it a bit more breathing room at the bottom on big screens
  },
  formContainer: {
    width: '100%',
  },
  // CHANGED: Added the cohesive "Document" styling here
  formContainerDesktop: {
    width: '100%',
    maxWidth: 800,
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
      },
    }),
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
});