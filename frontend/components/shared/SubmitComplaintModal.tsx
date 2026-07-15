import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';
import { submitComplaint, type ComplaintCategory } from '@/lib/complaintsApi';
import { NotificationModal } from './NotificationModal';

const MIN_DESC = 20;

// theme.color.parent/helper are a legacy blue/green that match neither portal's
// branding — a blue CTA in the warm brown parent app reads like someone else's form.
// Key the accent off userType instead, using each portal's real brand colour.
const ACCENT: Record<'parent' | 'helper', string> = {
  parent: '#8B5A2B', // parentWarmTheme BROWN
  helper: '#E8641A', // helper webTheme accent
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Placement complaint: the hire's application id. */
  applicationId?: number;
  /** General complaint (browsing / pre-hire): the reported user's id. */
  respondentId?: number;
  userType: 'parent' | 'helper';
  counterpartyLabel?: string;
  onSubmitted?: () => void;
};

const CATEGORIES: { value: ComplaintCategory; label: string }[] = [
  { value: 'conduct', label: 'Conduct / treatment' },
  { value: 'payment', label: 'Wages or payment' },
  { value: 'unsafe_conditions', label: 'Unsafe working conditions' },
  { value: 'abuse_or_mistreatment', label: 'Abuse or mistreatment' },
  { value: 'contract', label: 'Contract or duties' },
  { value: 'other', label: 'Other' },
];

export function SubmitComplaintModal({
  visible,
  onClose,
  applicationId,
  respondentId,
  userType,
  counterpartyLabel,
  onSubmitted,
}: Props) {
  const [category, setCategory] = useState<ComplaintCategory>('other');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  // Inline, per-field errors — these used to be Alert.alert() calls, which are a
  // no-op on react-native-web, so every failed submit looked like a dead button.
  const [errors, setErrors] = useState<{ subject?: string; body?: string }>({});
  const [notice, setNotice] = useState<{ visible: boolean; title?: string; message: string; type: 'success' | 'error' | 'info' }>(
    { visible: false, message: '', type: 'info' },
  );
  const [sent, setSent] = useState(false);

  const reset = () => {
    setCategory('other');
    setSubject('');
    setBody('');
    setErrors({});
  };

  const validate = () => {
    const next: { subject?: string; body?: string } = {};
    const sub = subject.trim();
    const desc = body.trim();
    if (!sub) next.subject = 'Please add a short title.';
    else if (sub.length < 5) next.subject = 'Give it a little more detail (at least 5 characters).';
    if (!desc) next.body = 'Please describe what happened.';
    else if (desc.length < MIN_DESC) next.body = `Please add a bit more — at least ${MIN_DESC} characters so admins can review it fairly.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (busy) return;
    if (!validate()) return;

    const raw = await AsyncStorage.getItem('user_data');
    const userId = raw ? Number((JSON.parse(raw) as { user_id: string }).user_id) : 0;
    if (!userId) {
      setNotice({ visible: true, title: 'Session expired', message: 'Please sign in again to submit this report.', type: 'error' });
      return;
    }
    if (!applicationId && !respondentId) {
      setNotice({ visible: true, title: 'Something went wrong', message: 'We could not identify who this report is about. Please close this and try again from their profile.', type: 'error' });
      return;
    }

    setBusy(true);
    try {
      const res = await submitComplaint({
        application_id: applicationId,
        respondent_id: respondentId,
        user_id: userId,
        user_type: userType,
        subject: subject.trim(),
        description: body.trim(),
        category,
      });
      if (!res.success) {
        setNotice({ visible: true, title: 'Could not submit', message: res.message || 'Your report was not sent. Please try again in a moment.', type: 'error' });
        return;
      }
      // Show the confirmation first, then close — closing straight away would unmount
      // this notification before the reporter ever sees it.
      setSent(true);
      setNotice({
        visible: true,
        title: 'Report submitted',
        message: 'Your report was sent to CareLink super admins. If it needs government follow-up, it will be forwarded to PESO and you will be notified.',
        type: 'success',
      });
    } catch (e: any) {
      setNotice({ visible: true, title: 'Could not submit', message: e?.message || 'Something went wrong sending your report. Please check your connection and try again.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const dismissNotice = () => {
    setNotice((n) => ({ ...n, visible: false }));
    if (sent) {
      setSent(false);
      reset();
      onSubmitted?.();
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Report an issue</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={26} color={theme.color.ink} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            This goes to <Text style={styles.hintBold}>super admins</Text> first. Serious cases can be forwarded to{' '}
            <Text style={styles.hintBold}>PESO</Text> with notice to you and the other party.
            {counterpartyLabel ? ` Regarding: ${counterpartyLabel}.` : ''}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.catChip,
                    category === c.value && { backgroundColor: ACCENT[userType] + '1A', borderColor: ACCENT[userType] },
                  ]}
                  onPress={() => setCategory(c.value)}
                >
                  <Text style={[styles.catChipText, category === c.value && { color: ACCENT[userType], fontWeight: '800' }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Short title <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, !!errors.subject && styles.inputError]}
              value={subject}
              onChangeText={(v) => { setSubject(v); if (errors.subject) setErrors((e) => ({ ...e, subject: undefined })); }}
              placeholder="e.g. Late salary for March"
              placeholderTextColor={theme.color.subtle}
              maxLength={120}
            />
            {!!errors.subject && (
              <View style={styles.errRow}>
                <Ionicons name="alert-circle" size={14} color={theme.color.danger} />
                <Text style={styles.errText}>{errors.subject}</Text>
              </View>
            )}

            <Text style={styles.label}>What happened? <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.inputMulti, !!errors.body && styles.inputError]}
              value={body}
              onChangeText={(v) => { setBody(v); if (errors.body) setErrors((e) => ({ ...e, body: undefined })); }}
              placeholder="Facts, dates, and what you’ve already tried help admins review fairly."
              placeholderTextColor={theme.color.subtle}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
            {errors.body ? (
              <View style={styles.errRow}>
                <Ionicons name="alert-circle" size={14} color={theme.color.danger} />
                <Text style={styles.errText}>{errors.body}</Text>
              </View>
            ) : (
              <Text style={styles.counter}>
                {body.trim().length < MIN_DESC
                  ? `${body.trim().length}/${MIN_DESC} characters minimum`
                  : `${body.length}/2000`}
              </Text>
            )}

            <View style={styles.privacyRow}>
              <Ionicons name="lock-closed-outline" size={14} color={theme.color.muted} />
              <Text style={styles.privacyText}>
                Only CareLink super admins can read this. The other party is not notified unless the case is escalated.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submit, { backgroundColor: ACCENT[userType] }, busy && { opacity: 0.7 }]}
              onPress={() => void onSubmit()}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.submitText}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.submitNote}>Goes to super admins for review.</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Rendered inside this Modal so it stays visible on web, where Alert.alert()
          silently does nothing. */}
      <NotificationModal
        visible={notice.visible}
        title={notice.title}
        message={notice.message}
        type={notice.type}
        onClose={dismissNotice}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.overlay },
  sheet: {
    backgroundColor: theme.color.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
    maxHeight: '92%',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '900', color: theme.color.ink },
  hint: {
    fontSize: 14,
    color: theme.color.muted,
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  hintBold: { fontWeight: '800', color: theme.color.ink },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  label: { fontSize: 13, fontWeight: '700', color: theme.color.inkMuted, marginBottom: 8, marginTop: 12 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  catChipOn: { backgroundColor: theme.color.parentSoft, borderColor: theme.color.parent + '55' },
  catChipText: { fontSize: 12, fontWeight: '600', color: theme.color.ink },
  catChipTextOn: { color: theme.color.parent, fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.color.ink,
  },
  inputMulti: { minHeight: 120 },
  inputError: { borderColor: theme.color.danger, borderWidth: 1.5 },
  req: { color: theme.color.danger },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  errText: { flex: 1, color: theme.color.danger, fontSize: 13, lineHeight: 18 },
  counter: { fontSize: 12, color: theme.color.subtle, marginTop: 6, alignSelf: 'flex-end' },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    backgroundColor: theme.color.line,
    borderRadius: 10,
    padding: 10,
  },
  privacyText: { flex: 1, fontSize: 12, color: theme.color.muted, lineHeight: 17 },
  submit: {
    marginTop: 16,
    backgroundColor: theme.color.parent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  submitNote: { fontSize: 11.5, color: theme.color.subtle, textAlign: 'center', marginTop: 8, marginBottom: 4 },
});
