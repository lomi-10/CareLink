import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import {
  fetchLeaveRequests,
  respondToLeaveRequest,
  labelForLeaveReasonCode,
  type LeaveRequestRow,
} from '@/lib/leaveRequestsApi';

type Props = {
  applicationId: number;
  parentId: number;
  helperName: string;
  onResponded?: () => void;
};

export function LeaveRequestsPanel({ applicationId, parentId, helperName, onResponded }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineId, setDeclineId] = useState<number | null>(null);
  const [declineNote, setDeclineNote] = useState('');

  const load = useCallback(async () => {
    if (!applicationId || !parentId) return;
    setLoading(true);
    try {
      const res = await fetchLeaveRequests(applicationId, parentId, 'parent');
      if (res.success && res.data) setRows(res.data);
    } finally {
      setLoading(false);
    }
  }, [applicationId, parentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(() => rows.filter((r) => r.status === 'pending'), [rows]);

  const onApprove = async (id: number) => {
    setBusyId(id);
    try {
      const res = await respondToLeaveRequest(id, parentId, 'approved');
      if (!res.success) {
        Alert.alert('Leave', res.message || 'Could not update');
        return;
      }
      await load();
      onResponded?.();
    } finally {
      setBusyId(null);
    }
  };

  const openDecline = (id: number) => {
    setDeclineId(id);
    setDeclineNote('');
    setDeclineOpen(true);
  };

  const submitDecline = async () => {
    if (declineId == null) return;
    setBusyId(declineId);
    try {
      const res = await respondToLeaveRequest(declineId, parentId, 'declined', declineNote.trim() || null);
      if (!res.success) {
        Alert.alert('Leave', res.message || 'Could not update');
        return;
      }
      setDeclineOpen(false);
      setDeclineId(null);
      await load();
      onResponded?.();
    } finally {
      setBusyId(null);
    }
  };

  if (loading && rows.length === 0) {
    return <ActivityIndicator color={theme.color.parent} style={{ marginVertical: 12 }} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.title}>Leave requests</Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/(parent)/placement_leave_requests',
              params: {
                application_id: String(applicationId),
                helper_name: encodeURIComponent(helperName),
              },
            })
          }
          hitSlop={8}
        >
          <Text style={styles.link}>View all</Text>
        </TouchableOpacity>
      </View>
      {pending.length === 0 ? (
        <Text style={styles.empty}>No pending leave requests.</Text>
      ) : (
        pending.map((r) => {
          const name = r.helper_name || helperName;
          const busy = busyId === r.id;
          const reasonLabel = labelForLeaveReasonCode(r.reason_code);
          const noteParts = [r.helper_note?.trim(), r.reason?.trim()].filter(Boolean);
          const detailText = noteParts.length > 0 ? noteParts.join(' · ') : null;
          return (
            <View key={r.id} style={styles.card}>
              <Text style={styles.cardDate}>{formatDisplayDate(r.date)}</Text>
              <Text style={styles.cardHelper}>{name}</Text>
              <Text style={styles.reasonLabel}>{reasonLabel}</Text>
              {detailText ? <Text style={styles.cardNote}>{detailText}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.declineBtn]}
                  onPress={() => openDecline(r.id)}
                  disabled={busy}
                >
                  {busy && busyId === r.id ? (
                    <ActivityIndicator color={theme.color.danger} size="small" />
                  ) : (
                    <Text style={styles.declineText}>Decline</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => void onApprove(r.id)}
                  disabled={busy}
                >
                  {busy && busyId === r.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.approveText}>Approve</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <Modal visible={declineOpen} animationType="slide" transparent onRequestClose={() => setDeclineOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDeclineOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Decline request</Text>
            <Text style={styles.modalHint}>Optional note to the helper</Text>
            <TextInput
              style={styles.modalInput}
              value={declineNote}
              onChangeText={setDeclineNote}
              placeholder="Reason for declining"
              placeholderTextColor={theme.color.subtle}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setDeclineOpen(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, busyId === declineId && { opacity: 0.7 }]}
                onPress={() => void submitDecline()}
                disabled={busyId === declineId}
              >
                {busyId === declineId ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function formatDisplayDate(ymd: string) {
  try {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return ymd;
  }
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: '900', color: theme.color.ink },
  link: { fontSize: 14, fontWeight: '800', color: theme.color.parent },
  empty: { fontSize: 14, color: theme.color.muted, marginBottom: 8 },
  card: {
    borderRadius: 14,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
    padding: 12,
    marginBottom: 10,
  },
  cardDate: { fontSize: 15, fontWeight: '800', color: theme.color.ink },
  cardHelper: { fontSize: 13, fontWeight: '700', color: theme.color.parent, marginTop: 4 },
  reasonLabel: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  cardNote: { fontSize: 13, color: theme.color.muted, marginTop: 4, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  declineBtn: { backgroundColor: theme.color.dangerSoft, borderWidth: 1, borderColor: theme.color.line },
  declineText: { fontWeight: '800', color: theme.color.danger },
  approveBtn: { backgroundColor: theme.color.parent },
  approveText: { fontWeight: '800', color: '#fff' },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.color.overlay,
    ...Platform.select({
      web: { justifyContent: 'center', padding: 20 },
      default: { justifyContent: 'flex-end' },
    }),
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: theme.color.surfaceElevated,
    padding: 20,
    paddingBottom: 32,
    ...theme.shadow.card,
    ...Platform.select({
      web: { borderRadius: 20, maxHeight: '90%' as const },
      default: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    }),
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: theme.color.ink },
  modalHint: { fontSize: 13, color: theme.color.muted, marginTop: 6, marginBottom: 10 },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    fontSize: 15,
    color: theme.color.ink,
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  modalCancel: { fontWeight: '800', color: theme.color.muted, padding: 8 },
  modalSubmit: {
    backgroundColor: theme.color.danger,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  modalSubmitText: { color: '#fff', fontWeight: '800' },
});
