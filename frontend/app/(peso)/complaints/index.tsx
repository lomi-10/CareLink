// app/(peso)/complaints/index.tsx — PESO complaint resolution queue
// PHP: peso/get_complaints.php, peso/resolve_complaint.php
// Shared PESO design system: theme-aware (light/dark), animated, branded backdrop.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import {
  usePesoTheme, ScreenHeader, ListRow, Pill, EmptyState, IconButton, PButton, layout, font, radius, space,
} from "@/components/peso/ui";
import { type PesoColors } from "@/contexts/PesoThemeContext";
import { fetchPesoComplaints, resolvePesoComplaint, type AdminComplaintRow } from "@/lib/complaintsApi";

export default function PesoComplaintsScreen() {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [pesoUserId, setPesoUserId] = useState<number | null>(null);
  const [rows, setRows] = useState<AdminComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [actionTarget, setActionTarget] = useState<{ row: AdminComplaintRow; action: "Resolved" | "Dismissed" } | null>(null);
  const [notes, setNotes] = useState("");
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
      const raw = await AsyncStorage.getItem("user_data");
      if (!raw) return;
      const uid = Number(JSON.parse(raw)?.user_id);
      if (uid) { setPesoUserId(uid); void load(uid); }
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
      if (res.success) { setActionTarget(null); setNotes(""); await load(pesoUserId); }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={layout.page(c.canvas)}>
      <ScreenHeader eyebrow="Resolution Queue" title="Complaints"
        subtitle="Cases escalated to PESO for resolution."
        right={<IconButton icon="refresh" tone="accent" onPress={() => pesoUserId && load(pesoUserId)} />} />

      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.complaint_id)}
          style={layout.flex1}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.accent} />}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: 40, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title="No complaints escalated to PESO" sub="Cases that reach PESO for resolution will appear here." />}
          renderItem={({ item, index }) => (
            <ListRow delay={Math.min(index * 45, 320)}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.warnSoft, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" }}>
                <Ionicons name="alert-circle" size={20} color={c.warn} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14.5, color: c.ink }} numberOfLines={1}>{item.subject}</Text>
                  <Pill label={item.category ?? "Other"} tone="warn" dot={false} />
                </View>
                <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: c.muted, marginTop: 4 }} numberOfLines={1}>
                  {item.complainant_name} ({item.complainant_role ?? "user"})
                  {item.respondent_name ? ` → ${item.respondent_name}` : ""}
                  {item.application_id == null ? " · General report" : ` · App #${item.application_id}`}
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: c.ink, lineHeight: 20, marginTop: 6 }} numberOfLines={3}>{item.body}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 6 }}>
                  Forwarded {item.forwarded_at ? new Date(item.forwarded_at).toLocaleDateString() : "—"}
                </Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <Pressable onPress={() => setActionTarget({ row: item, action: "Resolved" })}
                    style={({ hovered }: any) => [s.actionBtn, { backgroundColor: hovered ? c.okSoft : c.surface, borderColor: c.ok }]}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={c.ok} />
                    <Text style={[s.actionText, { color: c.ok }]}>Resolve</Text>
                  </Pressable>
                  <Pressable onPress={() => setActionTarget({ row: item, action: "Dismissed" })}
                    style={({ hovered }: any) => [s.actionBtn, { backgroundColor: hovered ? c.raise : c.surface, borderColor: c.line }]}>
                    <Ionicons name="close-circle-outline" size={16} color={c.muted} />
                    <Text style={[s.actionText, { color: c.muted }]}>Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            </ListRow>
          )}
        />
      )}

      <Modal visible={!!actionTarget} transparent animationType="fade" onRequestClose={() => setActionTarget(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{actionTarget?.action === "Resolved" ? "Resolve complaint" : "Dismiss complaint"}</Text>
            <Text style={s.modalSub} numberOfLines={2}>{actionTarget?.row.subject}</Text>
            <TextInput
              style={s.notesInput}
              placeholder="Resolution notes (optional)"
              placeholderTextColor={c.subtle}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
              <PButton label="Cancel" variant="ghost" onPress={() => setActionTarget(null)} />
              <PButton label="Confirm" loading={submitting} onPress={() => void submitAction()} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, ...(({ transitionDuration: "140ms" }) as any) },
  actionText: { fontSize: 13, fontFamily: font.semibold },

  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: c.surface, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: c.line },
  modalTitle: { fontSize: 17, fontFamily: font.display, color: c.ink, marginBottom: 6 },
  modalSub: { fontSize: 13, color: c.muted, marginBottom: 16, fontFamily: font.regular },
  notesInput: {
    borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12, fontSize: 14, color: c.ink,
    minHeight: 80, textAlignVertical: "top", marginBottom: 18, backgroundColor: c.sunken, fontFamily: font.regular,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
});
