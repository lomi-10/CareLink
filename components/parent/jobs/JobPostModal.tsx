// components/parent/jobs/JobPostModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../../constants/api'; // Adjust path if needed

// Custom Hooks
import { useJobForm } from '@/hooks/useJobForm';
import { useJobReferences } from '@/hooks/useJobReferences';
import { useResponsive } from '@/hooks/useResponsive';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';

// Components (Assuming these are in the same folder or adjusted path)
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

import { NotificationModal, LoadingSpinner } from '@/components/common';
import { PendingBanner } from '@/components/parent/verification/PendingBanner';

// 1. Define the Props for the Modal
interface JobPostModalProps {
  visible: boolean;
  onClose: () => void;
  existingJobData?: any | null;
  onSaveSuccess?: () => void;  // Optional callback to refresh a list after posting
}

export function JobPostModal({ visible, onClose, existingJobData, onSaveSuccess }: JobPostModalProps) {
  const { isDesktop } = useResponsive();
  const { verification, isPending } = useVerificationStatus();
  const isDisabled = !verification.canPostJobs;

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

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ visible: false, message: '', type: 'success' });

  // 2. Fetch data when modal becomes visible OR edit_id changes
  useEffect(() => {
    if (visible && existingJobData) {
      populateForm(existingJobData); // Populate form with existing job data instantly. FASTER
    } else if (visible && !existingJobData) {
      reset(); // Clear form if opening for a new post
    }
  }, [visible, existingJobData]);

  const availableJobs = formData.category_ids.length > 0 ? getJobsByCategories(formData.category_ids) : [];
  const availableSkills = formData.job_ids.length > 0 ? getSkillsByJobs(formData.job_ids) : [];

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
  const handleToggleSkill = (skillId: string | number) => {
    if (isDisabled) return;

    const idStr = skillId.toString();
    const currentSkills = formData.skill_ids;
    const newSkills = currentSkills.includes(idStr)
      ? currentSkills.filter((id) => id !== idStr)
      : [...currentSkills, idStr];  

    updateField('skill_ids', newSkills);
  };
  const handleDaysOffToggle = (day: string) => {
    if (isDisabled) return;

    const currentDays = formData.days_off;
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];

    updateField('days_off', newDays);
  };

  const handleSubmit = async () => {
    if (isDisabled) {
      setNotification({ visible: true, message: verification.message, type: 'error' });
      return;
    }
    if (!validate()) {
      setNotification({ visible: true, message: 'Please fill in all required fields correctly', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('Not logged in');
      const user = JSON.parse(userData);

      const submissionData = { ...getSubmissionData(), parent_id: user.user_id };
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
        setNotification({ visible: true, message: 'Job posted successfully!', type: 'success' });
        
        // 3. Handle success by closing modal instead of routing
        setTimeout(() => {
          reset();
          onClose(); // Close the modal
          if (onSaveSuccess) onSaveSuccess(); // Trigger any refresh callbacks
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to post job');
      }
    } catch (error: any) {
      setNotification({ visible: true, message: error.message || 'Failed to post job.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // 4. Wrap everything in the Modal component
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.modalContainer, isDesktop && styles.modalContainerDesktop]}>
          
          <LoadingSpinner 
            visible={submitting || referencesLoading} message="Please wait..." />

          <NotificationModal
            visible={notification.visible}
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification({ ...notification, visible: false })}
          />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{existingJobData ? 'Edit Job' : 'Post a Job'}</Text>
            {/* 5. Replace Back button with Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#1A1C1E" />
            </TouchableOpacity>
          </View>

          {isPending && (
            <PendingBanner 
              status="Pending" 
              message="You can view the form but cannot post jobs until verified" 
            />
          )}

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* YOUR EXACT SAME FORM COMPONENTS GO HERE */}
            <View style={styles.formContainer}>
              
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


              {/* ... ADD ALL OTHER FORM COMPONENTS IN ORDER ... */}

              <TouchableOpacity style={[styles.submitButton, (submitting || isDisabled) && styles.submitButtonDisabled]} 
                onPress={handleSubmit} disabled={submitting || isDisabled}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>
                      {isDisabled ? 'Verification Required' : existingJobData ? 'Update Job' : 'Post Job'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end', // Pushes modal to bottom on mobile
    alignItems: 'center',       // Centers modal horizontally on desktop
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    height: '90%', // Standard mobile bottom-sheet height
  },
  modalContainerDesktop: {
    width: '80%',
    maxWidth: 800,
    height: '85%',
    borderRadius: 16, // Full border radius on desktop, not just top
    marginBottom: 40, // Float it slightly above the bottom
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formContainer: {
    width: '100%',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
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