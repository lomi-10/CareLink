// app/(peso)/complaints/index.tsx — PESO complaint resolution queue
// PHP: peso/get_complaints.php, peso/resolve_complaint.php
// Master-detail, matching the User Verification screen: list on the left,
// full detail on the right (or replacing the list on narrow screens) — a bare
// Resolve/Dismiss row gave the officer nothing to act on beyond a title.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import {
  usePesoTheme, ScreenHeader, ListRow, Pill, EmptyState, IconButton, PButton, layout, font, radius, space,
} from "@/components/peso/ui";
import { type PesoColors } from "@/contexts/PesoThemeContext";
import { fetchPesoComplaints, resolvePesoComplaint, type AdminComplaintRow } from "@/lib/complaintsApi";

function timeAgo(v: string) {
  if (!v) return '—';
  const diff = Math.floor((Date.now() - new Date(String(v).replace(' ', 'T')).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(String(v).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PesoComplaintsScreen() {
  const { c } = usePesoTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();
  const twoPane = Platform.OS === "web" && width >= 1024;

  const [pesoUserId, setPesoUserId] = useState<number | null>(null);
  const [rows, setRows] = useState<AdminComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AdminComplaintRow | null>(null);

  const [actionTarget, setActionTarget] = useState<{ row: AdminComplaintRow; action: "Resolved" | "Dismissed" } | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (uid: number) => {
    try {
      const res = await fetchPesoComplaints(uid);
      const list = res.success && res.complaints ? res.complaints : [];
      setRows(list);
      setSelected((prev) => (prev ? list.find((r) => r.complaint_id === prev.complaint_id) ?? null : prev));
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
      if (res.success) {
        setActionTarget(null); setNotes("");
        await load(pesoUserId);
        if (!twoPane) setSelected(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const messageUser = (userId?: number | null) => {
    if (!userId) return;
    router.push({ pathname: '/(peso)/messages', params: { user_id: String(userId) } } as never);
  };

  const listColumn = (
    <View style={twoPane ? layout.flex1 : { flex: 1 }}>
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
          renderItem={({ item, index }) => {
            const on = selected?.complaint_id === item.complaint_id;
            return (
              <ListRow delay={Math.min(index * 45, 320)} onPress={() => setSelected(item)} selected={on}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: on ? c.accentSoft : c.warnSoft, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" }}>
                  <Ionicons name="alert-circle" size={20} color={on ? c.accent : c.warn} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14.5, color: on ? c.accentInk : c.ink }} numberOfLines={1}>{item.subject}</Text>
                    <Pill label={item.category ?? "Other"} tone="warn" dot={false} />
                  </View>
                  <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: c.muted, marginTop: 4 }} numberOfLines={1}>
                    {item.complainant_name} ({item.complainant_role ?? "user"})
                    {item.respondent_name ? ` → ${item.respondent_name}` : ""}
                  </Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 6 }}>
                    Forwarded {timeAgo(item.forwarded_at ?? item.created_at)}
                  </Text>
                </View>
              </ListRow>
            );
          }}
        />
      )}
    </View>
  );

  const detailColumn = !selected ? (
    <EmptyState icon="alert-circle-outline" title="Select a complaint to review" sub="Pick a case from the list to see the full report, message either party, or resolve it." />
  ) : (
    <View style={{ flex: 1 }}>
      {!twoPane && (
        <View style={s.detailBackRow}>
          <IconButton icon="arrow-back" onPress={() => setSelected(null)} />
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: c.ink }}>Back to queue</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={{ padding: space.xl }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Pill label={selected.category ?? "Other"} tone="warn" dot={false} />
          {selected.status && <Pill label={selected.status} tone={selected.status === 'Escalated_PESO' ? 'info' : 'neutral'} dot={false} />}
        </View>

        <Text style={s.detailTitle}>{selected.subject}</Text>
        <Text style={s.detailMeta}>
          Forwarded {timeAgo(selected.forwarded_at ?? selected.created_at)}
          {selected.application_id != null ? ` · Application #${selected.application_id}` : ' · General report'}
        </Text>

        <View style={s.partiesCard}>
          <View style={s.partyRow}>
            <View style={s.partyIcon}><Ionicons name="person" size={15} color={c.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.partyLabel}>Complainant</Text>
              <Text style={s.partyName}>{selected.complainant_name} <Text style={s.partyRole}>({selected.complainant_role ?? '—'})</Text></Text>
            </View>
            <Pressable onPress={() => messageUser(selected.complainant_user_id)} style={s.msgBtn}>
              <Ionicons name="chatbubble-outline" size={14} color={c.accent} />
              <Text style={s.msgBtnText}>Message</Text>
            </Pressable>
          </View>
          {!!selected.respondent_name && (
            <View style={[s.partyRow, { marginTop: 10 }]}>
              <View style={[s.partyIcon, { backgroundColor: c.sunken }]}><Ionicons name="person-outline" size={15} color={c.muted} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.partyLabel}>Respondent</Text>
                <Text style={s.partyName}>{selected.respondent_name}</Text>
              </View>
              {!!selected.respondent_id && (
                <Pressable onPress={() => messageUser(selected.respondent_id)} style={s.msgBtn}>
                  <Ionicons name="chatbubble-outline" size={14} color={c.accent} />
                  <Text style={s.msgBtnText}>Message</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <Text style={s.sectionLabel}>What happened</Text>
        <Text style={s.detailBody}>{selected.body}</Text>

        {!!selected.admin_notes && (
          <>
            <Text style={s.sectionLabel}>Notes from Super Admin</Text>
            <Text style={s.detailBody}>{selected.admin_notes}</Text>
          </>
        )}

        <Text style={s.sectionLabel}>Resolve this case</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <PButton label="Resolve" icon="checkmark-circle-outline" variant="primary" full onPress={() => setActionTarget({ row: selected, action: "Resolved" })} />
          <PButton label="Dismiss" icon="close-circle-outline" variant="ghost" full onPress={() => setActionTarget({ row: selected, action: "Dismissed" })} />
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={layout.page(c.canvas)}>
      {twoPane ? (
        <View style={layout.splitRow}>
          {listColumn}
          <View style={layout.rightPane(c.line, c.surface)}>{detailColumn}</View>
        </View>
      ) : selected ? detailColumn : listColumn}

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
  detailBackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md },
  detailTitle: { fontSize: 20, fontFamily: font.display, color: c.ink, marginTop: 12 },
  detailMeta: { fontSize: 12.5, fontFamily: font.regular, color: c.muted, marginTop: 4 },

  partiesCard: { backgroundColor: c.sunken, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: 14, marginTop: 18 },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  partyIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  partyLabel: { fontSize: 10.5, fontFamily: font.semibold, color: c.subtle, letterSpacing: 0.4, textTransform: 'uppercase' },
  partyName: { fontSize: 14, fontFamily: font.semibold, color: c.ink, marginTop: 1 },
  partyRole: { fontFamily: font.regular, color: c.muted },
  msgBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: c.accent, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  msgBtnText: { fontSize: 12, fontFamily: font.semibold, color: c.accent },

  sectionLabel: { fontSize: 11.5, fontFamily: font.semibold, color: c.subtle, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  detailBody: { fontSize: 14.5, fontFamily: font.regular, color: c.ink, lineHeight: 22 },

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
