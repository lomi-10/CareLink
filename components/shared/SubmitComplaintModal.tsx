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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';
import { submitComplaint, type ComplaintCategory } from '@/lib/complaintsApi';

type Props = {
  visible: boolean;
  onClose: () => void;
  applicationId: number;
  userType: 'parent' | 'helper';
  counterpartyLabel?: string;
  onSubmitted?: () => void;
};

const CATEGORIES: { value: ComplaintCategory; label: string }[] = [
  { value: 'conduct', label: 'Conduct / treatment' },
  { value: 'payment', label: 'Wages or payment' },
  { value: 'safety', label: 'Safety or working conditions' },
  { value: 'contract', label: 'Contract or duties' },
  { value: 'other', label: 'Other' },
];

export function SubmitComplaintModal({
  visible,
  onClose,
  applicationId,
  userType,
  counterpartyLabel,
  onSubmitted,
}: Props) {
  const [category, setCategory] = useState<ComplaintCategory>('other');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCategory('other');
    setSubject('');
    setBody('');
  };

  const onSubmit = async () => {
    const sub = subject.trim();
    const desc = body.trim();
    if (!sub || !desc) {
      Alert.alert('Complaint', 'Please add a short title and a description.');
      return;
    }
    const raw = await AsyncStorage.getItem('user_data');
    if (!raw) {
      Alert.alert('Complaint', 'Please sign in again.');
      return;
    }
    const user = JSON.parse(raw) as { user_id: string };
    const userId = Number(user.user_id);
    if (!userId) return;

    setBusy(true);
    try {
      const res = await submitComplaint({
        application_id: applicationId,
        user_id: userId,
        user_type: userType,
        subject: sub,
        description: desc,
        category,
      });
      if (!res.success) {
        Alert.alert('Complaint', res.message || 'Could not submit.');
        return;
      }
      reset();
      onSubmitted?.();
      onClose();
      Alert.alert(
        'Submitted',
        'Your complaint was sent to CareLink super admins. If they determine the matter needs government follow-up, it will be forwarded to PESO and you will be notified.',
      );
    } finally {
      setBusy(false);
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
                  style={[styles.catChip, category === c.value && styles.catChipOn]}
                  onPress={() => setCategory(c.value)}
                >
                  <Text style={[styles.catChipText, category === c.value && styles.catChipTextOn]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Short title</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Late salary for March"
              placeholderTextColor={theme.color.subtle}
            />
            <Text style={styles.label}>What happened?</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={body}
              onChangeText={setBody}
              placeholder="Facts, dates, and what you’ve already tried help admins review fairly."
              placeholderTextColor={theme.color.subtle}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.submit, busy && { opacity: 0.7 }]}
              onPress={() => void onSubmit()}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit to super admin</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  submit: {
    marginTop: 20,
    backgroundColor: theme.color.parent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
