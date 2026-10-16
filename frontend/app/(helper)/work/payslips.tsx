import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useNotice } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { WorkModeShell } from '@/components/helper/work';
import {
  DARK,
  DANGER,
  DANGER_BG,
  DIVIDER,
  GREEN,
  ICON_BG,
  MUTED,
  ORANGE,
  SUBTLE,
  SUCCESS_BG,
  SURFACE,
} from '@/components/helper/home/helperWarmTheme';
import { fetchHelperPayslips, respondToPayslip, type HelperPayslip } from '@/lib/payslipsApi';
import { formatPeso } from '@/lib/payrollApi';

type ResponseAction = 'acknowledge' | 'dispute';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not provided';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function periodLabel(record: HelperPayslip): string {
  return `${formatDate(record.pay_period_start)} – ${formatDate(record.pay_period_end)}`;
}

export default function HelperPayslipsScreen() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const { ready, isWorkMode, activeHire } = useHelperWorkMode();
  const { notify, noticeHost } = useNotice();
  const helperId = Number(userData?.user_id ?? 0);

  const [records, setRecords] = useState<HelperPayslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [responseTarget, setResponseTarget] = useState<{
    record: HelperPayslip;
    action: ResponseAction;
  } | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!activeHire || helperId <= 0) return;
    setError('');
    const result = await fetchHelperPayslips(activeHire.application_id, helperId);
    if (!result.success) {
      setError(result.message || 'Could not load payment records.');
      return;
    }
    setRecords(result.payslips ?? []);
  }, [activeHire, helperId]);

  useEffect(() => {
    if (ready && !isWorkMode) {
      router.replace('/(helper)/home' as never);
      return;
    }
    if (!authLoading && activeHire && helperId > 0) {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }
  }, [activeHire, authLoading, helperId, isWorkMode, load, ready, router]);

  const pendingCount = records.filter((record) => record.status === 'pending').length;

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openResponse = (record: HelperPayslip, action: ResponseAction) => {
    setDisputeReason('');
    setResponseTarget({ record, action });
  };

  const submitResponse = async () => {
    if (!activeHire || !responseTarget || submitting) return;
    if (responseTarget.action === 'dispute' && !disputeReason.trim()) {
      notify('Add a short explanation', 'Tell us what is wrong with this payment record.', 'warning');
      return;
    }
    setSubmitting(true);
    const result = await respondToPayslip({
      application_id: activeHire.application_id,
      payslip_id: responseTarget.record.payslip_id,
      user_id: helperId,
      user_type: 'helper',
      action: responseTarget.action,
      ...(responseTarget.action === 'dispute' ? { reason: disputeReason.trim() } : {}),
    });
    setSubmitting(false);
    if (!result.success) {
      notify('Response not saved', result.message || 'Please try again.', 'error');
      return;
    }
    setResponseTarget(null);
    notify(
      responseTarget.action === 'acknowledge' ? 'Acknowledgment recorded' : 'Issue reported',
      responseTarget.action === 'acknowledge'
        ? 'This records your acknowledgment; it does not independently verify a bank or cash transfer.'
        : 'Your response is saved with this payslip for both parties to review.',
      'success',
    );
    await load();
  };

  if (authLoading || !ready || loading) {
    return (
      <WorkModeShell desktopTitle="My payslips" desktopSubtitle="Your payment records">
        <View style={styles.loading}><ActivityIndicator color={ORANGE} size="large" /></View>
      </WorkModeShell>
    );
  }

  return (
    <WorkModeShell desktopTitle="My payslips" desktopSubtitle="Your payment records">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={ORANGE} />}
      >
        <View style={styles.heading}>
          <View style={styles.headingIcon}><Ionicons name="receipt-outline" size={24} color={ORANGE} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>PAYMENT RECORDS</Text>
            <Text style={styles.title}>My payslips</Text>
          </View>
        </View>
        <Text style={styles.intro}>
          Each payday your employer can record the pay period, wages, deductions, and amount paid. Confirm receipt only if you actually received the payment. If something is wrong, report it instead.
        </Text>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={19} color={ORANGE} />
          <Text style={styles.noticeText}>
            Your acknowledgment records your response. It is not proof that CareLink processed or verified a cash, bank, or e-wallet transfer.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void load()} style={styles.retryButton} accessibilityRole="button">
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {records.length > 0 ? (
          <View style={styles.summary}>
            <View style={styles.summaryIcon}>
              <Ionicons name={pendingCount > 0 ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={20} color={pendingCount > 0 ? ORANGE : GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                {pendingCount > 0 ? `${pendingCount} payslip${pendingCount === 1 ? '' : 's'} need your response` : 'You are up to date'}
              </Text>
              <Text style={styles.summaryText}>{records.length} payment record{records.length === 1 ? '' : 's'} on this placement</Text>
            </View>
          </View>
        ) : null}

        {!error && !loading && records.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={28} color={ORANGE} /></View>
            <Text style={styles.emptyTitle}>No payslips yet</Text>
            <Text style={styles.emptyText}>
              When your employer records a payday, it will appear here for you to review. Your agreed salary remains in your signed contract.
            </Text>
          </View>
        ) : null}

        {records.map((record) => (
          <PayslipCard key={record.payslip_id} record={record} onRespond={openResponse} />
        ))}
      </ScrollView>

      <Modal
        visible={responseTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !submitting && setResponseTarget(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons
                name={responseTarget?.action === 'dispute' ? 'chatbox-ellipses-outline' : 'checkmark-circle-outline'}
                size={25}
                color={responseTarget?.action === 'dispute' ? DANGER : GREEN}
              />
            </View>
            <Text style={styles.modalTitle}>
              {responseTarget?.action === 'dispute' ? 'Report an issue' : 'Confirm you received this payment'}
            </Text>
            <Text style={styles.modalText}>
              {responseTarget?.action === 'dispute'
                ? 'This sends your explanation with the payslip so both parties can review the disagreement.'
                : `Confirm only if you received ${responseTarget ? formatPeso(responseTarget.record.net_amount) : 'this payment'}. This records your acknowledgment, not independent proof of transfer.`}
            </Text>
            {responseTarget?.action === 'dispute' ? (
              <TextInput
                value={disputeReason}
                onChangeText={setDisputeReason}
                placeholder="What is incorrect or missing?"
                placeholderTextColor={SUBTLE}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                style={styles.reasonInput}
              />
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setResponseTarget(null)}
                disabled={submitting}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  responseTarget?.action === 'dispute' && styles.disputeButton,
                  submitting && styles.disabledButton,
                ]}
                onPress={() => void submitResponse()}
                disabled={submitting}
                accessibilityRole="button"
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmText}>{responseTarget?.action === 'dispute' ? 'Send issue' : 'Confirm received'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {noticeHost}
    </WorkModeShell>
  );
}

function PayslipCard({
  record,
  onRespond,
}: {
  record: HelperPayslip;
  onRespond: (record: HelperPayslip, action: ResponseAction) => void;
}) {
  const statusStyle = record.status === 'acknowledged'
    ? { bg: SUCCESS_BG, color: GREEN, label: 'Acknowledged', icon: 'checkmark-circle' as const }
    : record.status === 'disputed'
      ? { bg: DANGER_BG, color: DANGER, label: 'Issue reported', icon: 'alert-circle' as const }
      : { bg: ICON_BG, color: ORANGE, label: 'Needs your response', icon: 'time' as const };

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.period}>{periodLabel(record)}</Text>
          <Text style={styles.paidDate}>Paid on {formatDate(record.paid_at)}</Text>
        </View>
        <View style={[styles.status, { backgroundColor: statusStyle.bg }]}>
          <Ionicons name={statusStyle.icon} size={14} color={statusStyle.color} />
          <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Gross wages</Text>
        <Text style={styles.amountValue}>{formatPeso(record.gross_amount)}</Text>
      </View>
      {record.deductions_total > 0 ? (
        <>
          {record.deductions.map((deduction, index) => (
            <View style={styles.deductionRow} key={`${deduction.label}-${index}`}>
              <Text style={styles.deductionLabel}>{deduction.label}</Text>
              <Text style={styles.deductionAmount}>−{formatPeso(Number(deduction.amount) || 0)}</Text>
            </View>
          ))}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total deductions</Text>
            <Text style={styles.deductionAmount}>−{formatPeso(record.deductions_total)}</Text>
          </View>
        </>
      ) : (
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Deductions</Text>
          <Text style={styles.amountValue}>None recorded</Text>
        </View>
      )}
      <View style={styles.netRow}>
        <Text style={styles.netLabel}>Amount paid</Text>
        <Text style={styles.netAmount}>{formatPeso(record.net_amount)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="wallet-outline" size={15} color={MUTED} />
        <Text style={styles.detailText}>Reported payment method: {record.payment_method || 'Not provided'}</Text>
      </View>
      {record.employer_note ? <Text style={styles.employerNote}>Employer note: {record.employer_note}</Text> : null}
      {record.status === 'pending' ? (
        <View style={styles.responseActions}>
          <TouchableOpacity style={styles.ackButton} onPress={() => onRespond(record, 'acknowledge')} accessibilityRole="button">
            <Ionicons name="checkmark" size={17} color="#fff" />
            <Text style={styles.ackText}>I received this</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.disputeAction} onPress={() => onRespond(record, 'dispute')} accessibilityRole="button">
            <Text style={styles.disputeActionText}>Report an issue</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {record.status === 'acknowledged' ? (
        <Text style={styles.responseNote}>You acknowledged this record on {formatDate(record.helper_acknowledged_at)}.</Text>
      ) : null}
      {record.status === 'disputed' ? (
        <View style={styles.disputeNote}>
          <Text style={styles.disputeNoteTitle}>Your issue</Text>
          <Text style={styles.disputeNoteText}>{record.helper_dispute_reason || 'An issue was reported for this payslip.'}</Text>
          {record.helper_disputed_at ? <Text style={styles.responseNote}>Reported {formatDate(record.helper_disputed_at)}.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 36, maxWidth: 900, width: '100%', alignSelf: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  headingIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: ORANGE, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: DARK, fontSize: 24, fontWeight: '800', marginTop: 1 },
  intro: { color: MUTED, fontSize: 14, lineHeight: 21, marginBottom: 14 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 13, backgroundColor: ICON_BG, marginBottom: 16 },
  noticeText: { color: DARK, fontSize: 12, lineHeight: 18, flex: 1 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 14, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, padding: 14, marginBottom: 12 },
  summaryIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { color: DARK, fontSize: 14, fontWeight: '800' },
  summaryText: { color: MUTED, fontSize: 12, marginTop: 3 },
  empty: { alignItems: 'center', backgroundColor: SURFACE, borderRadius: 18, borderWidth: 1, borderColor: DIVIDER, padding: 26, marginTop: 4 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: DARK, fontSize: 17, fontWeight: '800' },
  emptyText: { color: MUTED, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7, maxWidth: 440 },
  errorCard: { backgroundColor: DANGER_BG, borderRadius: 14, padding: 14, marginBottom: 12 },
  errorText: { color: DANGER, fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 5 },
  retryText: { color: DANGER, fontWeight: '800', fontSize: 13 },
  recordCard: { backgroundColor: SURFACE, borderRadius: 18, borderWidth: 1, borderColor: DIVIDER, padding: 16, marginBottom: 12 },
  recordHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  period: { color: DARK, fontSize: 15, fontWeight: '800', lineHeight: 21 },
  paidDate: { color: MUTED, fontSize: 12, marginTop: 3 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 },
  amountLabel: { color: MUTED, fontSize: 13 },
  amountValue: { color: DARK, fontSize: 13, fontWeight: '700' },
  deductionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, paddingLeft: 10 },
  deductionLabel: { color: MUTED, fontSize: 12, flex: 1 },
  deductionAmount: { color: DANGER, fontSize: 12, fontWeight: '700' },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: DIVIDER, marginTop: 12, paddingTop: 12 },
  netLabel: { color: DARK, fontSize: 14, fontWeight: '800' },
  netAmount: { color: GREEN, fontSize: 20, fontWeight: '900' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11 },
  detailText: { color: MUTED, fontSize: 12, flex: 1 },
  employerNote: { color: MUTED, backgroundColor: '#F8F6F4', borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 18, marginTop: 10 },
  responseActions: { flexDirection: 'row', gap: 9, marginTop: 15 },
  ackButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: ORANGE },
  ackText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  disputeAction: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: DANGER_BG },
  disputeActionText: { color: DANGER, fontSize: 12, fontWeight: '800' },
  responseNote: { color: MUTED, fontSize: 11, lineHeight: 17, marginTop: 9 },
  disputeNote: { backgroundColor: DANGER_BG, borderRadius: 11, padding: 11, marginTop: 12 },
  disputeNoteTitle: { color: DANGER, fontSize: 12, fontWeight: '800' },
  disputeNoteText: { color: DARK, fontSize: 12, lineHeight: 18, marginTop: 4 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(20,15,12,0.58)' },
  modalCard: { width: '100%', maxWidth: 440, backgroundColor: SURFACE, borderRadius: 20, padding: 20 },
  modalIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalTitle: { color: DARK, fontSize: 19, fontWeight: '900' },
  modalText: { color: MUTED, fontSize: 13, lineHeight: 19, marginTop: 7 },
  reasonInput: { minHeight: 100, maxHeight: 180, borderWidth: 1, borderColor: DIVIDER, borderRadius: 12, padding: 12, color: DARK, fontSize: 14, marginTop: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 18 },
  cancelButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 11, backgroundColor: '#F1EFED' },
  cancelText: { color: DARK, fontSize: 13, fontWeight: '800' },
  confirmButton: { minHeight: 44, minWidth: 142, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 11, backgroundColor: GREEN },
  disputeButton: { backgroundColor: DANGER },
  disabledButton: { opacity: 0.7 },
  confirmText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
