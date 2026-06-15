// app/(parent)/applicant_profile.tsx
// Applicant Profile - Review full details and take actions

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Components
import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/shared';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';
import {
  HireJobPickerModal,
  HireContractTermsModal,
  toYmdInput,
  computeContractEndDate,
  formatDurationString,
  workHoursToString,
  DEFAULT_WORK_START,
  DEFAULT_WORK_END,
  type HireJobOptionRow,
  type DurationUnit,
} from '@/components/parent/hire';

interface ApplicantDetails {
  application_id: string;
  helper_id: string;
  helper_name: string;
  helper_photo?: string;
  helper_age?: number;
  helper_gender?: string;
  helper_experience_years?: number;
  helper_rating_average?: number;
  helper_rating_count?: number;
  helper_categories?: string[];
  helper_municipality?: string;
  helper_province?: string;
  helper_bio?: string;
  helper_contact_number?: string;
  helper_expected_salary?: number;
  helper_employment_type?: string;
  cover_letter?: string;
  status: string;
  applied_at: string;
  parent_notes?: string;
  job_start_date?: string | null;
}

interface SharedDocument {
  document_id: number;
  document_type: string;
  status: string;
  file_url?: string | null;
  uploaded_at?: string;
}

export default function ApplicantProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const applicationId = params.application_id as string;
  const helperId = params.helper_id as string;
  const jobId = params.job_id as string;

  const [applicant, setApplicant] = useState<ApplicantDetails | null>(null);
  const [sharedDocuments, setSharedDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const [hireConfirmOpen, setHireConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [hirePickVisible, setHirePickVisible] = useState(false);
  const [hirePickLoading, setHirePickLoading] = useState(false);
  const [hirePickHelperName, setHirePickHelperName] = useState('');
  const [hirePickApps, setHirePickApps] = useState<HireJobOptionRow[]>([]);
  const [hirePickSelectedId, setHirePickSelectedId] = useState<number | null>(null);
  const [hireTarget, setHireTarget] = useState<{
    application_id: string;
    job_post_id: string;
    job_title?: string;
    job_start_date?: string | null;
  } | null>(null);
  const [hireTermsVisible, setHireTermsVisible] = useState(false);
  const [hireContractStartDate, setHireContractStartDate] = useState('');
  const [hireContractType, setHireContractType] = useState<'Fixed Term' | 'Indefinite'>('Indefinite');
  const [hireDurationAmount, setHireDurationAmount] = useState(1);
  const [hireDurationUnit, setHireDurationUnit] = useState<DurationUnit>('Years');
  const [hireContractNotes, setHireContractNotes] = useState('');
  const [hireConfirmedSalary, setHireConfirmedSalary] = useState('');
  const [hireWorkSchedule, setHireWorkSchedule] = useState<'Full-time' | 'Part-time' | 'Any'>('Full-time');
  const [hireWorkHoursStart, setHireWorkHoursStart] = useState(DEFAULT_WORK_START);
  const [hireWorkHoursEnd, setHireWorkHoursEnd] = useState(DEFAULT_WORK_END);
  const [hireFlexibleHours, setHireFlexibleHours] = useState(false);
  const [hireRestDays, setHireRestDays] = useState<string[]>(['Sun']);
  const [hireVacationLeave, setHireVacationLeave] = useState(5);
  const [hireSickLeave, setHireSickLeave] = useState(5);
  const [hireSpecialConditions, setHireSpecialConditions] = useState('');
  const [hireOvertimeRate, setHireOvertimeRate] = useState('');
  const [hirePaymentSchedule, setHirePaymentSchedule] = useState('Every 15th and 30th');
  const [hireOtherBenefits, setHireOtherBenefits] = useState('');
  const [hireDebtAgreement, setHireDebtAgreement] = useState('');
  const [hireDeploymentAgreement, setHireDeploymentAgreement] = useState('');
  const [hireTerminationConditions, setHireTerminationConditions] = useState('');
  const afterNotificationClose = useRef<(() => void) | null>(null);

  const hireContractEndDate = useMemo(
    () => computeContractEndDate(hireContractStartDate, hireContractType, hireDurationAmount, hireDurationUnit),
    [hireContractStartDate, hireContractType, hireDurationAmount, hireDurationUnit],
  );

  const resetHireFormState = useCallback(() => {
    setHireContractNotes('');
    setHireContractType('Indefinite');
    setHireDurationAmount(1);
    setHireDurationUnit('Years');
    setHireWorkHoursStart(DEFAULT_WORK_START);
    setHireWorkHoursEnd(DEFAULT_WORK_END);
    setHireFlexibleHours(false);
    setHireRestDays(['Sun']);
    setHireVacationLeave(5);
    setHireSickLeave(5);
    setHireSpecialConditions('');
    setHireOvertimeRate('');
    setHirePaymentSchedule('Every 15th and 30th');
    setHireOtherBenefits('');
    setHireDebtAgreement('');
    setHireDeploymentAgreement('');
    setHireTerminationConditions('');
  }, []);

  const dismissNotification = () => {
    setNotification((prev) => ({ ...prev, visible: false }));
    const fn = afterNotificationClose.current;
    afterNotificationClose.current = null;
    fn?.();
  };

  useEffect(() => {
    fetchApplicantDetails();
  }, []);

  const fetchApplicantDetails = async () => {
    try {
      setLoading(true);

      // Fetch full helper profile + application details
      const response = await fetch(
        `${API_URL}/parent/get_applicant_profile.php?application_id=${applicationId}&helper_id=${helperId}`
      );
      const data = await response.json();

      if (data.success) {
        setApplicant(data.applicant);
        setSharedDocuments(data.shared_documents ?? []);
        setNotes(data.applicant.parent_notes || '');
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      afterNotificationClose.current = () => router.back();
      setNotification({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to load applicant details',
      });
    } finally {
      setLoading(false);
    }
  };

  const openHireFlow = async () => {
    setHireTarget(null);
    setHirePickLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) return;
      const user = JSON.parse(userData);
      const res = await fetch(
        `${API_URL}/parent/get_helper_hire_options.php?parent_id=${user.user_id}&helper_id=${helperId}`,
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not load hire options');
      const apps = (data.applications ?? []).map((a: any) => ({
        application_id: Number(a.application_id),
        job_post_id: Number(a.job_post_id),
        job_title: String(a.job_title ?? ''),
        status: String(a.status ?? ''),
        applied_at: String(a.applied_at ?? ''),
        job_start_date: a.job_start_date ?? null,
        salary_offered: a.salary_offered ?? null,
        salary_period: a.salary_period ?? null,
        employment_type: a.employment_type ?? null,
        work_schedule: a.work_schedule ?? null,
      }));
      if (!data.needs_selection) {
        const curId = Number(applicationId);
        const row = apps.find((a: HireJobOptionRow) => a.application_id === curId) ?? apps[0] ?? null;
        setHireTarget(null);
        setHireContractStartDate(toYmdInput(applicant?.job_start_date));
        resetHireFormState();
        setHireConfirmedSalary(row?.salary_offered != null ? String(row.salary_offered) : '');
        setHireWorkSchedule(row?.work_schedule === 'Part-time' ? 'Part-time' : row?.work_schedule === 'Any' ? 'Any' : 'Full-time');
        setHireTermsVisible(true);
        return;
      }
      setHirePickHelperName(String(data.helper_name ?? applicant?.helper_name ?? 'This helper'));
      setHirePickApps(apps);
      const curId = Number(applicationId);
      const pre = apps.find((a: { application_id: number }) => a.application_id === curId) ?? apps[0] ?? null;
      setHirePickSelectedId(pre?.application_id ?? null);
      setHirePickVisible(true);
    } catch (error: any) {
      setNotification({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Could not start hire',
      });
    } finally {
      setHirePickLoading(false);
    }
  };

  const confirmHireJobPick = () => {
    const row = hirePickApps.find(a => a.application_id === hirePickSelectedId);
    if (!row) return;
    setHireTarget({
      application_id: String(row.application_id),
      job_post_id: String(row.job_post_id),
      job_title: row.job_title,
      job_start_date: row.job_start_date ?? null,
    });
    setHireContractStartDate(toYmdInput(row.job_start_date));
    resetHireFormState();
    setHireConfirmedSalary(row.salary_offered != null ? String(row.salary_offered) : '');
    setHireWorkSchedule(row.work_schedule === 'Part-time' ? 'Part-time' : row.work_schedule === 'Any' ? 'Any' : 'Full-time');
    setHirePickVisible(false);
    setHireTermsVisible(true);
  };

  const confirmHireTerms = () => {
    const warn = (title: string, message: string) => {
      setNotification({ visible: true, type: 'warning', title, message });
    };
    const start = hireContractStartDate.trim();
    if (hireContractType === 'Fixed Term' && start === '') {
      warn('Start date', 'Pick a start date for a Fixed Term contract, or switch to Indefinite.');
      return;
    }
    if (start !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      warn('Start date', 'Employment start must be YYYY-MM-DD, or leave blank to use the job post date.');
      return;
    }
    if (hireContractType === 'Fixed Term' && !hireContractEndDate) {
      warn('Contract end date', 'Could not compute the contract end date. Check the start date and duration.');
      return;
    }
    const salary = parseFloat(hireConfirmedSalary.trim());
    if (!hireConfirmedSalary.trim() || isNaN(salary) || salary <= 0) {
      warn('Salary', 'Enter the confirmed salary for this contract.');
      return;
    }
    if (!hirePaymentSchedule.trim()) {
      warn('Payment schedule', 'Select or enter a salary payment schedule.');
      return;
    }
    if (!hireFlexibleHours && (!hireWorkHoursStart || !hireWorkHoursEnd)) {
      warn('Work hours', 'Set work hours, or turn on Flexible hours.');
      return;
    }
    if (hireRestDays.length === 0) {
      warn('Rest days', 'Select at least one rest day for the contract.');
      return;
    }
    setHireTermsVisible(false);
    setHireConfirmOpen(true);
  };

  const runHire = async () => {
    setHireConfirmOpen(false);
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) return;
      const user = JSON.parse(userData);
      const appId = hireTarget?.application_id ?? applicationId;
      const jpId = hireTarget?.job_post_id ?? jobId;

      const response = await fetch(`${API_URL}/parent/hire_helper.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: appId,
          job_post_id: jpId,
          parent_id: user.user_id,
          helper_id: helperId,
          contract_end_date: hireContractEndDate || '',
          contract_start_date: hireContractStartDate.trim() || undefined,
          contract_terms_notes: hireContractNotes.trim() || undefined,
          contract_duration: hireContractType === 'Indefinite' ? 'Indefinite' : formatDurationString(hireDurationAmount, hireDurationUnit),
          confirmed_salary: parseFloat(hireConfirmedSalary.trim()) || undefined,
          work_hours: workHoursToString(hireWorkHoursStart, hireWorkHoursEnd, hireFlexibleHours),
          rest_days: hireRestDays.length > 0 ? hireRestDays : undefined,
          vacation_leave_days: hireVacationLeave,
          sick_leave_days: hireSickLeave,
          special_conditions: hireSpecialConditions.trim() || undefined,
          overtime_rate: hireOvertimeRate.trim() || undefined,
          payment_schedule: hirePaymentSchedule.trim() || undefined,
          other_benefits: hireOtherBenefits.trim() || undefined,
          debt_agreement: hireDebtAgreement.trim() || undefined,
          deployment_agreement: hireDeploymentAgreement.trim() || undefined,
          termination_conditions: hireTerminationConditions.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setHireTarget(null);
        setHireContractStartDate('');
        setHireConfirmedSalary('');
        setHireWorkSchedule('Full-time');
        resetHireFormState();
        afterNotificationClose.current = () => router.push('/(parent)/jobs');
        setNotification({
          visible: true,
          type: 'success',
          title: 'Success',
          message: `Contract started for ${applicant?.helper_name}. Review and sign in Messages when ready.`,
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || 'Failed to hire helper',
        type: 'error',
        title: 'Error',
      });
    }
  };

  const handleShortlist = async () => {
    try {
      const response = await fetch(
        `${API_URL}/parent/update_application_status.php`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_id: applicationId,
            status: 'Shortlisted',
            parent_notes: notes,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotification({
          visible: true,
          message: 'Applicant shortlisted',
          type: 'success',
        });
        fetchApplicantDetails();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || 'Failed to shortlist',
        type: 'error',
      });
    }
  };

  const runReject = async () => {
    setRejectConfirmOpen(false);
    try {
      const response = await fetch(
        `${API_URL}/parent/update_application_status.php`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_id: applicationId,
            status: 'Rejected',
            parent_notes: notes,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        afterNotificationClose.current = () => router.back();
        setNotification({
          visible: true,
          type: 'success',
          title: 'Applicant rejected',
          message: 'The applicant has been notified of this decision.',
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || 'Failed to reject',
        type: 'error',
        title: 'Error',
      });
    }
  };

  const handleSaveNotes = async () => {
    try {
      const response = await fetch(
        `${API_URL}/parent/update_application_status.php`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_id: applicationId,
            status: applicant?.status,
            parent_notes: notes,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotification({
          visible: true,
          message: 'Notes saved',
          type: 'success',
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || 'Failed to save notes',
        type: 'error',
      });
    }
  };

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading profile..." />;
  }

  if (!applicant) {
    return (
      <View style={styles.container}>
        <Text>Applicant not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NotificationModal
        visible={notification.visible}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onClose={dismissNotification}
        autoClose={notification.type === 'success'}
        duration={2200}
      />

      <HireContractTermsModal
        visible={hireTermsVisible}
        jobTitle={hireTarget?.job_title ?? 'this position'}
        helperName={applicant.helper_name}
        workSchedule={hireWorkSchedule}
        contractStartDate={hireContractStartDate}
        onChangeStart={setHireContractStartDate}
        contractType={hireContractType}
        onChangeContractType={setHireContractType}
        durationAmount={hireDurationAmount}
        onChangeDurationAmount={setHireDurationAmount}
        durationUnit={hireDurationUnit}
        onChangeDurationUnit={setHireDurationUnit}
        confirmedSalary={hireConfirmedSalary}
        onChangeSalary={setHireConfirmedSalary}
        paymentSchedule={hirePaymentSchedule}
        onChangePaymentSchedule={setHirePaymentSchedule}
        workHoursStart={hireWorkHoursStart}
        workHoursEnd={hireWorkHoursEnd}
        onChangeWorkHoursStart={setHireWorkHoursStart}
        onChangeWorkHoursEnd={setHireWorkHoursEnd}
        flexibleHours={hireFlexibleHours}
        onChangeFlexibleHours={setHireFlexibleHours}
        restDays={hireRestDays}
        onToggleRestDay={(day) => setHireRestDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])}
        vacationLeaveDays={hireVacationLeave}
        sickLeaveDays={hireSickLeave}
        onChangeVacationLeave={setHireVacationLeave}
        onChangeSickLeave={setHireSickLeave}
        overtimeRate={hireOvertimeRate}
        onChangeOvertimeRate={setHireOvertimeRate}
        otherBenefits={hireOtherBenefits}
        onChangeOtherBenefits={setHireOtherBenefits}
        debtAgreement={hireDebtAgreement}
        onChangeDebtAgreement={setHireDebtAgreement}
        deploymentAgreement={hireDeploymentAgreement}
        onChangeDeploymentAgreement={setHireDeploymentAgreement}
        terminationConditions={hireTerminationConditions}
        onChangeTerminationConditions={setHireTerminationConditions}
        specialConditions={hireSpecialConditions}
        onChangeSpecialConditions={setHireSpecialConditions}
        contractNotes={hireContractNotes}
        onChangeNotes={setHireContractNotes}
        onCancel={() => { setHireTermsVisible(false); setHireTarget(null); }}
        onContinue={confirmHireTerms}
      />

      <HireJobPickerModal
        visible={hirePickVisible}
        helperName={hirePickHelperName}
        accentColor={theme.color.parent}
        applications={hirePickApps}
        selectedId={hirePickSelectedId}
        onSelect={setHirePickSelectedId}
        onCancel={() => setHirePickVisible(false)}
        onContinue={confirmHireJobPick}
      />

      <ConfirmationModal
        visible={hireConfirmOpen}
        title="Start employment contract?"
        message={`Create a draft contract for "${hireTarget?.job_title ?? 'this position'}" with ${applicant.helper_name}, ${hireContractType === 'Indefinite' ? 'with no fixed end date (Indefinite)' : `ending ${hireContractEndDate || '(set date)'}`}. The hire is not final until both of you review and confirm.`}
        confirmText="Continue"
        cancelText="Cancel"
        type="success"
        onConfirm={runHire}
        onCancel={() => {
          setHireConfirmOpen(false);
          setHireTarget(null);
          setHireContractStartDate('');
          setHireConfirmedSalary('');
          setHireWorkSchedule('Full-time');
          resetHireFormState();
        }}
      />

      <ConfirmationModal
        visible={rejectConfirmOpen}
        title="Reject applicant"
        message={`Reject ${applicant?.helper_name}? This cannot be undone from here.`}
        confirmText="Reject"
        cancelText="Cancel"
        type="danger"
        onConfirm={runReject}
        onCancel={() => setRejectConfirmOpen(false)}
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
        <Text style={styles.headerTitle}>Applicant Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {applicant.helper_photo ? (
            <Image
              source={{ uri: applicant.helper_photo }}
              style={styles.profilePhoto}
            />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Ionicons name="person" size={50} color="#ccc" />
            </View>
          )}

          <Text style={styles.name}>{applicant.helper_name}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              {applicant.helper_age} years old • {applicant.helper_gender}
            </Text>
          </View>

          {applicant.helper_rating_average !== undefined &&
            applicant.helper_rating_count &&
            applicant.helper_rating_count > 0 && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FF9500" />
                <Text style={styles.ratingText}>
                  {applicant.helper_rating_average.toFixed(1)} (
                  {applicant.helper_rating_count} reviews)
                </Text>
              </View>
            )}

          {/* Categories */}
          {applicant.helper_categories && applicant.helper_categories.length > 0 && (
            <View style={styles.categoriesRow}>
              {applicant.helper_categories.map((cat, idx) => (
                <View key={idx} style={styles.categoryPill}>
                  <Text style={styles.categoryText}>{cat}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.locationText}>
              {applicant.helper_municipality}, {applicant.helper_province}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              applicant.status === 'Shortlisted' && styles.statusShortlisted,
              applicant.status === 'Rejected' && styles.statusRejected,
            ]}
          >
            <Text style={styles.statusText}>{applicant.status}</Text>
          </View>
        </View>

        {/* Experience */}
        {applicant.helper_experience_years !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            <Text style={styles.sectionText}>
              {applicant.helper_experience_years} years of experience
            </Text>
          </View>
        )}

        {/* Expected Salary */}
        {applicant.helper_expected_salary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expected Salary</Text>
            <Text style={styles.sectionText}>
              ₱{applicant.helper_expected_salary.toLocaleString()}/month
            </Text>
          </View>
        )}

        {/* Bio */}
        {applicant.helper_bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.sectionText}>{applicant.helper_bio}</Text>
          </View>
        )}

        {/* Cover Letter */}
        {applicant.cover_letter && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cover Letter</Text>
            <Text style={styles.sectionText}>{applicant.cover_letter}</Text>
          </View>
        )}

        {/* Shared Documents — only what the helper explicitly chose to share with this application */}
        {sharedDocuments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shared Documents</Text>
            <Text style={[styles.sectionText, { marginBottom: 10, color: '#999' }]}>
              The helper chose to share these verified documents with you for this application.
            </Text>
            <View style={{ gap: 8 }}>
              {sharedDocuments.map((doc) => (
                <TouchableOpacity
                  key={doc.document_id}
                  style={styles.docRow}
                  activeOpacity={0.8}
                  onPress={() => doc.file_url && Linking.openURL(doc.file_url)}
                >
                  <View style={styles.docIconBox}>
                    <Ionicons name="document-text" size={18} color={theme.color.parent} />
                  </View>
                  <Text style={styles.docTitle}>{doc.document_type}</Text>
                  <Ionicons name="open-outline" size={18} color="#999" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Contact */}
        {applicant.helper_contact_number && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <Text style={styles.sectionText}>
              {applicant.helper_contact_number}
            </Text>
          </View>
        )}

        {/* Applied Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Applied</Text>
          <Text style={styles.sectionText}>
            {new Date(applicant.applied_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Private Notes */}
        <View style={styles.section}>
          <View style={styles.notesTitleRow}>
            <Text style={styles.sectionTitle}>Private Notes</Text>
            <TouchableOpacity onPress={handleSaveNotes} activeOpacity={0.7}>
              <Text style={styles.saveNotesButton}>Save</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="Add private notes about this applicant..."
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {applicant.status !== 'Accepted'
        && applicant.status !== 'Rejected'
        && applicant.status !== 'Withdrawn'
        && applicant.status !== 'contract_pending'
        && applicant.status !== 'hired'
        && applicant.status !== 'auto_rejected' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => setRejectConfirmOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>

          {applicant.status !== 'Shortlisted' && (
            <TouchableOpacity
              style={styles.shortlistButton}
              onPress={handleShortlist}
              activeOpacity={0.7}
            >
              <Ionicons name="bookmark" size={20} color="#007AFF" />
              <Text style={styles.shortlistButtonText}>Shortlist</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.hireButton}
            onPress={() => { void openHireFlow(); }}
            activeOpacity={0.7}
            disabled={hirePickLoading}
          >
            {hirePickLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.hireButtonText}>Hire</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {applicant.status === 'Accepted' && (
        <View style={styles.hiredBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#34C759" />
          <Text style={styles.hiredText}>You hired this helper!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  infoRow: {
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusShortlisted: {
    backgroundColor: '#007AFF',
  },
  statusRejected: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 12,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  notesTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saveNotesButton: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1A1C1E',
    minHeight: 100,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF3B30',
  },
  shortlistButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  shortlistButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
  },
  hireButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#34C759',
  },
  hireButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  hiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    backgroundColor: '#E8F5E9',
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9',
  },
  hiredText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
  },
});
