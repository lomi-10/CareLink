import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { theme } from '@/constants/theme';
import { DateField } from '@/components/shared';
import { hireContractTermsStyles as s } from '@/components/parent/hire/HireContractTermsModal.styles';

const CONTRACT_DURATIONS = ['3 Months', '6 Months', '1 Year', '2 Years', 'Indefinite'];
const REST_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LEAVE_OPTIONS = [0, 5, 10, 15, 20, 30];
const PAYMENT_SCHEDULES = ['Every 15th and 30th', 'Every end of month', 'Every 2 weeks'];

type Props = {
  visible: boolean;
  jobTitle: string;
  helperName: string;

  contractStartDate: string;
  contractEndDate: string;
  contractNotes: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  onChangeNotes: (v: string) => void;

  contractDuration: string;
  confirmedSalary: string;
  overtimeRate: string;
  paymentSchedule: string;
  workHours: string;
  restDays: string[];
  vacationLeaveDays: number;
  sickLeaveDays: number;
  specialConditions: string;
  otherBenefits: string;
  debtAgreement: string;
  deploymentAgreement: string;
  terminationConditions: string;
  onChangeContractDuration: (v: string) => void;
  onChangeSalary: (v: string) => void;
  onChangeOvertimeRate: (v: string) => void;
  onChangePaymentSchedule: (v: string) => void;
  onChangeWorkHours: (v: string) => void;
  onToggleRestDay: (day: string) => void;
  onChangeVacationLeave: (v: number) => void;
  onChangeSickLeave: (v: number) => void;
  onChangeSpecialConditions: (v: string) => void;
  onChangeOtherBenefits: (v: string) => void;
  onChangeDebtAgreement: (v: string) => void;
  onChangeDeploymentAgreement: (v: string) => void;
  onChangeTerminationConditions: (v: string) => void;

  onCancel: () => void;
  onContinue: () => void;
};

export function HireContractTermsModal({
  visible,
  jobTitle,
  helperName,
  contractStartDate,
  contractEndDate,
  contractNotes,
  onChangeStart,
  onChangeEnd,
  onChangeNotes,
  contractDuration,
  confirmedSalary,
  overtimeRate,
  paymentSchedule,
  workHours,
  restDays,
  vacationLeaveDays,
  sickLeaveDays,
  specialConditions,
  otherBenefits,
  debtAgreement,
  deploymentAgreement,
  terminationConditions,
  onChangeContractDuration,
  onChangeSalary,
  onChangeOvertimeRate,
  onChangePaymentSchedule,
  onChangeWorkHours,
  onToggleRestDay,
  onChangeVacationLeave,
  onChangeSickLeave,
  onChangeSpecialConditions,
  onChangeOtherBenefits,
  onChangeDebtAgreement,
  onChangeDeploymentAgreement,
  onChangeTerminationConditions,
  onCancel,
  onContinue,
}: Props) {
  const [customPayment, setCustomPayment] = useState(false);
  const isKnownSchedule = PAYMENT_SCHEDULES.includes(paymentSchedule);
  const showCustomPaymentInput = customPayment || (paymentSchedule !== '' && !isKnownSchedule);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.bodyPad}>
            <Text style={s.title}>Contract Terms</Text>
            <Text style={s.sub}>
              Hiring <Text style={s.subBold}>{helperName || 'this helper'}</Text> for &quot;{jobTitle}&quot;.
              {'\n'}Confirm the details below before generating the contract.
            </Text>
          </View>

          <ScrollView style={s.list} keyboardShouldPersistTaps="handled">

            {/* ── Employment Period ── */}
            <Text style={s.sectionTitle}>Employment Period</Text>

            <Text style={s.label}>Employment start date (optional)</Text>
            <Text style={s.hint}>Leave blank to use the job post start date.</Text>
            <DateField
              value={contractStartDate}
              onChange={onChangeStart}
              placeholder="Select start date"
              minimumDate={new Date()}
            />

            <Text style={s.label}>Contract duration</Text>
            <View style={s.chipRow}>
              {CONTRACT_DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[s.chip, contractDuration === d && s.chipActive]}
                  onPress={() => onChangeContractDuration(d)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.chipText, contractDuration === d && s.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Contract end date (required)</Text>
            <Text style={s.hint}>Last day of this contract term.</Text>
            <DateField
              value={contractEndDate}
              onChange={onChangeEnd}
              placeholder="Select end date"
              minimumDate={
                /^\d{4}-\d{2}-\d{2}$/.test(contractStartDate)
                  ? new Date(contractStartDate + 'T00:00:00')
                  : new Date()
              }
            />

            {/* ── Compensation ── */}
            <Text style={s.sectionTitle}>Compensation</Text>

            <Text style={s.label}>Confirmed salary (₱/month, required)</Text>
            <Text style={s.hint}>Minimum ₱7,000 as required by RA 10361.</Text>
            <View style={s.salaryRow}>
              <View style={s.currencyBox}>
                <Text style={s.currencyText}>₱</Text>
              </View>
              <TextInput
                style={[s.input, s.salaryInput]}
                value={confirmedSalary}
                onChangeText={onChangeSalary}
                placeholder="e.g. 9000"
                placeholderTextColor={theme.color.subtle}
                keyboardType="numeric"
              />
            </View>

            <Text style={[s.label, { marginTop: 10 }]}>Overtime rate (₱/hour, optional)</Text>
            <Text style={s.hint}>Pay rate for hours worked beyond the agreed schedule.</Text>
            <View style={s.salaryRow}>
              <View style={s.currencyBox}>
                <Text style={s.currencyText}>₱</Text>
              </View>
              <TextInput
                style={[s.input, s.salaryInput]}
                value={overtimeRate}
                onChangeText={onChangeOvertimeRate}
                placeholder="e.g. 50/hour"
                placeholderTextColor={theme.color.subtle}
                keyboardType="numeric"
              />
            </View>

            <Text style={[s.label, { marginTop: 10 }]}>Salary payment schedule</Text>
            <View style={s.chipRow}>
              {PAYMENT_SCHEDULES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[s.chip, paymentSchedule === p && s.chipActive]}
                  onPress={() => {
                    setCustomPayment(false);
                    onChangePaymentSchedule(p);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.chipText, paymentSchedule === p && s.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.chip, showCustomPaymentInput && s.chipActive]}
                onPress={() => {
                  setCustomPayment(true);
                  if (isKnownSchedule) onChangePaymentSchedule('');
                }}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, showCustomPaymentInput && s.chipTextActive]}>Custom</Text>
              </TouchableOpacity>
            </View>
            {showCustomPaymentInput && (
              <TextInput
                style={s.input}
                value={paymentSchedule}
                onChangeText={onChangePaymentSchedule}
                placeholder="e.g. 5th and 20th of every month"
                placeholderTextColor={theme.color.subtle}
              />
            )}

            {/* ── Schedule ── */}
            <Text style={s.sectionTitle}>Schedule</Text>

            <Text style={s.label}>Work hours</Text>
            <Text style={s.hint}>e.g. "8am – 5pm" or "7:00 – 19:00"</Text>
            <TextInput
              style={s.input}
              value={workHours}
              onChangeText={onChangeWorkHours}
              placeholder="e.g. 8am – 5pm"
              placeholderTextColor={theme.color.subtle}
              autoCapitalize="none"
            />

            <Text style={[s.label, { marginTop: 10 }]}>Rest day(s) (required, at least 1)</Text>
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

            <Text style={s.label}>Vacation leave (days/year)</Text>
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

            <Text style={[s.label, { marginTop: 10 }]}>Sick leave (days/year)</Text>
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

            {/* ── Additional Terms ── */}
            <Text style={s.sectionTitle}>Additional Terms</Text>

            <Text style={s.label}>Additional benefits (optional)</Text>
            <Text style={s.hint}>e.g. transportation allowance, 13th month pay, load allowance.</Text>
            <TextInput
              style={s.notes}
              value={otherBenefits}
              onChangeText={onChangeOtherBenefits}
              placeholder="Leave blank if none"
              placeholderTextColor={theme.color.subtle}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />

            <Text style={[s.label, { marginTop: 10 }]}>Debt agreement (optional)</Text>
            <Text style={s.hint}>Any cash advance or loan repayment terms agreed with the helper.</Text>
            <TextInput
              style={s.notes}
              value={debtAgreement}
              onChangeText={onChangeDebtAgreement}
              placeholder="Leave blank if none"
              placeholderTextColor={theme.color.subtle}
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
              placeholderTextColor={theme.color.subtle}
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
              placeholderTextColor={theme.color.subtle}
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
              placeholderTextColor={theme.color.subtle}
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
              placeholderTextColor={theme.color.subtle}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />

          </ScrollView>

          <View style={s.btns}>
            <TouchableOpacity style={s.cancel} onPress={onCancel}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirm} onPress={onContinue}>
              <Text style={s.confirmTxt}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
