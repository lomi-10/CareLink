import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNotice } from "@/hooks/shared/useNotice";
import { fetchAdminComplaints, forwardComplaintToPeso, type AdminComplaintRow } from "@/lib/complaintsApi";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminTheme, type AdminPalette } from "@/contexts/AdminThemeContext";

function timeAgo(v: string) {
  const diff = Math.floor((Date.now() - new Date(String(v).replace(' ', 'T')).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(String(v).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminComplaintsScreen() {
  const { notify, noticeHost } = useNotice();
  const router = useRouter();
  const { palette: c } = useAdminTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [rows, setRows] = useState<AdminComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem("user_data");
      if (!raw) { setRows([]); return; }
      const u = JSON.parse(raw) as { user_id?: string; user_type?: string };
      const id = Number(u.user_id);
      if (u.user_type !== "admin" || !id) { notify("Access denied", "Super admin only."); router.back(); return; }
      setAdminId(id);
      const res = await fetchAdminComplaints(id);
      const list = res.success && res.complaints ? res.complaints : [];
      setRows(list);
      // Keep the current selection if it's still there; otherwise pick the first.
      setSelectedId((prev) => (prev && list.some((r) => r.complaint_id === prev)) ? prev : (list[0]?.complaint_id ?? null));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const selected = rows.find((r) => r.complaint_id === selectedId) ?? null;

  const onForward = async () => {
    if (!selected || !adminId) return;
    setBusy(true);
    try {
      const res = await forwardComplaintToPeso({ complaint_id: selected.complaint_id, admin_user_id: adminId, admin_note: note.trim() || undefined });
      if (!res.success) { notify("Forward", res.message || "Could not forward."); return; }
      setForwardOpen(false);
      setNote("");
      await load();
      notify("Done", "PESO officers and both parties were notified.");
    } finally {
      setBusy(false);
    }
  };

  const messageUser = (userId?: number | null) => {
    if (!userId) return;
    router.push({ pathname: '/admin/messages', params: { user_id: String(userId) } } as never);
  };

  const openCount = rows.filter((r) => r.status === "Pending").length;

  return (
    <AdminShell active="complaints" title="Complaints" subtitle="Review reports and forward serious cases to PESO" complaintsBadge={openCount} scroll={false} contentMaxWidth={1280}>
      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />
      ) : rows.length === 0 ? (
        <Text style={s.empty}>No complaints yet.</Text>
      ) : (
        <View style={s.split}>
          {/* ── List pane ── */}
          <View style={s.listPane}>
            <FlatList
              data={rows}
              keyExtractor={(item) => String(item.complaint_id)}
              contentContainerStyle={{ paddingBottom: 24 }}
              style={{ flex: 1 }}
              refreshing={loading}
              onRefresh={() => void load()}
              renderItem={({ item }) => {
                const on = item.complaint_id === selectedId;
                return (
                  <TouchableOpacity style={[s.row, on && s.rowActive]} onPress={() => setSelectedId(item.complaint_id)} activeOpacity={0.85}>
                    <Text style={[s.rowTitle, on && { color: c.accent }]} numberOfLines={1}>{item.subject}</Text>
                    <Text style={s.rowMeta} numberOfLines={1}>
                      {item.complainant_role ?? "—"} · {item.complainant_name}
                      {item.respondent_name ? ` → ${item.respondent_name}` : ""}
                    </Text>
                    <View style={s.rowBadgeRow}>
                      <View style={[s.statusPill, item.status === "Pending" ? { backgroundColor: 'rgba(232,163,61,0.16)' } : { backgroundColor: c.accentSoft }]}>
                        <Text style={[s.statusPillText, { color: item.status === "Pending" ? c.amber : c.green }]}>{item.status}</Text>
                      </View>
                      {item.severity === "elevated" && (
                        <View style={[s.statusPill, { backgroundColor: c.redSoft }]}><Text style={[s.statusPillText, { color: c.red }]}>ELEVATED</Text></View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* ── Detail pane ── */}
          <View style={s.detailPane}>
            {!selected ? (
              <View style={s.detailEmpty}>
                <Ionicons name="document-text-outline" size={34} color={c.subtle} />
                <Text style={s.detailEmptyText}>Select a complaint to view details</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
                <View style={s.badgeRow}>
                  <View style={[s.statusPill, selected.status === "Pending" ? { backgroundColor: 'rgba(232,163,61,0.16)' } : { backgroundColor: c.accentSoft }]}>
                    <Text style={[s.statusPillText, { color: selected.status === "Pending" ? c.amber : c.green }]}>{selected.status}</Text>
                  </View>
                  {selected.severity === "elevated" && (
                    <View style={[s.statusPill, { backgroundColor: c.redSoft }]}><Text style={[s.statusPillText, { color: c.red }]}>ELEVATED</Text></View>
                  )}
                  {selected.category && (
                    <View style={[s.statusPill, { backgroundColor: c.rowAlt, borderWidth: 1, borderColor: c.border }]}><Text style={[s.statusPillText, { color: c.muted }]}>{selected.category.replace(/_/g, ' ')}</Text></View>
                  )}
                </View>

                <Text style={s.detailTitle}>{selected.subject}</Text>
                <Text style={s.detailMeta}>Filed {timeAgo(selected.created_at)}{selected.application_id != null ? ` · Application #${selected.application_id}` : ' · General report'}</Text>

                <View style={s.partiesCard}>
                  <View style={s.partyRow}>
                    <View style={s.partyIcon}><Ionicons name="person" size={15} color={c.accent} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.partyLabel}>Complainant</Text>
                      <Text style={s.partyName}>{selected.complainant_name} <Text style={s.partyRole}>({selected.complainant_role ?? '—'})</Text></Text>
                    </View>
                    <TouchableOpacity style={s.msgBtn} onPress={() => messageUser(selected.complainant_user_id)} activeOpacity={0.85}>
                      <Ionicons name="chatbubble-outline" size={14} color={c.accent} />
                      <Text style={s.msgBtnText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                  {!!selected.respondent_name && (
                    <View style={[s.partyRow, { marginTop: 10 }]}>
                      <View style={s.partyIcon}><Ionicons name="person-outline" size={15} color={c.muted} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.partyLabel}>Respondent</Text>
                        <Text style={s.partyName}>{selected.respondent_name}</Text>
                      </View>
                      {!!selected.respondent_id && (
                        <TouchableOpacity style={s.msgBtn} onPress={() => messageUser(selected.respondent_id)} activeOpacity={0.85}>
                          <Ionicons name="chatbubble-outline" size={14} color={c.accent} />
                          <Text style={s.msgBtnText}>Message</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                <Text style={s.sectionLabel}>What happened</Text>
                <Text style={s.detailBody}>{selected.body}</Text>

                {!!selected.admin_notes && (
                  <>
                    <Text style={s.sectionLabel}>Admin notes</Text>
                    <Text style={s.detailBody}>{selected.admin_notes}</Text>
                  </>
                )}

                <View style={s.actionsRow}>
                  <TouchableOpacity style={s.msgBigBtn} onPress={() => messageUser(selected.complainant_user_id)} activeOpacity={0.85}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={c.text} />
                    <Text style={s.msgBigBtnText}>Message for more info</Text>
                  </TouchableOpacity>
                  {selected.status === "Pending" && (
                    <TouchableOpacity style={s.fwd} onPress={() => setForwardOpen(true)} activeOpacity={0.85}>
                      <Ionicons name="send" size={15} color="#fff" />
                      <Text style={s.fwdText}>Submit to PESO</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      )}

      <Modal visible={forwardOpen} transparent animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Submit to PESO?</Text>
            <Text style={s.modalHint}>Optional note for PESO records.</Text>
            <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Internal note…" placeholderTextColor={c.subtle} multiline />
            <View style={s.modalRow}>
              <TouchableOpacity style={[s.modalBtn, s.cancelBtn]} onPress={() => { setForwardOpen(false); setNote(""); }}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.okBtn]} onPress={() => void onForward()} disabled={busy}>
                <Text style={s.okBtnText}>{busy ? "…" : "Confirm"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {noticeHost}
    </AdminShell>
  );
}

const makeStyles = (c: AdminPalette) => StyleSheet.create({
  empty: { textAlign: "center", color: c.muted, marginTop: 40 },

  split: { flex: 1, flexDirection: 'row', gap: 16 },
  listPane: { width: 340, backgroundColor: c.panel, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  row: { padding: 14, borderBottomWidth: 1, borderBottomColor: c.border },
  rowActive: { backgroundColor: c.accentSoft },
  rowTitle: { fontSize: 14.5, fontWeight: '800', color: c.text },
  rowMeta: { fontSize: 12, color: c.muted, marginTop: 4 },
  rowBadgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },

  detailPane: { flex: 1, backgroundColor: c.panel, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  detailEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  detailEmptyText: { color: c.subtle, fontSize: 14 },
  detailTitle: { fontSize: 20, fontWeight: '900', color: c.text, marginTop: 10 },
  detailMeta: { fontSize: 12.5, color: c.muted, marginTop: 4 },

  badgeRow: { flexDirection: "row", gap: 8 },
  statusPill: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3 },
  statusPillText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5, textTransform: 'capitalize' },

  partiesCard: { backgroundColor: c.rowAlt, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14, marginTop: 18 },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  partyIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  partyLabel: { fontSize: 10.5, fontWeight: '800', color: c.subtle, letterSpacing: 0.4, textTransform: 'uppercase' },
  partyName: { fontSize: 14, fontWeight: '700', color: c.text, marginTop: 1 },
  partyRole: { fontWeight: '500', color: c.muted },
  msgBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: c.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  msgBtnText: { fontSize: 12, fontWeight: '700', color: c.accent },

  sectionLabel: { fontSize: 11.5, fontWeight: '800', color: c.subtle, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  detailBody: { fontSize: 14.5, color: c.text, lineHeight: 22 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 26 },
  msgBigBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: c.border, backgroundColor: c.rowAlt, paddingVertical: 12, borderRadius: 10 },
  msgBigBtnText: { color: c.text, fontWeight: '700', fontSize: 13.5 },
  fwd: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: c.accent, paddingVertical: 12, borderRadius: 10 },
  fwdText: { color: "#fff", fontWeight: "700", fontSize: 13.5 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalBox: { backgroundColor: c.panel, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: c.border, width: "100%", maxWidth: 440, alignSelf: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: c.text },
  modalHint: { fontSize: 14, color: c.muted, marginTop: 8 },
  input: { borderWidth: 1, borderColor: c.border, borderRadius: 10, marginTop: 12, padding: 12, minHeight: 88, textAlignVertical: "top", color: c.text, ...(({ outlineStyle: "none" } as any)) },
  modalRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  cancelBtn: { backgroundColor: c.rowAlt, borderWidth: 1, borderColor: c.border },
  okBtn: { backgroundColor: c.accent },
  cancelBtnText: { fontWeight: "700", color: c.text },
  okBtnText: { fontWeight: "800", color: "#fff" },
});
