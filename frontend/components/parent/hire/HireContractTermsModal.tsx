import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, Switch, Platform, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateField, TimeField } from '@/components/shared';
import { hireContractTermsStyles as s } from '@/components/parent/hire/HireContractTermsModal.styles';
import {
  DURATION_UNITS,
  computeContractEndDate,
  countInclusiveCalendarDays,
  formatLongDate,
  type DurationUnit,
} from '@/components/parent/hire/hireFlowDates';
import { computeScheduledWorkHours, computeWorkHoursLabel } from '@/components/parent/hire/hireFlowWorkHours';
import { CARELINK_MINIMUM_MONTHLY_SALARY } from '@/components/parent/hire/hireJobOption';
import { payoutBreakdown, peso, type SalaryPeriod } from '@/lib/salary';
import { BROWN, CARAMEL, SUBTLE, DIVIDER, SURFACE, GREEN } from '@/components/parent/home/parentWarmTheme';

const REST_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LEAVE_OPTIONS = [5, 10, 15, 20, 30];
const PAYMENT_SCHEDULE_DAILY = 'Daily';
const PAYMENT_SCHEDULE_WEEKLY = 'Every week';
const PAYMENT_SCHEDULE_SEMI = 'Every 15th and 30th';
const PAYMENT_SCHEDULE_MONTHLY = 'Every end of month';
const PAYMENT_SCHEDULE_PERIODS: Record<string, SalaryPeriod> = {
  [PAYMENT_SCHEDULE_DAILY]: 'Daily',
  [PAYMENT_SCHEDULE_WEEKLY]: 'Weekly',
  [PAYMENT_SCHEDULE_SEMI]: 'Semi-monthly',
  [PAYMENT_SCHEDULE_MONTHLY]: 'Monthly',
};
const KNOWN_PAYMENT_SCHEDULES = [
  PAYMENT_SCHEDULE_DAILY,
  PAYMENT_SCHEDULE_WEEKLY,
  PAYMENT_SCHEDULE_SEMI,
  PAYMENT_SCHEDULE_MONTHLY,
];

type ContractType = 'Fixed Term' | 'Indefinite';
type WorkScheduleType = 'Full-time' | 'Part-time' | 'Any';

type Props = {
  visible: boolean;
  jobTitle: string;
  helperName: string;
  workSchedule: WorkScheduleType;
  minimumSalary: number;
  jobPostSalaryMin?: number | null;
  jobPostSalaryMax?: number | null;
  hasJobPostDefaults?: boolean;
  onPrefillFromJobPost?: () => void;

  contractStartDate: string;
  onChangeStart: (v: string) => void;
  contractType: ContractType;
  onChangeContractType: (v: ContractType) => void;
  durationAmount: number;
  onChangeDurationAmount: (v: number) => void;
  durationUnit: DurationUnit;
  onChangeDurationUnit: (v: DurationUnit) => void;

  confirmedSalary: string;
  onChangeSalary: (v: string) => void;
  paymentSchedule: string;
  onChangePaymentSchedule: (v: string) => void;

  workHoursStart: string;
  workHoursEnd: string;
  onChangeWorkHoursStart: (v: string) => void;
  onChangeWorkHoursEnd: (v: string) => void;
  flexibleHours: boolean;
  onChangeFlexibleHours: (v: boolean) => void;
  restDays: string[];
  onToggleRestDay: (day: string) => void;

  vacationLeaveDays: number;
  sickLeaveDays: number;
  onChangeVacationLeave: (v: number) => void;
  onChangeSickLeave: (v: number) => void;

  overtimeRate: string;
  onChangeOvertimeRate: (v: string) => void;
  otherBenefits: string;
  onChangeOtherBenefits: (v: string) => void;
  debtAgreement: string;
  onChangeDebtAgreement: (v: string) => void;
  debtAmount: string;
  onChangeDebtAmount: (v: string) => void;
  deploymentAgreement: string;
  onChangeDeploymentAgreement: (v: string) => void;
  terminationConditions: string;
  onChangeTerminationConditions: (v: string) => void;
  specialConditions: string;
  onChangeSpecialConditions: (v: string) => void;
  contractNotes: string;
  onChangeNotes: (v: string) => void;

  onCancel: () => void;
  onContinue: () => void;
};

export function HireContractTermsModal({
  visible,
  jobTitle,
  helperName,
  workSchedule,
  minimumSalary,
  jobPostSalaryMin,
  jobPostSalaryMax,
  hasJobPostDefaults = false,
  onPrefillFromJobPost,
  contractStartDate,
  onChangeStart,
  contractType,
  onChangeContractType,
  durationAmount,
  onChangeDurationAmount,
  durationUnit,
  onChangeDurationUnit,
  confirmedSalary,
  onChangeSalary,
  paymentSchedule,
  onChangePaymentSchedule,
  workHoursStart,
  workHoursEnd,
  onChangeWorkHoursStart,
  onChangeWorkHoursEnd,
  flexibleHours,
  onChangeFlexibleHours,
  restDays,
  onToggleRestDay,
  vacationLeaveDays,
  sickLeaveDays,
  onChangeVacationLeave,
  onChangeSickLeave,
  overtimeRate,
  onChangeOvertimeRate,
  otherBenefits,
  onChangeOtherBenefits,
  debtAgreement,
  onChangeDebtAgreement,
  debtAmount,
  onChangeDebtAmount,
  deploymentAgreement,
  onChangeDeploymentAgreement,
  terminationConditions,
  onChangeTerminationConditions,
  specialConditions,
  onChangeSpecialConditions,
  contractNotes,
  onChangeNotes,
  onCancel,
  onContinue,
}: Props) {
  const [customPayment, setCustomPayment] = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width < 768;

  const isPartTime = workSchedule === 'Part-time';
  const schedulePillText = workSchedule === 'Any'
    ? 'Work schedule to be agreed'
    : `${workSchedule} schedule`;
  const isKnownSchedule = KNOWN_PAYMENT_SCHEDULES.includes(paymentSchedule);
  const showCustomPaymentInput = customPayment || (paymentSchedule !== '' && !isKnownSchedule);
  const minimumMonthlySalary = Math.max(CARELINK_MINIMUM_MONTHLY_SALARY, minimumSalary);

  const computedEndDate = useMemo(
    () => computeContractEndDate(contractStartDate, contractType, durationAmount, durationUnit),
    [contractStartDate, contractType, durationAmount, durationUnit]
  );
  const endDateLabel = computedEndDate ? formatLongDate(computedEndDate) : null;
  const maximumFixedTermEndDate = contractStartDate
    ? computeContractEndDate(contractStartDate, 'Fixed Term', 2, 'Years')
    : '';
  const maximumFixedTermDays = maximumFixedTermEndDate
    ? countInclusiveCalendarDays(contractStartDate, maximumFixedTermEndDate) ?? 731
    : 731;
  const maxDurationAmount = durationUnit === 'Days'
    ? maximumFixedTermDays
    : durationUnit === 'Weeks' ? 104 : durationUnit === 'Months' ? 24 : 2;
  const fixedTermDays = computedEndDate
    ? countInclusiveCalendarDays(contractStartDate, computedEndDate)
    : null;
  const fixedTermWithinMaximum =
    !!computedEndDate && !!maximumFixedTermEndDate && computedEndDate <= maximumFixedTermEndDate;
  const fixedTermDurationValid =
    contractType === 'Indefinite' ||
    (fixedTermDays !== null && fixedTermDays >= 30 && fixedTermWithinMaximum);
  const employmentStartDateValid = countInclusiveCalendarDays(contractStartDate, contractStartDate) !== null;
  const scheduledWorkHours = flexibleHours
    ? null
    : computeScheduledWorkHours(workHoursStart, workHoursEnd);
  const scheduledWorkHoursValid = flexibleHours ||
    (scheduledWorkHours !== null && scheduledWorkHours > 0 && scheduledWorkHours <= 12);
  const workHoursLabel = flexibleHours ? null : computeWorkHoursLabel(workHoursStart, workHoursEnd);

  const salaryNum = Number(confirmedSalary.trim());
  const salaryValid = Number.isFinite(salaryNum) && salaryNum >= minimumMonthlySalary;
  const showSalaryWarning = confirmedSalary.trim() !== '' && !salaryValid;
  const payoutPeriod = PAYMENT_SCHEDULE_PERIODS[paymentSchedule] ?? null;
  const payoutEstimate = salaryValid && payoutPeriod
    ? payoutBreakdown(salaryNum, payoutPeriod)
    : null;
  const missingTerms = [
    ...(!employmentStartDateValid ? ['start date'] : []),
    ...(!salaryValid ? ['monthly salary'] : []),
    ...(!paymentSchedule.trim() ? ['payment schedule'] : []),
    ...(!scheduledWorkHoursValid ? ['valid work hours (up to 12 hours/day)'] : []),
    ...(restDays.length === 0 ? ['at least one rest day'] : []),
    ...(!fixedTermDurationValid ? ['valid contract duration'] : []),
  ];
  const canContinue = missingTerms.length === 0;

  useEffect(() => {
    if (KNOWN_PAYMENT_SCHEDULES.includes(paymentSchedule)) setCustomPayment(false);
  }, [paymentSchedule]);

  // RA 10364 (Anti-Trafficking) safeguard: flag debt/deployment amounts that
  // exceed one month's salary — a classic debt-bondage risk indicator.
  const debtAmountNum = parseFloat(debtAmount.trim());
  const monthlySalaryEquivalent = salaryNum;
  const showDebtWarning =
    !isNaN(debtAmountNum) && debtAmountNum > 0 &&
    !isNaN(monthlySalaryEquivalent) && monthlySalaryEquivalent > 0 &&
    debtAmountNum > monthlySalaryEquivalent;

  const filledAdditionalCount = [
    overtimeRate,
    otherBenefits,
    debtAgreement,
    deploymentAgreement,
    terminationConditions,
    specialConditions,
    contractNotes,
  ].filter((v) => v.trim() !== '').length;

  const [durationText, setDurationText] = useState(String(durationAmount));
  const [durationFocused, setDurationFocused] = useState(false);

  useEffect(() => {
    if (!durationFocused) setDurationText(String(durationAmount));
  }, [durationAmount, durationFocused]);

  const handleDurationAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 3);
    if (digits === '') {
      setDurationText('');
      return;
    }
    setDurationText(digits);
    onChangeDurationAmount(parseInt(digits, 10));
  };

  const normalizeDurationAmount = (amount: number, unit: DurationUnit) => {
    const minimum = unit === 'Days' ? 30 : unit === 'Weeks' ? 5 : 1;
    const maximum = unit === 'Days'
      ? maximumFixedTermDays
      : unit === 'Weeks' ? 104 : unit === 'Months' ? 24 : 2;
    return Math.min(maximum, Math.max(minimum, amount));
  };

  useEffect(() => {
    if (contractType === 'Fixed Term' && durationAmount > maxDurationAmount) {
      onChangeDurationAmount(maxDurationAmount);
    }
  }, [contractType, durationAmount, maxDurationAmount, onChangeDurationAmount]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[s.overlay, isMobile ? s.overlayMobile : s.overlayDesktop]}>
        <View style={[s.card, isMobile && s.cardMobile]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={s.header}>
              <View style={s.headerText}>
                <Text style={s.title}>Review hiring terms</Text>
                <Text style={s.headerSub}>
                  {helperName || 'Helper'} · {jobTitle}
                </Text>
              </View>
              <TouchableOpacity
                style={s.closeButton}
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel="Close contract terms"
              >
                <Ionicons name="close" size={24} color={BROWN} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={s.list}
              contentContainerStyle={s.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={!isMobile}
            >
              <View style={s.bodyPad}>
                <Text style={s.sub}>
                  These details will appear in the draft. The hire is finalized after both parties review and sign.
                </Text>
              <View style={s.preFillBanner}>
                <Ionicons name="information-circle-outline" size={16} color={BROWN} />
                <View style={{ flex: 1 }}>
                  <Text style={s.preFillBannerText}>
                    {hasJobPostDefaults
                      ? 'Job-post details are suggestions. Confirm what you and the helper agreed.'
                      : 'Enter the terms you and the helper agreed on.'}
                  </Text>
                  {hasJobPostDefaults && onPrefillFromJobPost && (
                    <TouchableOpacity
                      style={s.preFillAction}
                      onPress={() => {
                        setCustomPayment(false);
                        onPrefillFromJobPost();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={s.preFillActionText}>Use job post terms</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={[s.pill, workSchedule === 'Any' ? s.pillNeutral : isPartTime ? s.pillGreen : s.pillBlue]}>
                <Text style={s.pillText}>{schedulePillText}</Text>
              </View>
              </View>

              {/* ── Employment Period ── */}
              <Text style={s.sectionTitle}>Employment period</Text>

              <Text style={s.label}>Employment start date (required)</Text>
              <Text style={s.hint}>
                Enter the agreed date employment begins. The contract must be agreed before service starts.
              </Text>
              <DateField
                value={contractStartDate}
                onChange={onChangeStart}
                placeholder="Select start date"
              />

              <Text style={[s.label, { marginTop: 10 }]}>Contract type</Text>
              <View style={s.typeCardRow}>
                <TouchableOpacity
                  style={[s.typeCard, contractType === 'Fixed Term' && s.typeCardActive]}
                  onPress={() => onChangeContractType('Fixed Term')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={22}
                    color={contractType === 'Fixed Term' ? GREEN : SUBTLE}
                    style={s.typeCardIcon}
                  />
                  <Text style={s.typeCardTitle}>Fixed Term</Text>
                  <Text style={s.typeCardSub}>Has a specific end date</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.typeCard, contractType === 'Indefinite' && s.typeCardActive]}
                  onPress={() => onChangeContractType('Indefinite')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="infinite-outline"
                    size={22}
                    color={contractType === 'Indefinite' ? GREEN : SUBTLE}
                    style={s.typeCardIcon}
                  />
                  <Text style={s.typeCardTitle}>Indefinite</Text>
                  <Text style={s.typeCardSub}>No end date (ongoing)</Text>
                </TouchableOpacity>
              </View>

              {contractType === 'Fixed Term' && (
                <>
                  <Text style={[s.label, { marginTop: 10 }]}>Duration</Text>
                  <View style={s.durationRow}>
                    <TextInput
                      style={[s.input, s.durationInput]}
                      value={durationText}
                      onChangeText={handleDurationAmountChange}
                      onFocus={() => setDurationFocused(true)}
                      onBlur={() => {
                        const amount = Number.parseInt(durationText, 10);
                        const normalized = normalizeDurationAmount(
                          Number.isFinite(amount) ? amount : durationAmount,
                          durationUnit
                        );
                        setDurationText(String(normalized));
                        onChangeDurationAmount(normalized);
                        setDurationFocused(false);
                      }}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                    <View style={s.unitChipRow}>
                      {DURATION_UNITS.map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[s.unitChip, durationUnit === u && s.unitChipActive]}
                          onPress={() => {
                            onChangeDurationUnit(u);
                            const normalized = normalizeDurationAmount(durationAmount, u);
                            onChangeDurationAmount(normalized);
                            setDurationText(String(normalized));
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.chipText, durationUnit === u && s.chipTextActive]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <Text style={[s.label, { marginTop: 10 }]}>Contract end date</Text>
                  {endDateLabel ? (
                    <View style={s.endDateBox}>
                      <Ionicons name="calendar" size={16} color={BROWN} />
                      <Text style={s.endDateText}>{endDateLabel}</Text>
                    </View>
                  ) : (
                    <View style={[s.endDateBox, s.endDateBoxEmpty]}>
                      <Text style={s.endDateTextMuted}>
                        {contractStartDate
                          ? 'Unable to compute end date — check the duration.'
                          : 'Set a start date to compute the end date, or switch to Indefinite.'}
                      </Text>
                    </View>
                  )}
                  <Text style={s.hint}>
                    CareLink policy requires fixed-term contracts to cover at least 30 inclusive calendar days.
                    This is a platform rule, not a statutory minimum.
                  </Text>
                  {fixedTermDays !== null && fixedTermDays < 30 && (
                    <Text style={[s.hint, { color: BROWN }]}>
                      This term covers {fixedTermDays} calendar days. Increase the duration to at least 30 days.
                    </Text>
                  )}
                  {computedEndDate && maximumFixedTermEndDate && !fixedTermWithinMaximum && (
                    <Text style={[s.hint, { color: BROWN }]}>
                      Fixed-term contracts cannot exceed 2 calendar years. Choose Indefinite for longer employment.
                    </Text>
                  )}
                </>
              )}

              {/* ── Compensation ── */}
              <Text style={s.sectionTitle}>Pay</Text>

              <Text style={s.label}>Agreed monthly salary (₱)</Text>
              <Text style={s.hint}>
                {jobPostSalaryMin != null
                  ? `Job post range: ₱${Number(jobPostSalaryMin).toLocaleString()}${jobPostSalaryMax != null ? `–₱${Number(jobPostSalaryMax).toLocaleString()}` : ''} per month. Minimum allowed: ₱${minimumMonthlySalary.toLocaleString()}/month.`
                  : `This is the total salary per month. Minimum allowed: ₱${minimumMonthlySalary.toLocaleString()}/month.`}
              </Text>
              <View style={s.salaryRow}>
                <View style={s.currencyBox}>
                  <Text style={s.currencyText}>₱</Text>
                </View>
                <TextInput
                  style={[s.input, s.salaryInput]}
                  value={confirmedSalary}
                  onChangeText={(value) => onChangeSalary(value.replace(/\D/g, ''))}
                  placeholder="e.g. 9000"
                  placeholderTextColor={SUBTLE}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              {showSalaryWarning && (
                <Text style={s.salaryErrorText}>
                  Monthly salary must be at least ₱{minimumMonthlySalary.toLocaleString()}.
                </Text>
              )}

              <Text style={[s.label, { marginTop: 10 }]}>How often will it be paid? (required)</Text>
              <Text style={s.hint}>The agreed amount stays monthly; this sets how it is split across paydays.</Text>
              <View style={s.paymentGrid}>
                <TouchableOpacity
                  style={[s.paymentOption, paymentSchedule === PAYMENT_SCHEDULE_DAILY && s.segmentActive]}
                  onPress={() => {
                    setCustomPayment(false);
                    onChangePaymentSchedule(PAYMENT_SCHEDULE_DAILY);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segmentText, paymentSchedule === PAYMENT_SCHEDULE_DAILY && s.segmentTextActive]}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.paymentOption, paymentSchedule === PAYMENT_SCHEDULE_WEEKLY && s.segmentActive]}
                  onPress={() => {
                    setCustomPayment(false);
                    onChangePaymentSchedule(PAYMENT_SCHEDULE_WEEKLY);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segmentText, paymentSchedule === PAYMENT_SCHEDULE_WEEKLY && s.segmentTextActive]}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.paymentOption, paymentSchedule === PAYMENT_SCHEDULE_SEMI && s.segmentActive]}
                  onPress={() => {
                    setCustomPayment(false);
                    onChangePaymentSchedule(PAYMENT_SCHEDULE_SEMI);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segmentText, paymentSchedule === PAYMENT_SCHEDULE_SEMI && s.segmentTextActive]}>Twice a month</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.paymentOption, paymentSchedule === PAYMENT_SCHEDULE_MONTHLY && s.segmentActive]}
                  onPress={() => {
                    setCustomPayment(false);
                    onChangePaymentSchedule(PAYMENT_SCHEDULE_MONTHLY);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segmentText, paymentSchedule === PAYMENT_SCHEDULE_MONTHLY && s.segmentTextActive]}>Monthly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.paymentOption, s.paymentOptionWide, showCustomPaymentInput && s.segmentActive]}
                  onPress={() => {
                    setCustomPayment(true);
                    if (isKnownSchedule) onChangePaymentSchedule('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segmentText, showCustomPaymentInput && s.segmentTextActive]}>Custom</Text>
                </TouchableOpacity>
              </View>
              {showCustomPaymentInput && (
                <TextInput
                  style={s.input}
                  value={paymentSchedule}
                  onChangeText={onChangePaymentSchedule}
                  placeholder="e.g. ₱2,000 every Friday"
                  placeholderTextColor={SUBTLE}
                />
              )}
              {payoutEstimate ? (
                <View style={s.payoutPreview}>
                  <Text style={s.payoutTitle}>Estimated payout</Text>
                  {payoutEstimate.slices.map((slice) => (
                    <View key={slice.label} style={s.payoutRow}>
                      <Text style={s.payoutLabel}>{slice.label}</Text>
                      <Text style={s.payoutAmount}>
                        {payoutEstimate.approximate ? '≈ ' : ''}{peso(slice.amount)}
                      </Text>
                    </View>
                  ))}
                  <View style={s.payoutDivider} />
                  <View style={s.payoutRow}>
                    <Text style={s.payoutTotalLabel}>Monthly salary basis</Text>
                    <Text style={s.payoutTotal}>{peso(payoutEstimate.monthly)}</Text>
                  </View>
                  {payoutEstimate.approximate && (
                    <Text style={s.payoutNote}>
                      {payoutPeriod === 'Daily'
                        ? 'Estimate uses 26 working days per month; actual daily pay follows days worked.'
                        : 'Estimate uses about 4.33 weeks per month, so weekly amounts vary slightly.'}
                    </Text>
                  )}
                </View>
              ) : paymentSchedule.trim() !== '' ? (
                <Text style={s.hint}>
                  Custom schedules have no automatic estimate. Enter the agreed timing and installment amount(s).
                </Text>
              ) : null}

              {/* ── Schedule ── */}
              <Text style={s.sectionTitle}>Work schedule and rest</Text>

              <View style={s.flexibleToggleRow}>
                <Text style={s.flexibleToggleLabel}>Flexible hours</Text>
                <Switch
                  value={flexibleHours}
                  onValueChange={onChangeFlexibleHours}
                  trackColor={{ false: DIVIDER, true: CARAMEL }}
                  thumbColor={SURFACE}
                />
              </View>

              {flexibleHours ? (
                <Text style={s.hoursCaptionText}>
                  Agree on each day&apos;s hours in advance. Work, including overtime, must not exceed 12 hours in a day.
                </Text>
              ) : (
                <>
                  <View style={s.timeRow}>
                    <View style={s.timeFieldWrap}>
                      <Text style={s.timeFieldLabel}>Start time</Text>
                      <TimeField value={workHoursStart} onChange={onChangeWorkHoursStart} placeholder="Select start time" />
                    </View>
                    <View style={s.timeFieldWrap}>
                      <Text style={s.timeFieldLabel}>End time</Text>
                      <TimeField value={workHoursEnd} onChange={onChangeWorkHoursEnd} placeholder="Select end time" />
                    </View>
                  </View>
                  {workHoursLabel && <Text style={s.hoursComputedText}>{workHoursLabel}</Text>}
                  {!scheduledWorkHoursValid && (
                    <Text style={s.salaryErrorText}>
                      {scheduledWorkHours === null
                        ? 'Choose valid start and end times.'
                        : scheduledWorkHours <= 0
                          ? 'The schedule must include working time.'
                          : 'Scheduled work cannot exceed 12 hours per day.'}
                    </Text>
                  )}
                  {scheduledWorkHours !== null && scheduledWorkHours > 8 && scheduledWorkHours <= 12 && (
                    <View style={s.warningBanner}>
                      <Ionicons name="warning-outline" size={16} color={BROWN} />
                      <Text style={s.warningBannerText}>
                        This schedule includes more than 8 work hours a day. Agree in writing on any overtime pay;
                        overtime must not be required without the helper&apos;s consent.
                      </Text>
                    </View>
                  )}
                  <Text style={s.hoursCaptionText}>
                    The estimate subtracts a 1-hour lunch break. Agree on the actual break and note any different arrangement under Other terms.
                  </Text>
                </>
              )}

              <Text style={[s.label, { marginTop: 10 }]}>Rest day(s) (required, at least 1)</Text>
              <Text style={s.hint}>
                Domestic workers are entitled to at least 24 consecutive hours of rest per week (RA 10361).
              </Text>
              <View style={s.chipRow}>
                {REST_DAYS.map((day) => {
                  const active = restDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[s.dayChip, active && s.dayChipActive]}
                      onPress={() => onToggleRestDay(day)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.dayChipText, active && s.dayChipTextActive]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Leave ── */}
              <Text style={s.sectionTitle}>Leave</Text>

              <View style={s.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color={BROWN} />
                <Text style={s.infoBoxText}>
                  The contract includes statutory Service Incentive Leave: at least 5 paid days per year after one year of service.
                  The amounts below are additional leave agreed for this contract.
                </Text>
              </View>

              <Text style={s.label}>Additional vacation leave (days/year)</Text>
              <View style={s.chipRow}>
                {LEAVE_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={`vl-${n}`}
                    style={[s.chip, vacationLeaveDays === n && s.chipActive]}
                    onPress={() => onChangeVacationLeave(n)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipText, vacationLeaveDays === n && s.chipTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.label, { marginTop: 10 }]}>Additional sick leave (days/year)</Text>
              <View style={s.chipRow}>
                {LEAVE_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={`sl-${n}`}
                    style={[s.chip, sickLeaveDays === n && s.chipActive]}
                    onPress={() => onChangeSickLeave(n)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipText, sickLeaveDays === n && s.chipTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.hint}>These are additional paid leave days; statutory SIL is listed separately in the contract.</Text>

              {/* ── Additional Terms (collapsible) ── */}
              <TouchableOpacity
                style={s.collapsibleHeader}
                onPress={() => setAdditionalOpen((open) => !open)}
                activeOpacity={0.7}
              >
                <View style={s.collapsibleHeaderLeft}>
                  <Ionicons name={additionalOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={BROWN} />
                  <View>
                    <Text style={s.collapsibleTitle}>Other terms (optional)</Text>
                    <Text style={s.collapsibleSub}>Add only terms you and the helper have discussed.</Text>
                  </View>
                </View>
                {filledAdditionalCount > 0 && (
                  <View style={s.collapsibleBadge}>
                    <Text style={s.collapsibleBadgeText}>{filledAdditionalCount} filled</Text>
                  </View>
                )}
              </TouchableOpacity>

              {additionalOpen && (
                <>
                  <Text style={s.label}>Additional benefits (optional)</Text>
                  <Text style={s.hint}>
                    e.g. transportation allowance, meal allowance, or load allowance. Statutory benefits such as 13th-month pay are included separately.
                  </Text>
                  <TextInput
                    style={s.notes}
                    value={otherBenefits}
                    onChangeText={onChangeOtherBenefits}
                    placeholder="Leave blank if none"
                    placeholderTextColor={SUBTLE}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                  />

                  {!isPartTime && (
                    <>
                      <Text style={[s.label, { marginTop: 10 }]}>Overtime pay (₱/hour, optional)</Text>
                      <Text style={s.hint}>Pay rate for hours worked beyond the agreed schedule.</Text>
                      <View style={s.salaryRow}>
                        <View style={s.currencyBox}>
                          <Text style={s.currencyText}>₱</Text>
                        </View>
                        <TextInput
                          style={[s.input, s.salaryInput]}
                          value={overtimeRate}
                          onChangeText={onChangeOvertimeRate}
                          placeholder="Leave blank if not applicable"
                          placeholderTextColor={SUBTLE}
                          keyboardType="numeric"
                        />
                      </View>
                    </>
                  )}

                  <Text style={[s.label, { marginTop: 10 }]}>Debt agreement (optional)</Text>
                  <Text style={s.hint}>Any cash advance or loan repayment terms agreed with the helper.</Text>
                  <TextInput
                    style={s.notes}
                    value={debtAgreement}
                    onChangeText={onChangeDebtAgreement}
                    placeholder="Leave blank if none"
                    placeholderTextColor={SUBTLE}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                  />

                  <Text style={[s.label, { marginTop: 10 }]}>Debt amount, if any (₱)</Text>
                  <Text style={s.hint}>Numeric total — used to warn if it exceeds one month's salary.</Text>
                  <View style={s.salaryRow}>
                    <View style={s.currencyBox}>
                      <Text style={s.currencyText}>₱</Text>
                    </View>
                    <TextInput
                      style={[s.input, s.salaryInput]}
                      value={debtAmount}
                      onChangeText={onChangeDebtAmount}
                      placeholder="Leave blank if none"
                      placeholderTextColor={SUBTLE}
                      keyboardType="numeric"
                    />
                  </View>
                  {showDebtWarning && (
                    <View style={s.warningBanner}>
                      <Ionicons name="warning-outline" size={16} color={BROWN} />
                      <Text style={s.warningBannerText}>
                        This debt amount exceeds one month's salary. The helper will need to explicitly
                        acknowledge this before signing — large debt obligations are a recognized risk
                        factor under RA 10364 (Anti-Trafficking Act).
                      </Text>
                    </View>
                  )}

                  <Text style={[s.label, { marginTop: 10 }]}>Deployment cost agreement (optional)</Text>
                  <Text style={s.hint}>Recoverable only if the helper leaves before completing 6 months.</Text>
                  <TextInput
                    style={s.notes}
                    value={deploymentAgreement}
                    onChangeText={onChangeDeploymentAgreement}
                    placeholder="Leave blank if none"
                    placeholderTextColor={SUBTLE}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                  />

                  <Text style={[s.label, { marginTop: 10 }]}>Termination conditions (optional)</Text>
                  <Text style={s.hint}>Leave blank to use standard RA 10361 terms.</Text>
                  <TextInput
                    style={s.notes}
                    value={terminationConditions}
                    onChangeText={onChangeTerminationConditions}
                    placeholder="Leave blank to use standard RA 10361 terms"
                    placeholderTextColor={SUBTLE}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                  />

                  <Text style={[s.label, { marginTop: 10 }]}>Other agreements (optional)</Text>
                  <Text style={s.hint}>Any other agreements specific to this hire (e.g. probation terms, allowances).</Text>
                  <TextInput
                    style={s.notes}
                    value={specialConditions}
                    onChangeText={onChangeSpecialConditions}
                    placeholder="Leave blank if none"
                    placeholderTextColor={SUBTLE}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                  />

                  <Text style={[s.label, { marginTop: 10 }]}>Additional notes (optional)</Text>
                  <Text style={s.hint}>Shown on the contract under additional agreements.</Text>
                  <TextInput
                    style={s.notes}
                    value={contractNotes}
                    onChangeText={onChangeNotes}
                    placeholder="e.g. Probation review after 3 months…"
                    placeholderTextColor={SUBTLE}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                  />
                </>
              )}

            </ScrollView>

            <View style={s.btns}>
              {!canContinue && (
                <Text style={s.footerHint}>
                  Complete: {missingTerms.join(', ')}.
                </Text>
              )}
              <TouchableOpacity style={s.cancel} onPress={onCancel}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirm, !canContinue && s.confirmDisabled]}
                onPress={onContinue}
                disabled={!canContinue}
                accessibilityState={{ disabled: !canContinue }}
              >
                <Text style={s.confirmTxt}>Review terms</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}
