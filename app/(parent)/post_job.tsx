// app/(parent)/post_job.tsx
// Refactored to match the strict Desktop/Mobile architecture and Sidebar consistency

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';
import { styles } from './post_job.styles';

// Custom Hooks
import { useJobForm } from '@/hooks/useJobForm';
import { useJobReferences } from '@/hooks/useJobReferences';
import { useResponsive } from '@/hooks/useResponsive';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';
import { useAuth } from '@/hooks/useAuth'; // NEW: Added for consistent logout

// Components
import { Sidebar, MobileMenu } from '@/components/parent/home'; // NEW: Added for consistent layout
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
import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/common'; // NEW: Added ConfirmationModal
import { PendingBanner } from '@/components/parent/verification/PendingBanner';

export default function PostJob() {
  const router = useRouter();
  const { edit_id } = useLocalSearchParams();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth(); // NEW: Added for consistent logout

  // Verification status
  const { verification, isPending } = useVerificationStatus();
  const isDisabled = !verification.canPostJobs;

  // Custom hooks
  const { formData, errors, updateField, updateFields, validate, reset, getSubmissionData, populateForm } = useJobForm();
  const {
    categories, jobs, skills, languages, religions,
    loading: referencesLoading, getJobsByCategories, getSkillsByJobs,
  } = useJobReferences();
  
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Layout & Modal States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);
  const [notification, setNotification] = useState<{ visible: boolean; message: string; type: 'success' | 'error'; }>({ visible: false, message: '', type: 'success' });

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
        populateForm(data.job);
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

  // MULTI-SELECT Helpers
  const availableJobs = formData.category_ids.length > 0 ? getJobsByCategories(formData.category_ids) : [];
  const availableSkills = formData.job_ids.length > 0 ? getSkillsByJobs(formData.job_ids) : [];

  // Handlers
  const handleToggleCategory = (categoryId: string | number) => {
    if (isDisabled) return;
    const idStr = categoryId.toString();
    const currentCategories = formData.category_ids;
    const newCategories = currentCategories.includes(idStr) ? currentCategories.filter((id) => id !== idStr) : [...currentCategories, idStr];
    updateFields({ category_ids: newCategories, job_ids: [], skill_ids: [] });
  };

  const handleToggleJob = (jobId: string | number, jobTitle: string) => {
    if (isDisabled) return;
    const idStr = jobId.toString();
    const currentJobs = formData.job_ids;
    const newJobs = currentJobs.includes(idStr) ? currentJobs.filter((id) => id !== idStr) : [...currentJobs, idStr];
    const newTitle = newJobs.length === 1 && currentJobs.length === 0 ? jobTitle : formData.title;
    updateFields({ job_ids: newJobs, title: newTitle, skill_ids: [] });
  };

  const handleToggleSkill = (skillId: string | number) => {
    if (isDisabled) return;
    const idStr = skillId.toString();
    const currentSkills = formData.skill_ids;
    const newSkills = currentSkills.includes(idStr) ? currentSkills.filter((id) => id !== idStr) : [...currentSkills, idStr];  
    updateField('skill_ids', newSkills);
  };

  const handleDaysOffToggle = (day: string) => {
    if (isDisabled) return;
    const currentDays = formData.days_off;
    const newDays = currentDays.includes(day) ? currentDays.filter((d) => d !== day) : [...currentDays, day];
    updateField('days_off', newDays);
  };

  // Logout Handlers (Matches jobs.tsx exactly)
  const initiateLogout = () => {
    setIsMobileMenuOpen(false); 
    setConfirmLogoutVisible(true); 
  };

  const executeLogout = () => {
    setConfirmLogoutVisible(false);
    setSuccessLogoutVisible(true);
  };

  // Handle form submission
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
      const endpoint = edit_id ? '/parent/edit_job.php' : '/parent/post_job.php';
      if (edit_id) (submissionData as any).job_post_id = edit_id;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ visible: true, message: 'Job posted successfully!', type: 'success' });
        setTimeout(() => {
          reset();
          router.push('/(parent)/jobs');
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to post job');
      }
    } catch (error: any) {
      console.error('Error posting job:', error);
      setNotification({ visible: true, message: error.message || 'Failed to post job. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (referencesLoading || loadingEdit) {
    return <LoadingSpinner visible={true} message="Loading..." />;
  }

  // ==========================================
  // CONSISTENT ARCHITECTURE: Modals Grouping
  // ==========================================
  const renderModals = () => (
    <>
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out of your account?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose={true} duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, visible: false })} />
    </>
  );

  // ==========================================
  // CONSISTENT ARCHITECTURE: UI Variable
  // ==========================================
  const formContent = (
    <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}>
      <View style={[styles.formContainer, isDesktop && styles.formContainerDesktop]}>
        
        <CategorySelector categories={categories} selectedCategoryIds={formData.category_ids} customCategory={formData.custom_category} onToggleCategory={handleToggleCategory} onCustomCategoryChange={(value: string) => updateField('custom_category', value)} error={errors.category} disabled={isDisabled} />
        <JobTitleInput categoryIds={formData.category_ids} availableJobs={availableJobs} selectedJobIds={formData.job_ids} customJobTitle={formData.custom_job_title} title={formData.title} onToggleJob={handleToggleJob} onCustomJobChange={(value: string) => updateField('custom_job_title', value)} onTitleChange={(value: string) => updateField('title', value)} error={errors.title} disabled={isDisabled} />
        <SkillsSelector selectedJobIds={formData.job_ids} availableSkills={availableSkills} selectedSkills={formData.skill_ids} onToggleSkill={handleToggleSkill} disabled={isDisabled} />
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

        <TouchableOpacity style={[styles.submitButton, (submitting || isDisabled) && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting || isDisabled} activeOpacity={0.8}>
          {submitting ? ( <ActivityIndicator color="#fff" /> ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>{isDisabled ? 'Verification Required' : edit_id ? 'Update Job' : 'Post Job'}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ==========================================
  // CONSISTENT ARCHITECTURE: Desktop Return
  // ==========================================
  if (isDesktop) {
    return (
      <View style={[styles.container, { flexDirection: 'row' }]}>
        <LoadingSpinner visible={submitting} message="Posting job..." />
        {renderModals()}

        <Sidebar onLogout={initiateLogout} />

        <View style={styles.desktopContentWrapper}>
          <View style={styles.desktopHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#1A1C1E" />
            </TouchableOpacity>
            <Text style={styles.desktopPageTitle}>{edit_id ? 'Edit Job' : 'Post a Job'}</Text>
          </View>
          
          {isPending && <PendingBanner status="Pending" message="You can view the form but cannot post jobs until verified" />}
          
          {formContent}

        </View>
      </View>
    );
  }

  // ==========================================
  // CONSISTENT ARCHITECTURE: Mobile Return
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <LoadingSpinner visible={submitting} message="Posting job..." />
      {renderModals()}

      <View style={styles.mobileHeader}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsMobileMenuOpen(true)}>
          <Ionicons name="menu" size={28} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.mobileTitle}>{edit_id ? 'Edit Job' : 'Post a Job'}</Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#1A1C1E" />
        </TouchableOpacity>
      </View>

      {isPending && <PendingBanner status="Pending" message="You can view the form but cannot post jobs until verified" />}

      {formContent}

      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        handleLogout={initiateLogout} 
      />
    </SafeAreaView>
  );
}