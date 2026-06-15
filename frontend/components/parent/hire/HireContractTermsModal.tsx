import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, Switch, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateField, TimeField } from '@/components/shared';
import { hireContractTermsStyles as s } from '@/components/parent/hire/HireContractTermsModal.styles';
import {
  DURATION_UNITS,
  DURATION_QUICK_PRESETS,
  computeContractEndDate,
  formatLongDate,
  type DurationUnit,
} from '@/components/parent/hire/hireFlowDates';
import { computeWorkHoursLabel } from '@/components/parent/hire/hireFlowWorkHours';
import { BROWN, CARAMEL, SUBTLE, DIVIDER, SURFACE, GREEN, ICON_BG } from '@/components/parent/home/parentWarmTheme';

const REST_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LEAVE_OPTIONS = [5, 10, 15, 20, 30];
const PAYMENT_SCHEDULE_SEMI = 'Every 15th and 30th';
const PAYMENT_SCHEDULE_MONTHLY = 'Every end of month';
const KNOWN_PAYMENT_SCHEDULES = [PAYMENT_SCHEDULE_SEMI, PAYMENT_SCHEDULE_MONTHLY];

type ContractType = 'Fixed Term' | 'Indefinite';
type WorkScheduleType = 'Full-time' | 'Part-time' | 'Any';

type Props = {
  visible: boolean;
  jobTitle: string;
  helperName: string;
  workSchedule: WorkScheduleType;

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

  const isPartTime = workSchedule === 'Part-time';
  const isKnownSchedule = KNOWN_PAYMENT_SCHEDULES.includes(paymentSchedule);
  const showCustomPaymentInput = customPayment || (paymentSchedule !== '' && !isKnownSchedule);

  const computedEndDate = useMemo(
    () => computeContractEndDate(contractStartDate, contractType, durationAmount, durationUnit),
    [contractStartDate, contractType, durationAmount, durationUnit]
  );
  const endDateLabel = computedEndDate ? formatLongDate(computedEndDate) : null;

  const workHoursLabel = flexibleHours ? null : computeWorkHoursLabel(workHoursStart, workHoursEnd);

  const salaryNum = parseFloat(confirmedSalary.trim());
  const showLowSalaryWarning = !isPartTime && !isNaN(salaryNum) && salaryNum > 0 && salaryNum < 7000;

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
    const digits = text.replace(/[^0-9]/g, '').slice(0, 2);
    setDurationText(digits);
    if (digits === '') return;
    let num = parseInt(digits, 10);
    if (num < 1) num = 1;
    if (num > 99) num = 99;
    onChangeDurationAmount(num);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.card}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={s.bodyPad}>
              <Text style={s.title}>Contract Terms</Text>
              <Text style={s.sub}>
                Hiring <Text style={s.subBold}>{helperName || 'this helper'}</Text> for &quot;{jobTitle}&quot;.
                {'\n'}Confirm the details below before generating the contract.
              </Text>

              <View style={s.preFillBanner}>
                <Ionicons name="information-circle-outline" size={16} color={BROWN} />
                <Text style={s.preFillBannerText}>
                  Some fields have been pre-filled from the job post. Review and adjust as needed.
                </Text>
              </View>

              <View style={[s.pill, isPartTime ? s.pillGreen : s.pillBlue]}>
                <Text style={s.pillText}>{isPartTime ? 'Part-time Contract' : 'Full-time Contract'}</Text>
              </View>
            </View>

            <ScrollView style={s.list} keyboardShouldPersistTaps="handled">

              {/* ── Employment Period ── */}
              <Text style={s.sectionTitle}>Employment Period</Text>

              <Text style={s.label}>Employment start date (optional)</Text>
              <Text style={s.hint}>Leave blank if not yet confirmed.</Text>
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
                      onBlur={() => setDurationFocused(false)}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <View style={s.unitChipRow}>
                      {DURATION_UNITS.map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[s.unitChip, durationUnit === u && s.unitChipActive]}
                          onPress={() => onChangeDurationUnit(u)}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.chipText, durationUnit === u && s.chipTextActive]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={[s.chipRow, { marginTop: 8 }]}>
                    {DURATION_QUICK_PRESETS.map((preset) => {
                      const active = durationAmount === preset.amount && durationUnit === preset.unit;
                      return (
                        <TouchableOpacity
                          key={preset.label}
                          style={[s.chip, active && s.chipActive]}
                          onPress={() => {
                            onChangeDurationAmount(preset.amount);
                            onChangeDurationUnit(preset.unit);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.chipText, active && s.chipTextActive]}>{preset.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
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
                </>
              )}

              {/* ── Compensation ── */}
              <Text style={s.sectionTitle}>Compensation</Text>

              <Text style={s.label}>{isPartTime ? 'Rate (₱ per hour or per day)' : 'Monthly salary (₱)'}</Text>
              <Text style={s.hint}>
                {isPartTime
                  ? 'For part-time, enter hourly or daily rate.'
                  : 'Minimum ₱7,000/month as required by RA 10361.'}
              </Text>
              <View style={s.salaryRow}>
                <View style={s.currencyBox}>
                  <Text style={s.currencyText}>₱</Text>
                </View>
                <TextInput
                  style={[s.input, s.salaryInput]}
                  value={confirmedSalary}
                  onChangeText={onChangeSalary}
                  placeholder={isPartTime ? 'e.g. 80/hour or 600/day' : 'e.g. 9000'}
                  placeholderTextColor={SUBTLE}
                  keyboardType="numeric"
                />
              </View>
              {showLowSalaryWarning && (
                <View style={s.warningBanner}>
                  <Ionicons name="warning-outline" size={16} color={BROWN} />
                  <Text style={s.warningBannerText}>
                    Minimum wage for kasambahay is ₱7,000/month under RA 10361.
                  </Text>
                </View>
              )}

              <Text style={[s.label, { marginTop: 10 }]}>Salary payment schedule</Text>
              <View style={s.segmentedRow}>
                <TouchableOpacity
                  style={[s.segment, paymentSchedule === PAYMENT_SCHEDULE_SEMI && s.segmentActive]}
                  onPress={() => {
                    setCustomPayment(false);
                    onChangePaymentSchedule(PAYMENT_SCHEDULE_SEMI);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segmentText, paymentSchedule === PAYMENT_SCHEDULE_SEMI && s.segmentTextActive]}>
                    Semi-monthly (15th & 30th)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.segment, paymentSchedule === PAYMENT_SCHEDULE_MONTHLY && s.segmentActive]}
                  onPress={() => {
                    setCustomPayment(false);
                    onChangePaymentSchedule(PAYMENT_SCHEDULE_MONTHLY);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segmentText, paymentSchedule === PAYMENT_SCHEDULE_MONTHLY && s.segmentTextActive]}>
                    Monthly (end of month)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.segment, showCustomPaymentInput && s.segmentActive]}
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
                  placeholder="e.g. Every Friday, Every 1st of the month"
                  placeholderTextColor={SUBTLE}
                />
              )}

              {/* ── Schedule ── */}
              <Text style={s.sectionTitle}>Schedule</Text>

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
                <Text style={s.hoursCaptionText}>Hours will vary by daily agreement.</Text>
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
                  <Text style={s.hoursCaptionText}>Excludes 1 hour lunch break by default.</Text>
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

              {/* ── Leave Benefits ── */}
              <Text style={s.sectionTitle}>Leave Benefits</Text>

              <View style={s.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color={BROWN} />
                <Text style={s.infoBoxText}>
                  Under RA 10361, kasambahay are entitled to at least 5 days of Service Incentive Leave (SIL) per year.
                </Text>
              </View>

              {isPartTime && (
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={16} color={BROWN} />
                  <Text style={s.infoBoxText}>
                    For part-time helpers, leave benefits are pro-rated based on actual days/hours worked.
                  </Text>
                </View>
              )}

              <Text style={s.label}>
                {isPartTime ? 'Vacation leave entitlement (pro-rated, days/year)' : 'Vacation leave (days/year)'}
              </Text>
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

              <Text style={[s.label, { marginTop: 10 }]}>
                {isPartTime ? 'Sick leave entitlement (pro-rated, days/year)' : 'Sick leave (days/year)'}
              </Text>
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
              <Text style={s.hint}>These are paid leave days usable at the helper&apos;s discretion.</Text>

              {/* ── Additional Terms (collapsible) ── */}
              <TouchableOpacity
                style={s.collapsibleHeader}
                onPress={() => setAdditionalOpen((open) => !open)}
                activeOpacity={0.7}
              >
                <View style={s.collapsibleHeaderLeft}>
                  <Ionicons name={additionalOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={BROWN} />
                  <View>
                    <Text style={s.collapsibleTitle}>Additional Terms (Optional)</Text>
                    <Text style={s.collapsibleSub}>Most parents skip this section. Only fill if applicable.</Text>
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
                  <Text style={s.hint}>e.g. transportation allowance, 13th month pay, load allowance.</Text>
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
              <TouchableOpacity style={s.cancel} onPress={onCancel}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirm} onPress={onContinue}>
                <Text style={s.confirmTxt}>Continue</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}
