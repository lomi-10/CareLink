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
import { ContractDetailsCard } from './ContractDetailsCard';
import { DescriptionInput } from './DescriptionInput';
import { ExperienceSelector } from './ExperienceSelector';
import { JobTitleInput } from './JobTitleInput';
import { LocationSelector } from './LocationSelector';
import { PreferencesCard } from './PreferencesCard';
import { SalaryInputCard } from './SalaryInputCard';
import { SkillsSelector } from './SkillsSelector';
import { WorkArrangementCard } from './WorkArrangementCard';
import { WorkScheduleCard } from './WorkScheduleCard';

// Hooks
import { useJobForm } from '@/hooks/parent';
import { useJobReferences } from '@/hooks/shared';
import { useUserVerification } from '@/hooks/peso';

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
  const [modalStep, setModalStep] = useState(1); // 1: Role, 2: Details, 3: Benefits & Review

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
    getSubmissionData 
  } = useJobForm();

  const isDesktop = Platform.OS === 'web';

  // Initialize form if editing
  useEffect(() => {
    if (existingJobData && visible) {
      populateForm(existingJobData);
    } else if (!existingJobData && visible) {
      reset();
      setCurrentStep(1);
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

  const renderStepIndicator = () => (
    <View style={styles.modalStepIndicator}>
      {[
        { step: 1, label: 'Role', icon: 'briefcase-outline' },
        { step: 2, label: 'Details', icon: 'list-outline' },
        { step: 3, label: 'Perks', icon: 'gift-outline' },
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
          {item.step < 3 && <View style={[styles.stepLine, modalStep > item.step && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  const renderRoleStep = () => (
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
      {errors.skills && <Text style={styles.errorText}>{errors.skills}</Text>}
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionHeader}>Work Details & Location</Text>
      
      <DescriptionInput 
        value={formData.description} 
        onChange={(val) => updateField('description', val)} 
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
    
      <WorkScheduleCard startDate={formData.start_date} workHours={formData.work_hours} daysOff={formData.days_off} onStartDateChange={(val) => updateField('start_date', val)} onWorkHoursChange={(val) => updateField('work_hours', val)} onDaysOffToggle={(day) => {
        const current = formData.days_off || [];
        updateField('days_off', current.includes(day) ? current.filter(d => d !== day) : [...current, day]);
      }} disabled={isDisabled} />
    
      <ContractDetailsCard contractDuration={formData.contract_duration} probationPeriod={formData.probation_period} onContractDurationChange={(val) => updateField('contract_duration', val)} onProbationPeriodChange={(val) => updateField('probation_period', val)} disabled={isDisabled} />
    </View>
  );

  const renderPerksStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionHeader}>Compensation & Requirements</Text>

      <SalaryInputCard 
        salaryOffered={formData.salary_offered} 
        salaryPeriod={formData.salary_period} 
        benefits={formData.benefits} 
        onSalaryChange={(val) => updateField('salary_offered', val)} 
        onPeriodChange={(period) => updateField('salary_period', period)} 
        onBenefitsChange={(val) => updateField('benefits', val)} 
        error={errors.salary} 
        disabled={isDisabled} 
      />
    
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
        benefits={formData.benefits} 
        providesMeals={formData.provides_meals} 
        providesAccommodation={formData.provides_accommodation} 
        providesSSS={formData.provides_sss} 
        providesPhilHealth={formData.provides_philhealth} 
        providesPagIbig={formData.provides_pagibig} 
        vacationDays={formData.vacation_days} 
        sickDays={formData.sick_days} 
        onBenefitsChange={(val) => updateField('benefits', val)} 
        onMealsToggle={() => updateField('provides_meals', !formData.provides_meals)} 
        onAccommodationToggle={() => updateField('provides_accommodation', !formData.provides_accommodation)} 
        onSSSToggle={() => updateField('provides_sss', !formData.provides_sss)} 
        onPhilHealthToggle={() => updateField('provides_philhealth', !formData.provides_philhealth)} 
        onPagIbigToggle={() => updateField('provides_pagibig', !formData.provides_pagibig)} 
        onVacationDaysChange={(val) => updateField('vacation_days', val)} 
        onSickDaysChange={(val) => updateField('sick_days', val)} 
        disabled={isDisabled} 
      />
    
      <PreferencesCard 
        religions={religions} 
        languages={languages} 
        selectedReligion={formData.preferred_religion} 
        selectedLanguageId={formData.preferred_language_id} 
        requirePoliceClearance={formData.require_police_clearance} 
        preferTesdaNc2={formData.prefer_tesda_nc2} 
        onReligionChange={(rel) => updateField('preferred_religion', rel)} 
        onLanguageChange={(lang) => updateField('preferred_language_id', lang)} 
        onPoliceClearanceChange={(val) => updateField('require_police_clearance', val)} 
        onTesdaNc2Change={(val) => updateField('prefer_tesda_nc2', val)} 
        disabled={isDisabled} 
      />
    </View>
  );

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
              <Ionicons name="close" size={28} color="#1A1C1E" />
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
              {modalStep === 1 && renderRoleStep()}
              {modalStep === 2 && renderDetailsStep()}
              {modalStep === 3 && renderPerksStep()}

              <View style={styles.footerActions}>
                <View style={styles.navButtonsRow}>
                  {modalStep > 1 && (
                    <TouchableOpacity 
                      style={styles.backButton} 
                      onPress={() => setModalStep(prev => prev - 1)}
                    >
                      <Ionicons name="arrow-back" size={20} color="#4B5563" />
                      <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                  )}

                  {modalStep < 3 ? (
                    <TouchableOpacity 
                      style={styles.nextButton} 
                      onPress={() => setModalStep(prev => prev + 1)}
                    >
                      <Text style={styles.nextButtonText}>Next Details</Text>
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
                            {isDisabled ? 'Verify First' : existingJobData ? 'Update Job' : 'Post Job Now'}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end', alignItems: 'center' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, width: '100%', height: '95%', overflow: 'hidden' },
  modalContainerDesktop: { width: '85%', maxWidth: 900, height: '90%', borderRadius: 24, marginBottom: 20 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
    paddingVertical: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  closeButton: { padding: 4 },
  scrollContent: { paddingBottom: 60 },
  formContainer: { paddingHorizontal: 24, paddingVertical: 12 },
  
  sectionHeader: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 24 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 32 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },

  // Step Indicator (New Professional Multi-Step)
  modalStepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 24, paddingHorizontal: 40 },
  stepWrapper: { alignItems: 'center', gap: 6 },
  stepCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
  stepCircleActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  stepLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  stepLabelActive: { color: '#2563EB' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 12, marginTop: -18 },
  stepLineActive: { backgroundColor: '#2563EB' },

  // Role Mini-Steps (1-2-3 indicator)
  selectionStepsContainer: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  miniStep: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  miniStepActive: { backgroundColor: '#EFF6FF' },
  miniStepText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  miniStepTextActive: { color: '#2563EB' },

  stepContent: { animationDuration: '0.3s' },

  footerActions: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 24 },
  navButtonsRow: { flexDirection: 'row', gap: 12 },
  nextButton: { flex: 2, backgroundColor: '#2563EB', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backButton: { flex: 1, backgroundColor: '#F3F4F6', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  backButtonText: { color: '#4B5563', fontSize: 16, fontWeight: '600' },
  submitButton: { flex: 2, backgroundColor: '#059669', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitButtonDisabled: { backgroundColor: '#D1D5DB' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  cancelButtonText: { color: '#9CA3AF', fontSize: 15, fontWeight: '600' },

  errorText: { color: '#EF4444', fontSize: 13, marginTop: -12, marginBottom: 16, fontWeight: '500' },
});
