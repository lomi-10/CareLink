// components/parent/jobs/JobPostModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../../constants/api'; 

import { useJobForm } from '@/hooks/useJobForm';
import { useJobReferences } from '@/hooks/useJobReferences';
import { useResponsive } from '@/hooks/useResponsive';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';

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

interface JobPostModalProps {
  visible: boolean;
  onClose: () => void;
  existingJobData?: any | null;
  onSaveSuccess?: () => void; 
}

export function JobPostModal({ visible, onClose, existingJobData, onSaveSuccess }: JobPostModalProps) {
  const { isDesktop } = useResponsive();
  const { verification, isPending } = useVerificationStatus();
  const isDisabled = !verification.canPostJobs;

  const { 
    formData, 
    errors, 
    updateField, 
    updateFields, 
    validate, 
    reset, 
    getSubmissionData, 
    populateForm 
  } = useJobForm();
  
  const {
    categories,
    jobs,
    skills,
    languages,
    religions,
    loading: referencesLoading,
    getSkillsByJob, 
  } = useJobReferences();

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    if (visible && existingJobData) {
      populateForm(existingJobData);
    } else if (visible && !existingJobData) {
      reset(); 
    }
  }, [visible, existingJobData]);

  // ==========================================
  // LOGIC FLAGS FOR DYNAMIC RENDERING (NO HARDCODED IDS!)
  // ==========================================
  const generalHousehelpCat = categories.find(c => c.name.toLowerCase() === 'general househelp');
  const othersCat = categories.find(c => c.name.toLowerCase() === 'others');

  const isGeneralHousehelp = generalHousehelpCat 
    ? formData.category_id === generalHousehelpCat.category_id.toString() 
    : false;
    
  const isOthersSelected = othersCat 
    ? formData.category_id === othersCat.category_id.toString() 
    : false;

  // If General Househelp -> Show ALL jobs. Otherwise, filter by selected category.
  const availableJobs = isGeneralHousehelp
    ? jobs 
    : jobs.filter((job: any) => job.category_id?.toString() === formData.category_id);

  // If General Househelp -> Show ALL skills. Otherwise, filter by selected jobs.
  const availableSkills = isGeneralHousehelp
    ? skills
    : skills.filter((skill: any) => formData.job_ids?.includes(skill.job_id?.toString()));

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleSelectCategory = (categoryId: string | number) => {
    if (isDisabled) return;
    updateFields({
      category_id: categoryId.toString(),
      job_ids: [],          // WIPE jobs when category changes
      skill_ids: [],        // WIPE skills
      custom_category: '',  // WIPE custom category name
      custom_job_title: '', // WIPE custom title
    });
  };

  const handleToggleJob = (jobId: string | number, jobTitle: string) => {
    if (isDisabled) return;
    const idStr = jobId.toString();
    const currentJobs = formData.job_ids || [];
    const newJobs = currentJobs.includes(idStr)
      ? currentJobs.filter((id: string) => id !== idStr)
      : [...currentJobs, idStr];
    
    updateFields({
      job_ids: newJobs,
      skill_ids: [], // Wiping skills so they don't accidentally keep skills from deselected jobs
    });
  };

  const handleToggleSkill = (skillId: string | number) => {
    if (isDisabled) return;
    const idStr = skillId.toString();
    const currentSkills = formData.skill_ids || [];
    const newSkills = currentSkills.includes(idStr)
      ? currentSkills.filter((id: string) => id !== idStr)
      : [...currentSkills, idStr];  
    updateField('skill_ids', newSkills);
  };

  const handleDaysOffToggle = (day: string) => {
    if (isDisabled) return;
    const currentDays = formData.days_off || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d: string) => d !== day)
      : [...currentDays, day];
    updateField('days_off', newDays);
  };

  const handleSubmit = async () => {
    if (isDisabled) {
      setNotification({ visible: true, message: verification.message, type: 'error' });
      return;
    }

    // STRICT SKILL ENFORCEMENT
    if (!formData.skill_ids || formData.skill_ids.length < 2) {
      setNotification({ visible: true, message: 'Please select at least 2 skills so helpers know what is expected.', type: 'error' });
      return;
    }

    // PASS CATEGORIES TO DYNAMIC HOOK VALIDATION
    if (!validate(categories)) {
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
        setNotification({ visible: true, message: 'Job saved successfully!', type: 'success' });
        setTimeout(() => {
          reset();
          onClose(); 
          if (onSaveSuccess) onSaveSuccess(); 
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
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.modalContainer, isDesktop && styles.modalContainerDesktop]}>
          
          <LoadingSpinner visible={submitting || referencesLoading} message="Please wait..." />
          <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, visible: false })} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>{existingJobData ? 'Edit Job' : 'Post a Job'}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#1A1C1E" />
            </TouchableOpacity>
          </View>

          {isPending && <PendingBanner status="Pending" message="You can view the form but cannot post jobs until verified" />}

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.formContainer}>
              
              <CategorySelector 
                categories={categories} 
                selectedCategoryIds={formData.category_id ? [formData.category_id] : []} 
                customCategory={formData.custom_category || ''}
                onToggleCategory={handleSelectCategory} 
                onCustomCategoryChange={(value: string) => updateField('custom_category', value)}
                error={errors.category} 
                disabled={isDisabled} 
              />
              
              {/* FIXED: Added missing TS Props so it stops complaining! */}
              <JobTitleInput
                categoryIds={formData.category_id ? [formData.category_id] : []}
                availableJobs={availableJobs}
                selectedJobIds={formData.job_ids || []}
                customJobTitle={formData.custom_job_title || ''}
                title={formData.title || ''}
                onToggleJob={handleToggleJob}
                onCustomJobChange={(value: string) => updateField('custom_job_title', value)}
                onTitleChange={(value: string) => updateField('title', value)}
                error={errors.title}
                disabled={isDisabled || !formData.category_id}
              />

              {/* IF OTHERS IS SELECTED, ONLY ASK FOR THE CUSTOM CATEGORY NAME */}
              {isOthersSelected && (
                <View style={styles.customInputContainer}>
                  <Text style={styles.inputLabel}>Custom Category Name <Text style={styles.asterisk}>*</Text></Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Pet Care, Tutoring..."
                    value={formData.custom_category}
                    onChangeText={(val) => updateField('custom_category', val)}
                    editable={!isDisabled}
                  />
                  <Text style={styles.helperText}>This will replace the word "Others" on the blue category tag.</Text>
                </View>
              )}
    
              <SkillsSelector
                selectedJobIds={formData.job_ids || []}
                availableSkills={availableSkills}
                selectedSkills={formData.skill_ids}
                onToggleSkill={handleToggleSkill}
                disabled={isDisabled || (!isOthersSelected && (!formData.job_ids || formData.job_ids.length === 0))}
              />
    
              <DescriptionInput value={formData.description} onChange={(value) => updateField('description', value)} error={errors.description} disabled={isDisabled} />
    
              <LocationSelector province={formData.province} municipality={formData.municipality} barangay={formData.barangay} onProvinceChange={(value) => updateField('province', value)} onMunicipalityChange={(value) => updateField('municipality', value)} onBarangayChange={(value) => updateField('barangay', value)} disabled={isDisabled} />

              <WorkArrangementCard employmentType={formData.employment_type} workSchedule={formData.work_schedule} onEmploymentTypeChange={(type: string) => updateField('employment_type', type)} onWorkScheduleChange={(schedule: string) => updateField('work_schedule', schedule)} disabled={isDisabled} />
    
              <SalaryInputCard salaryOffered={formData.salary_offered} salaryPeriod={formData.salary_period} benefits={formData.benefits} onSalaryChange={(value: string) => updateField('salary_offered', value)} onPeriodChange={(period) => updateField('salary_period', period)} onBenefitsChange={(value: string) => updateField('benefits', value)} error={errors.salary} disabled={isDisabled} />
    
              <AgeRangeSelector minAge={formData.min_age} maxAge={formData.max_age} onMinAgeChange={(value) => updateField('min_age', value)} onMaxAgeChange={(value) => updateField('max_age', value)} disabled={isDisabled} />
    
              <ExperienceSelector minExperience={formData.min_experience_years} onExperienceChange={(value) => updateField('min_experience_years', value)} disabled={isDisabled} />
    
              <WorkScheduleCard startDate={formData.start_date} workHours={formData.work_hours} daysOff={formData.days_off} onStartDateChange={(value) => updateField('start_date', value)} onWorkHoursChange={(value) => updateField('work_hours', value)} onDaysOffToggle={handleDaysOffToggle} disabled={isDisabled} />
    
              <ContractDetailsCard contractDuration={formData.contract_duration} probationPeriod={formData.probation_period} onContractDurationChange={(value) => updateField('contract_duration', value)} onProbationPeriodChange={(value) => updateField('probation_period', value)} disabled={isDisabled} />
    
              <BenefitsCard benefits={formData.benefits} providesMeals={formData.provides_meals} providesAccommodation={formData.provides_accommodation} providesSSS={formData.provides_sss} providesPhilHealth={formData.provides_philhealth} providesPagIbig={formData.provides_pagibig} vacationDays={formData.vacation_days} sickDays={formData.sick_days} onBenefitsChange={(value) => updateField('benefits', value)} onMealsToggle={() => updateField('provides_meals', !formData.provides_meals)} onAccommodationToggle={() => updateField('provides_accommodation', !formData.provides_accommodation)} onSSSToggle={() => updateField('provides_sss', !formData.provides_sss)} onPhilHealthToggle={() => updateField('provides_philhealth', !formData.provides_philhealth)} onPagIbigToggle={() => updateField('provides_pagibig', !formData.provides_pagibig)} onVacationDaysChange={(value) => updateField('vacation_days', value)} onSickDaysChange={(value) => updateField('sick_days', value)} disabled={isDisabled} />
    
              <PreferencesCard religions={religions} languages={languages} selectedReligion={formData.preferred_religion} selectedLanguageId={formData.preferred_language_id} requirePoliceClearance={formData.require_police_clearance} preferTesdaNc2={formData.prefer_tesda_nc2} onReligionChange={(religion: string) => updateField('preferred_religion', religion)} onLanguageChange={(langId: string) => updateField('preferred_language_id', langId)} onPoliceClearanceChange={(value: boolean) => updateField('require_police_clearance', value)} onTesdaNc2Change={(value: boolean) => updateField('prefer_tesda_nc2', value)} disabled={isDisabled} />

              <TouchableOpacity style={[styles.submitButton, (submitting || isDisabled) && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting || isDisabled}>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%', height: '90%' },
  modalContainerDesktop: { width: '80%', maxWidth: 800, height: '85%', borderRadius: 16, marginBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1C1E' },
  closeButton: { padding: 4 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  formContainer: { width: '100%' },
  
  // Custom Input Styles
  customInputContainer: { marginBottom: 20, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  asterisk: { color: '#EF4444' },
  textInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, color: '#111827' },
  helperText: { fontSize: 12, color: '#6B7280', marginTop: 8, fontStyle: 'italic' },
  
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, marginTop: 24 },
  submitButtonDisabled: { backgroundColor: '#999' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  cancelButton: { alignItems: 'center', paddingVertical: 14, marginTop: 12 },
  cancelButtonText: { color: '#666', fontSize: 15, fontWeight: '600' },
});