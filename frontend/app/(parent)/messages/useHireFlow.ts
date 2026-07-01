// app/(parent)/messages/useHireFlow.ts
import { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { getContractTermsUrl, editContractUrl } from '@/constants/applications';
import {
  toYmdInput,
  computeContractEndDate,
  formatDurationString,
  workHoursToString,
  parseDurationString,
  parseWorkHoursString,
  DEFAULT_WORK_START,
  DEFAULT_WORK_END,
  type HireJobOptionRow,
  type DurationUnit,
} from '@/components/parent/hire';
import { ResolvedApplication } from './helpers';

export function useHireFlow({
  resolvedApp, setResolvedApp, partnerId, partnerName,
  setHiringAction, fetchMessages, loadResolvedApp, showChatNotif,
}: {
  resolvedApp: ResolvedApplication | null;
  setResolvedApp: (app: ResolvedApplication | null) => void;
  partnerId: number;
  partnerName: string;
  setHiringAction: (v: boolean) => void;
  fetchMessages: () => void;
  loadResolvedApp: () => Promise<void>;
  showChatNotif: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const [contractFlowMode, setContractFlowMode] = useState<'hire' | 'edit'>('hire');
  const [hirePickVisible, setHirePickVisible] = useState(false);
  const [hirePickHelperName, setHirePickHelperName] = useState('');
  const [hirePickApps, setHirePickApps] = useState<HireJobOptionRow[]>([]);
  const [hirePickSelectedId, setHirePickSelectedId] = useState<number | null>(null);
  const [hirePayload, setHirePayload] = useState<{
    application_id: number;
    job_post_id: number;
    job_title: string;
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
  const [hireDebtAmount, setHireDebtAmount] = useState('');
  const [hireDeploymentAgreement, setHireDeploymentAgreement] = useState('');
  const [hireTerminationConditions, setHireTerminationConditions] = useState('');
  const [hireConfirmVisible, setHireConfirmVisible] = useState(false);
  const [rejectConfirmVisible, setRejectConfirmVisible] = useState(false);

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
    setHireDebtAmount('');
    setHireDeploymentAgreement('');
    setHireTerminationConditions('');
  }, []);

  const beginHireFlow = async () => {
    if (!resolvedApp) return;
    setContractFlowMode('hire');
    setHiringAction(true);
    setHirePayload(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res = await fetch(
        `${API_URL}/parent/get_helper_hire_options.php?parent_id=${user.user_id}&helper_id=${partnerId}`,
      );
      const data = await res.json() as {
        success?: boolean;
        message?: string;
        needs_selection?: boolean;
        helper_name?: string;
        applications?: Array<{
          application_id: number;
          job_post_id: number;
          job_title: string;
          status: string;
          applied_at: string;
          job_start_date?: string | null;
          salary_offered?: number | null;
          salary_period?: string | null;
          employment_type?: string | null;
          work_schedule?: string | null;
        }>;
      };
      if (!data.success) throw new Error(data.message || 'Could not load hire options');
      const apps = (data.applications ?? []).map(a => ({
        application_id: Number(a.application_id),
        job_post_id:    Number(a.job_post_id),
        job_title:      String(a.job_title ?? ''),
        status:         String(a.status ?? ''),
        applied_at:     String(a.applied_at ?? ''),
        job_start_date: a.job_start_date ?? null,
        salary_offered: a.salary_offered ?? null,
        salary_period:  a.salary_period ?? null,
        employment_type: a.employment_type ?? null,
        work_schedule:  a.work_schedule ?? null,
      }));
      if (!data.needs_selection) {
        const row = apps.find(a => a.application_id === resolvedApp.application_id) ?? apps[0] ?? null;
        setHirePayload({
          application_id: resolvedApp.application_id,
          job_post_id:    resolvedApp.job_post_id,
          job_title:      resolvedApp.job_title,
          job_start_date: resolvedApp.job_start_date ?? null,
        });
        setHireContractStartDate(toYmdInput(resolvedApp.job_start_date));
        resetHireFormState();
        setHireConfirmedSalary(row?.salary_offered != null ? String(row.salary_offered) : '');
        setHireWorkSchedule(row?.work_schedule === 'Part-time' ? 'Part-time' : row?.work_schedule === 'Any' ? 'Any' : 'Full-time');
        setHireTermsVisible(true);
        return;
      }
      setHirePickHelperName(String(data.helper_name ?? partnerName));
      setHirePickApps(apps);
      const pre =
        apps.find(a => a.application_id === resolvedApp.application_id) ?? apps[0] ?? null;
      setHirePickSelectedId(pre?.application_id ?? null);
      setHirePickVisible(true);
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not start hire', 'error');
    } finally {
      setHiringAction(false);
    }
  };

  const confirmHireJobSelection = () => {
    const row = hirePickApps.find(a => a.application_id === hirePickSelectedId);
    if (!row) return;
    setHirePayload({
      application_id: row.application_id,
      job_post_id:    row.job_post_id,
      job_title:      row.job_title,
      job_start_date: row.job_start_date ?? null,
    });
    setHireContractStartDate(toYmdInput(row.job_start_date));
    resetHireFormState();
    setHireConfirmedSalary(row.salary_offered != null ? String(row.salary_offered) : '');
    setHireWorkSchedule(row.work_schedule === 'Part-time' ? 'Part-time' : row.work_schedule === 'Any' ? 'Any' : 'Full-time');
    setHirePickVisible(false);
    setHireTermsVisible(true);
  };

  const beginEditContractFlow = async () => {
    if (!resolvedApp) return;
    setContractFlowMode('edit');
    setHiringAction(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res = await fetch(
        `${getContractTermsUrl()}?application_id=${resolvedApp.application_id}&parent_id=${user.user_id}&requester_id=${user.user_id}`,
      );
      const data = await res.json() as {
        success?: boolean;
        message?: string;
        job_post_id?: number;
        job_title?: string;
        work_schedule?: string | null;
        contract?: {
          employment_start_date?: string | null;
          terms_notes?: string | null;
          contract_duration?: string | null;
          confirmed_salary?: number | null;
          work_hours?: string | null;
          rest_days?: string[];
          vacation_leave_days?: number | null;
          sick_leave_days?: number | null;
          special_conditions?: string | null;
          overtime_rate?: string | null;
          payment_schedule?: string | null;
          other_benefits?: string | null;
          debt_agreement?: string | null;
          debt_amount?: number | null;
          deployment_agreement?: string | null;
          termination_conditions?: string | null;
        };
      };
      if (!data.success) throw new Error(data.message || 'Could not load contract terms');
      const c = data.contract ?? {};

      setHirePayload({
        application_id: resolvedApp.application_id,
        job_post_id:    Number(data.job_post_id ?? resolvedApp.job_post_id),
        job_title:      String(data.job_title ?? resolvedApp.job_title),
        job_start_date: c.employment_start_date ?? resolvedApp.job_start_date ?? null,
      });
      setHireContractStartDate(toYmdInput(c.employment_start_date ?? resolvedApp.job_start_date));

      const duration = parseDurationString(c.contract_duration ?? '');
      setHireContractType(duration.contractType);
      setHireDurationAmount(duration.amount);
      setHireDurationUnit(duration.unit);

      setHireConfirmedSalary(c.confirmed_salary != null ? String(c.confirmed_salary) : '');
      setHireWorkSchedule(data.work_schedule === 'Part-time' ? 'Part-time' : data.work_schedule === 'Any' ? 'Any' : 'Full-time');

      const hours = parseWorkHoursString(c.work_hours ?? '');
      setHireWorkHoursStart(hours.start);
      setHireWorkHoursEnd(hours.end);
      setHireFlexibleHours(hours.flexible);

      setHireRestDays(c.rest_days && c.rest_days.length > 0 ? c.rest_days : ['Sun']);
      setHireVacationLeave(c.vacation_leave_days ?? 5);
      setHireSickLeave(c.sick_leave_days ?? 5);
      setHireSpecialConditions(c.special_conditions ?? '');
      setHireOvertimeRate(c.overtime_rate ?? '');
      setHirePaymentSchedule(c.payment_schedule ?? 'Every 15th and 30th');
      setHireOtherBenefits(c.other_benefits ?? '');
      setHireDebtAgreement(c.debt_agreement ?? '');
      setHireDebtAmount(c.debt_amount != null ? String(c.debt_amount) : '');
      setHireDeploymentAgreement(c.deployment_agreement ?? '');
      setHireTerminationConditions(c.termination_conditions ?? '');
      setHireContractNotes(c.terms_notes ?? '');

      setHireTermsVisible(true);
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not load contract terms', 'error');
    } finally {
      setHiringAction(false);
    }
  };

  const confirmHireTerms = () => {
    const start = hireContractStartDate.trim();
    if (hireContractType === 'Fixed Term' && start === '') {
      showChatNotif('Pick a start date for a Fixed Term contract, or switch to Indefinite.', 'warning');
      return;
    }
    if (start !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      showChatNotif('Employment start must be YYYY-MM-DD, or leave blank to use the job post date.', 'warning');
      return;
    }
    if (hireContractType === 'Fixed Term' && !hireContractEndDate) {
      showChatNotif('Could not compute the contract end date. Check the start date and duration.', 'warning');
      return;
    }
    const salary = parseFloat(hireConfirmedSalary.trim());
    if (!hireConfirmedSalary.trim() || isNaN(salary) || salary <= 0) {
      showChatNotif('Enter the confirmed salary for this contract.', 'warning');
      return;
    }
    if (!hirePaymentSchedule.trim()) {
      showChatNotif('Select or enter a salary payment schedule.', 'warning');
      return;
    }
    if (!hireFlexibleHours && (!hireWorkHoursStart || !hireWorkHoursEnd)) {
      showChatNotif('Set work hours, or turn on Flexible hours.', 'warning');
      return;
    }
    if (hireRestDays.length === 0) {
      showChatNotif('Select at least one rest day for the contract.', 'warning');
      return;
    }
    setHireTermsVisible(false);
    setHireConfirmVisible(true);
  };

  const executeHire = async () => {
    if (!resolvedApp) return;
    const appId = hirePayload?.application_id ?? resolvedApp.application_id;
    const jpId  = hirePayload?.job_post_id ?? resolvedApp.job_post_id;
    setHireConfirmVisible(false);
    setHiringAction(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/parent/hire_helper.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: appId,
          job_post_id:    jpId,
          parent_id:      user.user_id,
          helper_id:      partnerId,
          requester_id:   user.user_id,
          contract_end_date:      hireContractEndDate || '',
          contract_start_date:    hireContractStartDate.trim() || undefined,
          contract_terms_notes:   hireContractNotes.trim() || undefined,
          contract_duration:      hireContractType === 'Indefinite' ? 'Indefinite' : formatDurationString(hireDurationAmount, hireDurationUnit),
          confirmed_salary:       parseFloat(hireConfirmedSalary.trim()) || undefined,
          work_hours:             workHoursToString(hireWorkHoursStart, hireWorkHoursEnd, hireFlexibleHours),
          rest_days:              hireRestDays.length > 0 ? hireRestDays : undefined,
          vacation_leave_days:    hireVacationLeave,
          sick_leave_days:        hireSickLeave,
          special_conditions:     hireSpecialConditions.trim() || undefined,
          overtime_rate:          hireOvertimeRate.trim() || undefined,
          payment_schedule:       hirePaymentSchedule.trim() || undefined,
          other_benefits:         hireOtherBenefits.trim() || undefined,
          debt_agreement:         hireDebtAgreement.trim() || undefined,
          debt_amount:            hireDebtAmount.trim() || undefined,
          deployment_agreement:   hireDeploymentAgreement.trim() || undefined,
          termination_conditions: hireTerminationConditions.trim() || undefined,
        }),
      });
      const hireData = await res.json() as {
        success?: boolean;
        message?: string;
        contract_pdf_url?: string | null;
        contract_generation_error?: string | null;
      };
      if (!hireData.success) throw new Error(hireData.message || 'Could not start contract');

      setHirePayload(null);
      setHireContractStartDate('');
      setHireConfirmedSalary('');
      setHireWorkSchedule('Full-time');
      resetHireFormState();
      await loadResolvedApp();
      fetchMessages();

      const contractErr = hireData.contract_generation_error ?? null;
      if (contractErr) {
        showChatNotif(
          `Contract draft started but the PDF file failed: ${contractErr}`,
          'warning',
        );
      } else {
        showChatNotif(
          'Draft contract created. You and the helper must review and confirm before the hire is final.',
          'success',
        );
      }
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not start contract', 'error');
    } finally {
      setHiringAction(false);
    }
  };

  const executeEditContract = async () => {
    if (!resolvedApp || !hirePayload) return;
    const appId = hirePayload.application_id;
    const jpId  = hirePayload.job_post_id;
    setHireConfirmVisible(false);
    setHiringAction(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res  = await fetch(editContractUrl(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: appId,
          job_post_id:    jpId,
          parent_id:      user.user_id,
          helper_id:      partnerId,
          requester_id:   user.user_id,
          contract_end_date:      hireContractEndDate || '',
          contract_start_date:    hireContractStartDate.trim() || undefined,
          contract_terms_notes:   hireContractNotes.trim() || undefined,
          contract_duration:      hireContractType === 'Indefinite' ? 'Indefinite' : formatDurationString(hireDurationAmount, hireDurationUnit),
          confirmed_salary:       parseFloat(hireConfirmedSalary.trim()) || undefined,
          work_hours:             workHoursToString(hireWorkHoursStart, hireWorkHoursEnd, hireFlexibleHours),
          rest_days:              hireRestDays.length > 0 ? hireRestDays : undefined,
          vacation_leave_days:    hireVacationLeave,
          sick_leave_days:        hireSickLeave,
          special_conditions:     hireSpecialConditions.trim() || undefined,
          overtime_rate:          hireOvertimeRate.trim() || undefined,
          payment_schedule:       hirePaymentSchedule.trim() || undefined,
          other_benefits:         hireOtherBenefits.trim() || undefined,
          debt_agreement:         hireDebtAgreement.trim() || undefined,
          debt_amount:            hireDebtAmount.trim() || undefined,
          deployment_agreement:   hireDeploymentAgreement.trim() || undefined,
          termination_conditions: hireTerminationConditions.trim() || undefined,
        }),
      });
      const editData = await res.json() as {
        success?: boolean;
        message?: string;
        contract_pdf_url?: string | null;
        contract_generation_error?: string | null;
      };
      if (!editData.success) throw new Error(editData.message || 'Could not update contract');

      setHirePayload(null);
      setHireContractStartDate('');
      setHireConfirmedSalary('');
      setHireWorkSchedule('Full-time');
      resetHireFormState();
      await loadResolvedApp();
      fetchMessages();

      const contractErr = editData.contract_generation_error ?? null;
      if (contractErr) {
        showChatNotif(
          `Contract updated but the PDF file failed: ${contractErr}`,
          'warning',
        );
      } else {
        showChatNotif(
          'Contract updated. Waiting for both parties to confirm again.',
          'success',
        );
      }
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not update contract', 'error');
    } finally {
      setHiringAction(false);
    }
  };

  const openRejectConfirm = () => {
    if (!resolvedApp) return;
    setRejectConfirmVisible(true);
  };

  const executeReject = async () => {
    if (!resolvedApp) return;
    setRejectConfirmVisible(false);
    setHiringAction(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const requesterId = raw ? JSON.parse(raw)?.user_id : null;
      const res = await fetch(`${API_URL}/parent/update_application_status.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: resolvedApp.application_id,
          status:           'Rejected',
          parent_notes:     'Not selected for this role.',
          requester_id:     requesterId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Update failed');
      setResolvedApp({ ...resolvedApp, status: 'Rejected' });
      fetchMessages();
      showChatNotif('Application rejected.', 'info');
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not update', 'error');
    } finally {
      setHiringAction(false);
    }
  };

  return {
    contractFlowMode,
    hirePickVisible, setHirePickVisible,
    hirePickHelperName,
    hirePickApps,
    hirePickSelectedId, setHirePickSelectedId,
    hirePayload, setHirePayload,
    hireTermsVisible, setHireTermsVisible,
    hireContractStartDate, setHireContractStartDate,
    hireContractType, setHireContractType,
    hireDurationAmount, setHireDurationAmount,
    hireDurationUnit, setHireDurationUnit,
    hireContractNotes, setHireContractNotes,
    hireConfirmedSalary, setHireConfirmedSalary,
    hireWorkSchedule, setHireWorkSchedule,
    hireWorkHoursStart, setHireWorkHoursStart,
    hireWorkHoursEnd, setHireWorkHoursEnd,
    hireFlexibleHours, setHireFlexibleHours,
    hireRestDays, setHireRestDays,
    hireVacationLeave, setHireVacationLeave,
    hireSickLeave, setHireSickLeave,
    hireSpecialConditions, setHireSpecialConditions,
    hireOvertimeRate, setHireOvertimeRate,
    hirePaymentSchedule, setHirePaymentSchedule,
    hireOtherBenefits, setHireOtherBenefits,
    hireDebtAgreement, setHireDebtAgreement,
    hireDebtAmount, setHireDebtAmount,
    hireDeploymentAgreement, setHireDeploymentAgreement,
    hireTerminationConditions, setHireTerminationConditions,
    hireContractEndDate,
    resetHireFormState,
    hireConfirmVisible, setHireConfirmVisible,
    rejectConfirmVisible, setRejectConfirmVisible,
    beginHireFlow, confirmHireJobSelection, beginEditContractFlow, confirmHireTerms,
    executeHire, executeEditContract, openRejectConfirm, executeReject,
  };
}
