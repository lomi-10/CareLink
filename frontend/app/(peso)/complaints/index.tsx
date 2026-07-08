// app/(peso)/complaints/index.tsx — PESO complaint resolution queue
// PHP: peso/get_complaints.php, peso/resolve_complaint.php
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { theme } from "@/constants/theme";
import {
  fetchPesoComplaints, resolvePesoComplaint,
  type AdminComplaintRow,
} from "@/lib/complaintsApi";

export default function PesoComplaintsScreen() {
  const [pesoUserId, setPesoUserId] = useState<number | null>(null);
  const [rows, setRows] = useState<AdminComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [actionTarget, setActionTarget] = useState<{ row: AdminComplaintRow; action: 'Resolved' | 'Dismissed' } | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (uid: number) => {
    try {
      const res = await fetchPesoComplaints(uid);
      setRows(res.success && res.complaints ? res.complaints : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const uid = Number(JSON.parse(raw)?.user_id);
      if (uid) {
        setPesoUserId(uid);
        void load(uid);
      }
    })();
  }, [load]);

  const onRefresh = async () => {
    if (!pesoUserId) return;
    setRefreshing(true);
    await load(pesoUserId);
    setRefreshing(false);
  };

  const submitAction = async () => {
    if (!actionTarget || !pesoUserId) return;
    setSubmitting(true);
    try {
      const res = await resolvePesoComplaint({
        complaint_id: actionTarget.row.complaint_id,
        peso_user_id: pesoUserId,
        action: actionTarget.action,
        notes: notes.trim() || undefined,
      });
      if (res.success) {
        setActionTarget(null);
        setNotes('');
        await load(pesoUserId);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complaints</Text>
      <Text style={styles.sub}>Cases escalated to PESO for resolution.</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.color.peso} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.complaint_id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          contentContainerStyle={rows.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-outline" size={48} color={theme.color.subtle} />
              <Text style={styles.emptyTitle}>No complaints escalated to PESO</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeadRow}>
                <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{item.category ?? 'Other'}</Text>
                </View>
              </View>
              <Text style={styles.line}>
                {item.complainant_name} ({item.complainant_role ?? 'user'})
                {item.respondent_name ? ` → ${item.respondent_name}` : ''}
                {item.application_id == null ? ' · General report' : ` · App #${item.application_id}`}
              </Text>
              <Text style={styles.body} numberOfLines={3}>{item.body}</Text>
              <Text style={styles.meta}>
                Forwarded {item.forwarded_at ? new Date(item.forwarded_at).toLocaleDateString() : '—'}
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.resolveBtn]}
                  onPress={() => setActionTarget({ row: item, action: 'Resolved' })}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                  <Text style={[styles.actionBtnText, { color: '#16A34A' }]}>Resolve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.dismissBtn]}
                  onPress={() => setActionTarget({ row: item, action: 'Dismissed' })}
                >
                  <Ionicons name="close-circle-outline" size={16} color={theme.color.muted} />
                  <Text style={[styles.actionBtnText, { color: theme.color.muted }]}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!actionTarget} transparent animationType="fade" onRequestClose={() => setActionTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {actionTarget?.action === 'Resolved' ? 'Resolve complaint' : 'Dismiss complaint'}
            </Text>
            <Text style={styles.modalSub} numberOfLines={2}>{actionTarget?.row.subject}</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Resolution notes (optional)"
              placeholderTextColor={theme.color.subtle}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setActionTarget(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => void submitAction()}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: theme.color.canvasPeso },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "800", color: theme.color.ink, marginBottom: 6 },
  sub: { fontSize: 14, color: theme.color.muted, marginBottom: 16, lineHeight: 20 },
  emptyList: { flexGrow: 1 },
  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyTitle: { fontSize: 16, color: theme.color.muted },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.color.line },
  cardHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  subject: { flex: 1, fontSize: 16, fontWeight: "700", color: theme.color.ink },
  categoryPill: { backgroundColor: theme.color.dangerSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  categoryPillText: { fontSize: 11, fontWeight: "700", color: theme.color.danger },
  line: { fontSize: 13, color: theme.color.muted, marginBottom: 6, fontWeight: '600' },
  body: { fontSize: 14, color: theme.color.ink, lineHeight: 20, marginBottom: 8 },
  meta: { fontSize: 12, color: theme.color.subtle, marginBottom: 12 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  resolveBtn: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  dismissBtn: { backgroundColor: theme.color.surface, borderColor: theme.color.line },
  actionBtnText: { fontSize: 13, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, padding: 22 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: theme.color.ink, marginBottom: 6 },
  modalSub: { fontSize: 13, color: theme.color.muted, marginBottom: 16 },
  notesInput: {
    borderWidth: 1, borderColor: theme.color.line, borderRadius: 10, padding: 12,
    fontSize: 14, color: theme.color.ink, minHeight: 80, textAlignVertical: 'top', marginBottom: 18,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { paddingVertical: 11, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: theme.color.muted },
  modalConfirm: { backgroundColor: theme.color.peso, paddingVertical: 11, paddingHorizontal: 22, borderRadius: 10, minWidth: 100, alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
