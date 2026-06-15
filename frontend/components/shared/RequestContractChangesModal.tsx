import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '@/constants/theme';
import { FormModalLayout } from './FormModalLayout';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void | Promise<void>;
  busy?: boolean;
};

export function RequestContractChangesModal({ visible, onClose, onSubmit, busy = false }: Props) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (visible) {
      setReason('');
    }
  }, [visible]);

  const canSubmit = reason.trim().length > 0 && !busy;

  return (
    <FormModalLayout
      visible={visible}
      onClose={onClose}
      title="Disagree with this contract"
      subtitle="Tell the employer what looks wrong or needs to change. They can update the details and send you a new contract to review."
      accent="helper"
      variant="standard"
      footer={
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={() => onSubmit(reason.trim())}
            disabled={!canSubmit}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Send to employer</Text>
            )}
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={styles.label}>What needs to change?</Text>
      <TextInput
        style={styles.input}
        value={reason}
        onChangeText={setReason}
        placeholder="e.g. The salary listed doesn't match what we agreed, the rest day should be Saturday..."
        placeholderTextColor={theme.color.subtle}
        multiline
        textAlignVertical="top"
        maxLength={1000}
        editable={!busy}
      />
      <Text style={styles.hint}>
        The contract will stay pending until the employer reviews your request and sends an updated version.
      </Text>
    </FormModalLayout>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: theme.font.small,
    fontWeight: '700',
    color: theme.color.inkMuted,
    marginBottom: theme.space.sm,
    paddingHorizontal: theme.space.lg,
    marginTop: theme.space.md,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: theme.radius.md,
    padding: 14,
    fontSize: theme.font.body,
    color: theme.color.ink,
    minHeight: 120,
    marginHorizontal: theme.space.lg,
    backgroundColor: theme.color.surfaceElevated,
  },
  hint: {
    fontSize: theme.font.caption,
    color: theme.color.muted,
    lineHeight: 18,
    marginTop: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.space.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  cancelText: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.color.inkMuted,
  },
  submitBtn: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    backgroundColor: theme.color.danger,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: '#fff',
  },
});
