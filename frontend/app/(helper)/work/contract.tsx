import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import { useAuth, useNotice } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { WorkModeShell } from '@/components/helper/work';
import { DateField } from '@/components/shared';
import {
  DARK,
  DIVIDER,
  ICON_BG,
  MUTED,
  ORANGE,
  SUBTLE,
  SURFACE,
} from '@/components/helper/home/helperWarmTheme';
import { applicationContractPdfUrl } from '@/constants/applications';
import {
  fetchLeaveRequests,
  labelForLeaveReasonCode,
  LEAVE_REASON_OPTIONS,
  submitLeaveRequest,
  type LeaveReasonCode,
  type LeaveRequestRow,
} from '@/lib/leaveRequestsApi';
import { formatPeso } from '@/lib/payrollApi';
import { ymdLocal } from '@/lib/helperWorkApi';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not specified';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function showValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || String(value).trim() === ''
    ? 'Not specified'
    : String(value);
}

export default function HelperContractScreen() {
  const { userData, loading: authLoading } = useAuth();
  const { ready, isWorkMode, activeHire } = useHelperWorkMode();
  const { notify, noticeHost } = useNotice();
  const helperId = Number(userData?.user_id ?? 0);
  const isActive = ready && isWorkMode && !!activeHire;

  const [requests, setRequests] = useState<LeaveRequestRow[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState(ymdLocal());
  const [reasonCode, setReasonCode] = useState<LeaveReasonCode>('personal');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!activeHire || helperId <= 0) return;
    setRequestsError('');
    setRequestsLoading(true);
    try {
      const result = await fetchLeaveRequests(activeHire.application_id, helperId, 'helper');
      if (!result.success) {
        setRequestsError(result.message || 'Could not load leave requests.');
        return;
      }
      setRequests(result.data ?? []);
    } catch (error) {
      console.error('Could not load helper leave requests:', error);
      setRequestsError('Could not load leave requests. Check your connection and try again.');
    } finally {
      setRequestsLoading(false);
    }
  }, [activeHire, helperId]);

  useEffect(() => {
    if (isActive && helperId > 0) void loadRequests();
  }, [helperId, isActive, loadRequests]);

  const contractDetails = useMemo(() => {
    if (!activeHire) return [];
    return [
      { label: 'Employer', value: activeHire.employer_name },
      { label: 'Position', value: activeHire.job_title },
      { label: 'Agreed salary', value: activeHire.salary_amount != null ? `${formatPeso(activeHire.salary_amount)}${activeHire.salary_period ? ` / ${activeHire.salary_period}` : ''}` : null },
      { label: 'Payment schedule', value: activeHire.payment_schedule },
      { label: 'Work hours', value: activeHire.work_hours },
      { label: 'Rest days', value: activeHire.rest_days?.join(', ') },
      { label: 'Overtime rate', value: activeHire.overtime_rate },
      { label: 'Contract duration', value: activeHire.contract_duration },
      { label: 'Start date', value: activeHire.employment_start_date ? formatDate(activeHire.employment_start_date) : null },
      { label: 'End date', value: activeHire.employment_end_date ? formatDate(activeHire.employment_end_date) : null },
      { label: 'Vacation leave days', value: activeHire.vacation_leave_days },
      { label: 'Sick leave days', value: activeHire.sick_leave_days },
    ];
  }, [activeHire]);

  const submitLeave = async () => {
    if (!activeHire || helperId <= 0 || submitting) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(leaveDate) || leaveDate < ymdLocal()) {
      notify('Choose a valid date', 'Leave requests must be for today or a future date.', 'warning');
      return;
    }
    if (activeHire.employment_end_date && leaveDate > activeHire.employment_end_date) {
      notify('Date is outside the contract', 'Choose a date on or before your contract end date.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitLeaveRequest(activeHire.application_id, helperId, {
        date: leaveDate,
        reason_code: reasonCode,
        helper_note: note.trim() || null,
      });
      if (!result.success) {
        notify('Request not sent', result.message || 'Could not submit your leave request.', 'error');
        return;
      }
      setLeaveOpen(false);
      setNote('');
      notify(
        'Leave request sent',
        result.warnings?.includes('paid_limit_reached')
          ? 'Your employer will be notified. If approved, this request will be recorded as unpaid leave because your paid leave limit has been reached.'
          : 'Your employer will be notified. You can check the response here.',
        'success',
      );
      await loadRequests();
    } catch (error) {
      console.error('Could not submit helper leave request:', error);
      notify('Request not sent', 'Check your connection and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openSignedContract = async () => {
    if (!activeHire || helperId <= 0) return;
    try {
      await WebBrowser.openBrowserAsync(applicationContractPdfUrl(activeHire.application_id, helperId, 'helper'));
    } catch (error) {
      console.error('Could not open signed helper contract:', error);
      notify('Could not open contract', 'Please try again in a moment.', 'error');
    }
  };

  if (authLoading || !ready) {
    return (
      <WorkModeShell desktopTitle="Contract" desktopSubtitle="Read-only agreement reference">
        <View style={styles.loading}><ActivityIndicator color={ORANGE} size="large" /></View>
      </WorkModeShell>
    );
  }

  return (
    <WorkModeShell desktopTitle="Contract" desktopSubtitle="Read-only agreement reference">
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="document-text-outline" size={21} color={ORANGE} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>{isActive ? 'Contract reference' : 'Contract preview'}</Text>
            <Text style={styles.subtitle}>
              {isActive
                ? 'A read-only summary of the terms recorded for your signed placement.'
                : 'This preview shows where your signed terms, ending conditions, and leave requests will appear after a placement starts.'}
            </Text>
          </View>
          {!isActive ? <PreviewPill /> : null}
        </View>

        {isActive && activeHire ? (
          <>
            <View style={styles.notice}>
              <Ionicons name="lock-closed-outline" size={17} color={ORANGE} />
              <Text style={styles.noticeText}>This summary is read-only. The signed contract PDF is the full agreement and remains the reference for both parties.</Text>
            </View>

            <Section title="Agreed terms" icon="briefcase-outline">
              {contractDetails.map((detail) => <DetailRow key={detail.label} label={detail.label} value={showValue(detail.value)} />)}
              {activeHire.work_location ? <DetailRow label="Work location" value={activeHire.work_location} /> : null}
            </Section>

            <Section title="Duties and additional terms" icon="list-outline">
              <Text style={styles.bodyCopy}>{activeHire.job_description?.trim() || 'Refer to the duties listed in the signed contract.'}</Text>
              {activeHire.terms_notes?.trim() ? <DetailRow label="Contract notes" value={activeHire.terms_notes.trim()} multiline /> : null}
              {activeHire.special_conditions?.trim() ? <DetailRow label="Special conditions" value={activeHire.special_conditions.trim()} multiline /> : null}
              {activeHire.other_benefits?.trim() ? <DetailRow label="Other benefits" value={activeHire.other_benefits.trim()} multiline /> : null}
            </Section>

            {activeHire.debt_agreement?.trim() || activeHire.deployment_agreement?.trim() || activeHire.debt_amount != null ? (
              <Section title="Debt and deployment agreements" icon="receipt-outline">
                {activeHire.debt_amount != null ? <DetailRow label="Recorded amount" value={formatPeso(activeHire.debt_amount)} /> : null}
                {activeHire.debt_agreement?.trim() ? <DetailRow label="Debt agreement" value={activeHire.debt_agreement.trim()} multiline /> : null}
                {activeHire.deployment_agreement?.trim() ? <DetailRow label="Deployment agreement" value={activeHire.deployment_agreement.trim()} multiline /> : null}
              </Section>
            ) : null}

            <Section title="Ending the agreement" icon="exit-outline">
              <Text style={styles.bodyCopy}>
                {activeHire.termination_conditions?.trim() || 'No separate termination conditions are listed in this summary. Review the full signed contract for the agreed termination terms.'}
              </Text>
            </Section>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => void openSignedContract()} activeOpacity={0.8}>
              <Ionicons name="open-outline" size={18} color={ORANGE} />
              <Text style={styles.secondaryButtonText}>Open full signed contract</Text>
            </TouchableOpacity>

            <Section title="Leave requests" icon="calendar-outline">
              <Text style={styles.bodyCopy}>Request a day off here and check your employer’s response. A request is not approved until your employer responds.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => { setLeaveDate(ymdLocal()); setLeaveOpen(true); }} activeOpacity={0.85}>
                <Ionicons name="add" size={19} color="#fff" />
                <Text style={styles.primaryButtonText}>Request leave</Text>
              </TouchableOpacity>
              {requestsLoading ? <ActivityIndicator color={ORANGE} style={{ marginTop: 14 }} /> : null}
              {requestsError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{requestsError}</Text>
                  <TouchableOpacity onPress={() => void loadRequests()}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
                </View>
              ) : null}
              {!requestsLoading && !requestsError && requests.length === 0 ? (
                <Text style={styles.emptyText}>No leave requests yet.</Text>
              ) : null}
              {requests.map((request) => <LeaveRequestCard key={request.id} request={request} />)}
            </Section>
          </>
        ) : (
          <>
            <Section title="Agreed terms" icon="briefcase-outline">
              <DetailRow label="Agreed salary" value="Shown from your signed agreement" />
              <DetailRow label="Work hours" value="Shown from your signed agreement" />
              <DetailRow label="Rest days" value="Shown from your signed agreement" />
              <DetailRow label="Start and end dates" value="Shown from your signed agreement" />
            </Section>
            <Section title="Duties and ending conditions" icon="list-outline">
              <Text style={styles.bodyCopy}>The signed agreement will show the role, duties, special conditions, and any agreed termination terms.</Text>
            </Section>
            <Section title="Leave requests" icon="calendar-outline">
              <Text style={styles.bodyCopy}>Leave requests become available here after your Work Mode tools unlock for an active placement.</Text>
              <View style={styles.disabledButton}><Ionicons name="lock-closed-outline" size={16} color={SUBTLE} /><Text style={styles.disabledButtonText}>Available after placement starts</Text></View>
            </Section>
          </>
        )}
      </ScrollView>

      {isActive && activeHire ? (
        <LeaveRequestModal
          visible={leaveOpen}
          date={leaveDate}
          reasonCode={reasonCode}
          note={note}
          submitting={submitting}
          endDate={activeHire.employment_end_date}
          onDateChange={setLeaveDate}
          onReasonChange={setReasonCode}
          onNoteChange={setNote}
          onClose={() => setLeaveOpen(false)}
          onSubmit={() => void submitLeave()}
        />
      ) : null}
      {noticeHost}
    </WorkModeShell>
  );
}

function PreviewPill() {
  return (
    <View style={styles.previewPill}>
      <Ionicons name="eye-outline" size={12} color={ORANGE} />
      <Text style={styles.previewPillText}>PREVIEW</Text>
    </View>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Ionicons name={icon} size={18} color={ORANGE} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function DetailRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={[styles.detailRow, multiline && styles.multilineRow]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, multiline && styles.multilineValue]}>{value}</Text>
    </View>
  );
}

function LeaveRequestCard({ request }: { request: LeaveRequestRow }) {
  const statusColor = request.status === 'approved' ? '#278047' : request.status === 'declined' ? '#B64035' : '#9A6400';
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestTop}>
        <Text style={styles.requestDate}>{formatDate(request.date)}</Text>
        <Text style={[styles.requestStatus, { color: statusColor }]}>{request.status}</Text>
      </View>
      <Text style={styles.requestReason}>{labelForLeaveReasonCode(request.reason_code)}</Text>
      {request.helper_note ? <Text style={styles.requestNote}>{request.helper_note}</Text> : null}
      {request.response_note ? <Text style={styles.responseNote}>Employer response: {request.response_note}</Text> : null}
    </View>
  );
}

function LeaveRequestModal({
  visible,
  date,
  reasonCode,
  note,
  submitting,
  endDate,
  onDateChange,
  onReasonChange,
  onNoteChange,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  date: string;
  reasonCode: LeaveReasonCode;
  note: string;
  submitting: boolean;
  endDate?: string | null;
  onDateChange: (date: string) => void;
  onReasonChange: (reason: LeaveReasonCode) => void;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Request leave</Text>
              <Text style={styles.modalSubtitle}>Your employer will review this request.</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}><Ionicons name="close" size={24} color={DARK} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBody}>
            <Text style={styles.inputLabel}>Date requested</Text>
            <DateField
              value={date}
              onChange={onDateChange}
              minimumDate={new Date()}
              maximumDate={endDate ? new Date(`${endDate.slice(0, 10)}T00:00:00`) : undefined}
            />
            <Text style={styles.inputLabel}>Reason</Text>
            <View style={styles.reasonOptions}>
              {LEAVE_REASON_OPTIONS.map((option) => {
                const selected = reasonCode === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                    onPress={() => onReasonChange(option.value)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.reasonOptionText, selected && styles.reasonOptionTextSelected]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.inputLabel}>Note for your employer <Text style={styles.optionalText}>(optional)</Text></Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={onNoteChange}
              placeholder="Add any useful details"
              placeholderTextColor={SUBTLE}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryButton, styles.submitButton, submitting && styles.buttonBusy]} onPress={onSubmit} disabled={submitting} activeOpacity={0.85}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryButtonText}>Send request</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center' },
  page: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 16, paddingBottom: 32, gap: 12 },
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 18, padding: 16 },
  heroIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, minWidth: 0 },
  title: { color: DARK, fontSize: 20, fontWeight: '700' },
  subtitle: { color: MUTED, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  previewPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: ICON_BG },
  previewPillText: { color: ORANGE, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 13, backgroundColor: ICON_BG },
  noticeText: { flex: 1, color: DARK, fontSize: 12, lineHeight: 17 },
  section: { backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 17, padding: 15 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { color: DARK, fontSize: 15, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: DIVIDER },
  detailLabel: { color: MUTED, fontSize: 12, flex: 0.8 },
  detailValue: { color: DARK, fontSize: 12, fontWeight: '600', flex: 1.2, textAlign: 'right' },
  multilineRow: { flexDirection: 'column', gap: 5 },
  multilineValue: { flex: 1, textAlign: 'left', fontWeight: '400', lineHeight: 18 },
  bodyCopy: { color: MUTED, fontSize: 12.5, lineHeight: 19 },
  secondaryButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: SURFACE, borderWidth: 1, borderColor: ORANGE, borderRadius: 13 },
  secondaryButtonText: { color: ORANGE, fontSize: 13, fontWeight: '700' },
  primaryButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 15, marginTop: 12 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabledButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F4F1EE', borderRadius: 12, marginTop: 12 },
  disabledButtonText: { color: SUBTLE, fontSize: 12, fontWeight: '600' },
  emptyText: { color: MUTED, fontSize: 12, textAlign: 'center', paddingVertical: 15 },
  errorBox: { borderRadius: 11, backgroundColor: '#FEF2F2', padding: 11, marginTop: 12 },
  errorText: { color: '#B42318', fontSize: 12 },
  retryText: { color: '#B42318', fontSize: 12, fontWeight: '700', marginTop: 7 },
  requestCard: { borderWidth: 1, borderColor: DIVIDER, borderRadius: 12, padding: 11, marginTop: 9, backgroundColor: '#FBF8F5' },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  requestDate: { color: DARK, fontSize: 12, fontWeight: '700' },
  requestStatus: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  requestReason: { color: MUTED, fontSize: 11.5, marginTop: 4 },
  requestNote: { color: MUTED, fontSize: 11, marginTop: 5, lineHeight: 16 },
  responseNote: { color: DARK, fontSize: 11, marginTop: 5, lineHeight: 16 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 15 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(27,17,11,0.55)' },
  modalCard: { width: '100%', maxWidth: 500, maxHeight: '90%', backgroundColor: SURFACE, borderRadius: 18, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 17, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  modalTitle: { color: DARK, fontSize: 17, fontWeight: '700' },
  modalSubtitle: { color: MUTED, fontSize: 11.5, marginTop: 3 },
  modalBody: { padding: 16, paddingBottom: 20 },
  inputLabel: { color: DARK, fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 12 },
  optionalText: { color: MUTED, fontWeight: '400' },
  reasonOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  reasonOption: { borderWidth: 1, borderColor: DIVIDER, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#FBF8F5' },
  reasonOptionSelected: { borderColor: ORANGE, backgroundColor: ICON_BG },
  reasonOptionText: { color: MUTED, fontSize: 11.5, fontWeight: '600' },
  reasonOptionTextSelected: { color: ORANGE },
  noteInput: { minHeight: 90, borderWidth: 1, borderColor: DIVIDER, borderRadius: 11, padding: 11, color: DARK, fontSize: 13, backgroundColor: '#FBF8F5' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 9, padding: 14, borderTopWidth: 1, borderTopColor: DIVIDER },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 12 },
  cancelButtonText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  submitButton: { minWidth: 125, marginTop: 0 },
  buttonBusy: { opacity: 0.7 },
});
