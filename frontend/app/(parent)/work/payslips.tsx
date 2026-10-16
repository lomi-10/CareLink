import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateField } from '@/components/shared';
import { ParentWorkModeShell } from '@/components/parent/work/ParentWorkModeShell';
import { useAuth, useNotice } from '@/hooks/shared';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import {
  createParentPayslip,
  fetchParentPayslips,
  type HelperPayslip,
  type ParentPayslipInput,
} from '@/lib/payslipsApi';
import { formatPeso } from '@/lib/payrollApi';
import { ymdLocal } from '@/lib/helperWorkApi';
import type { ActivePlacement } from '@/hooks/parent/useParentActivePlacements';
import { BROWN, DARK, DIVIDER, ICON_BG, MUTED, SUBTLE, SURFACE } from '@/components/parent/home/parentWarmTheme';

const METHODS: ParentPayslipInput['payment_method'][] = ['Cash', 'Bank transfer', 'E-wallet', 'Other'];

function monthStart(today: string) {
  return `${today.slice(0, 7)}-01`;
}

function dateLabel(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusLabel(status: HelperPayslip['status']) {
  if (status === 'acknowledged') return 'Helper acknowledged';
  if (status === 'disputed') return 'Disputed by helper';
  return 'Awaiting helper response';
}

function PaymentForm({
  placement,
  parentId,
  onClose,
  onSaved,
}: {
  placement: ActivePlacement;
  parentId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { notify, noticeHost } = useNotice();
  const today = ymdLocal();
  const [periodStart, setPeriodStart] = useState(monthStart(today));
  const [periodEnd, setPeriodEnd] = useState(today);
  const [paidAt, setPaidAt] = useState(today);
  const [gross, setGross] = useState(String(placement.confirmed_salary ?? placement.salary_offered ?? ''));
  const [deductionLabel, setDeductionLabel] = useState('');
  const [deduction, setDeduction] = useState('');
  const [method, setMethod] = useState<ParentPayslipInput['payment_method']>('Cash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    const grossAmount = Number(gross);
    const deductionAmount = deduction.trim() ? Number(deduction) : 0;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd) || periodStart > periodEnd) {
      notify('Check the pay period', 'Choose valid dates and make sure the end date is not before the start date.', 'warning');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || paidAt > today) {
      notify('Check payment date', 'Record only a payment that has already been made.', 'warning');
      return;
    }
    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      notify('Enter a valid amount', 'Gross pay must be a positive peso amount.', 'warning');
      return;
    }
    if (!Number.isFinite(deductionAmount) || deductionAmount < 0 || deductionAmount > grossAmount) {
      notify('Check the deduction', 'Deductions must be zero or a positive amount no greater than gross pay.', 'warning');
      return;
    }
    if (deductionAmount > 0 && !deductionLabel.trim()) {
      notify('Name the deduction', 'Add a short label for the deduction amount.', 'warning');
      return;
    }

    setBusy(true);
    try {
      const result = await createParentPayslip({
        application_id: Number(placement.application_id),
        user_id: parentId,
        user_type: 'parent',
        pay_period_start: periodStart,
        pay_period_end: periodEnd,
        paid_at: paidAt,
        gross_amount: grossAmount,
        deductions: deductionAmount > 0 ? [{ label: deductionLabel.trim(), amount: deductionAmount }] : [],
        payment_method: method,
        employer_note: note.trim() || undefined,
      });
      if (!result.success) {
        notify('Payment record not saved', result.message || 'Please try again.', 'error');
        return;
      }
      await onSaved();
    } catch (error) {
      console.error('Could not record employer payslip:', error);
      notify('Payment record not saved', 'Check your connection and try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={busy ? undefined : onClose}>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFrame}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Record a payment</Text>
                <Text style={styles.modalSubtitle}>{placement.helper_name} · {placement.job_title}</Text>
              </View>
              <TouchableOpacity onPress={onClose} disabled={busy} accessibilityLabel="Close payment form">
                <Ionicons name="close" size={23} color={SUBTLE} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Field label="Pay period start"><DateField value={periodStart} onChange={setPeriodStart} maximumDate={new Date()} /></Field>
              <Field label="Pay period end"><DateField value={periodEnd} onChange={setPeriodEnd} maximumDate={new Date()} /></Field>
              <Field label="Date payment was made"><DateField value={paidAt} onChange={setPaidAt} maximumDate={new Date()} /></Field>
              <Field label="Gross amount (₱)">
                <TextInput value={gross} onChangeText={setGross} keyboardType="decimal-pad" style={styles.input} placeholder="0.00" />
              </Field>
              <Text style={styles.prefillHint}>Prefilled from the agreed contract salary when available. Adjust it to the amount actually paid for this period.</Text>
              <Field label="Deduction label (optional)">
                <TextInput value={deductionLabel} onChangeText={setDeductionLabel} style={styles.input} placeholder="e.g. Cash advance" maxLength={80} />
              </Field>
              <Field label="Deduction amount (₱)">
                <TextInput value={deduction} onChangeText={setDeduction} keyboardType="decimal-pad" style={styles.input} placeholder="0.00" />
              </Field>
              <Field label="Payment method">
                <View style={styles.methodGrid}>
                  {METHODS.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.methodButton, method === item && styles.methodSelected]}
                      onPress={() => setMethod(item)}
                    >
                      <Text style={[styles.methodText, method === item && styles.methodTextSelected]}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>
              <Field label="Note (optional)">
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  style={[styles.input, styles.noteInput]}
                  placeholder="Add context for this payment record"
                  maxLength={500}
                  multiline
                />
              </Field>
              <TouchableOpacity style={[styles.saveButton, busy && { opacity: 0.65 }]} onPress={() => void save()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
                <Text style={styles.saveText}>{busy ? 'Saving…' : 'Record payment made'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
      {noticeHost}
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>;
}

export default function ParentPayslipsScreen() {
  const { userData } = useAuth();
  const parentId = Number(userData?.user_id ?? 0);
  const { placements, loading: placementsLoading, error: placementsError } = useParentActivePlacements();
  const { notify, noticeHost } = useNotice();
  const [records, setRecords] = useState<Record<string, HelperPayslip[]>>({});
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [selected, setSelected] = useState<ActivePlacement | null>(null);

  const loadRecords = useCallback(async () => {
    if (!parentId || placements.length === 0) {
      setRecords({});
      setRecordsError('');
      return;
    }
    setRecordsLoading(true);
    setRecordsError('');
    try {
      const results = await Promise.all(placements.map(async (placement) => ({
        id: String(placement.application_id),
        result: await fetchParentPayslips(Number(placement.application_id), parentId),
      })));
      const next: Record<string, HelperPayslip[]> = {};
      const failures: string[] = [];
      for (const { id, result } of results) {
        if (result.success) next[id] = result.payslips ?? [];
        else failures.push(result.message || `Could not load payment records for placement ${id}.`);
      }
      setRecords(next);
      setRecordsError(failures.join(' '));
    } catch (error) {
      console.error('Could not load employer payment records:', error);
      setRecordsError('Payment records could not be loaded. Check your connection and try again.');
    } finally {
      setRecordsLoading(false);
    }
  }, [parentId, placements]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const saved = async () => {
    setSelected(null);
    await loadRecords();
    notify('Payment recorded', 'The helper can review the record and acknowledge or dispute it. This response does not independently verify a bank or cash transfer.', 'success');
  };

  return (
    <ParentWorkModeShell active="home" title="Payment records" subtitle="Record payments already made and keep a shared wage history">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={18} color={BROWN} />
          <Text style={styles.noticeText}>A helper’s acknowledgment records their response; it does not independently prove a cash or electronic transfer. Keep any separate receipt or transfer confirmation.</Text>
        </View>
        {(placementsError || recordsError) ? <Text style={styles.error}>{placementsError || recordsError}</Text> : null}
        {placementsLoading || recordsLoading ? <ActivityIndicator color={BROWN} size="large" style={{ marginTop: 22 }} /> : null}
        {!placementsLoading && placements.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={28} color={BROWN} />
            <Text style={styles.emptyTitle}>Payment records preview</Text>
            <Text style={styles.emptyText}>After a placement starts, record the actual pay period, amount, deductions, and payment method here.</Text>
          </View>
        ) : null}
        {placements.map((placement) => {
          const slips = records[String(placement.application_id)] ?? [];
          return (
            <View key={placement.application_id} style={styles.placementCard}>
              <View style={styles.placementHeader}>
                <View style={styles.placementIcon}><Ionicons name="person-outline" size={19} color={BROWN} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>{placement.helper_name}</Text>
                  <Text style={styles.role} numberOfLines={1}>{placement.job_title}</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => setSelected(placement)}>
                  <Ionicons name="add" size={17} color="#fff" />
                  <Text style={styles.addText}>Record</Text>
                </TouchableOpacity>
              </View>
              {slips.length === 0 ? (
                <Text style={styles.noRecords}>No payment records have been entered for this placement.</Text>
              ) : slips.map((slip) => (
                <View key={slip.payslip_id} style={styles.record}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.period}>{dateLabel(slip.pay_period_start)} – {dateLabel(slip.pay_period_end)}</Text>
                    <Text style={styles.recordSub}>Gross: {formatPeso(slip.gross_amount)} · Paid {dateLabel(slip.paid_at)} · {slip.payment_method}</Text>
                    {slip.deductions.length > 0 ? (
                      <Text style={styles.recordSub}>Deductions ({formatPeso(slip.deductions_total)}): {slip.deductions.map((d) => `${d.label} ${formatPeso(d.amount)}`).join(', ')}</Text>
                    ) : null}
                    {slip.helper_dispute_reason ? <Text style={styles.dispute}>Helper’s note: {slip.helper_dispute_reason}</Text> : null}
                    {slip.employer_note ? <Text style={styles.recordSub}>Note: {slip.employer_note}</Text> : null}
                  </View>
                  <View style={styles.amountStatus}>
                    <Text style={styles.netLabel}>NET PAY</Text>
                    <Text style={styles.amount}>{formatPeso(slip.net_amount)}</Text>
                    <Text style={[styles.status, slip.status === 'disputed' && styles.statusDisputed]}>
                      {statusLabel(slip.status)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
        <TouchableOpacity style={styles.refreshButton} onPress={() => void loadRecords()} disabled={recordsLoading}>
          <Ionicons name="refresh-outline" size={16} color={BROWN} />
          <Text style={styles.refreshText}>Refresh payment records</Text>
        </TouchableOpacity>
      </ScrollView>
      {selected && parentId > 0 ? (
        <PaymentForm placement={selected} parentId={parentId} onClose={() => setSelected(null)} onSaved={saved} />
      ) : null}
      {noticeHost}
    </ParentWorkModeShell>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 36, gap: 12 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: ICON_BG, borderRadius: 13, padding: 12 },
  noticeText: { flex: 1, color: DARK, fontSize: 12, lineHeight: 17 },
  error: { color: '#B42318', backgroundColor: '#FEE4E2', borderRadius: 10, padding: 10, fontSize: 12 },
  empty: { alignItems: 'center', gap: 8, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, padding: 24 },
  emptyTitle: { color: DARK, fontSize: 15, fontWeight: '700' },
  emptyText: { color: MUTED, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  placementCard: { backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, padding: 13 },
  placementHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  placementIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  name: { color: DARK, fontSize: 13.5, fontWeight: '700' },
  role: { color: MUTED, fontSize: 11.5, marginTop: 2 },
  addButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: BROWN, borderRadius: 10, paddingHorizontal: 9 },
  addText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  noRecords: { color: MUTED, fontSize: 11.5, paddingTop: 13 },
  record: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 13, marginTop: 12, borderTopWidth: 1, borderTopColor: DIVIDER },
  period: { color: DARK, fontSize: 12.5, fontWeight: '700' },
  recordSub: { color: MUTED, fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  dispute: { color: '#B42318', fontSize: 10.5, lineHeight: 15, marginTop: 4 },
  amountStatus: { alignItems: 'flex-end', gap: 4, maxWidth: '44%' },
  amount: { color: DARK, fontSize: 14, fontWeight: '800' },
  netLabel: { color: MUTED, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5 },
  status: { color: '#6A573C', backgroundColor: '#F4EFE8', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, fontSize: 9, fontWeight: '700', textAlign: 'right' },
  statusDisputed: { color: '#A3261D', backgroundColor: '#FEE4E2' },
  refreshButton: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, padding: 10 },
  refreshText: { color: BROWN, fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(22,18,13,0.5)', justifyContent: 'center', padding: 12 },
  modalFrame: { width: '100%', maxWidth: 560, maxHeight: '96%', alignSelf: 'center' },
  modalCard: { backgroundColor: SURFACE, borderRadius: 18, overflow: 'hidden', maxHeight: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  modalTitle: { color: DARK, fontSize: 17, fontWeight: '800' },
  modalSubtitle: { color: MUTED, fontSize: 11.5, marginTop: 3 },
  formScroll: { flexShrink: 1 },
  form: { padding: 16, gap: 12 },
  field: { gap: 6 },
  fieldLabel: { color: DARK, fontSize: 12, fontWeight: '700' },
  input: { minHeight: 44, borderWidth: 1, borderColor: DIVIDER, borderRadius: 10, backgroundColor: '#fff', color: DARK, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13 },
  noteInput: { minHeight: 72, textAlignVertical: 'top' },
  prefillHint: { color: MUTED, fontSize: 10.5, lineHeight: 15, marginTop: -7 },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  methodButton: { borderWidth: 1, borderColor: DIVIDER, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  methodSelected: { borderColor: BROWN, backgroundColor: ICON_BG },
  methodText: { color: MUTED, fontSize: 11.5, fontWeight: '600' },
  methodTextSelected: { color: BROWN, fontWeight: '800' },
  saveButton: { minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BROWN, borderRadius: 12, marginTop: 3 },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
