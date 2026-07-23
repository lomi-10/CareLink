import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNotice } from "@/hooks/shared/useNotice";
import { fetchAdminComplaints, forwardComplaintToPeso, type AdminComplaintRow } from "@/lib/complaintsApi";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminTheme, type AdminPalette } from "@/contexts/AdminThemeContext";

export default function AdminComplaintsScreen() {
  const { notify, noticeHost } = useNotice();
  const router = useRouter();
  const { palette: c } = useAdminTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [rows, setRows] = useState<AdminComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(0);
  const [forwardId, setForwardId] = useState<number | null>(null);
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
      setRows(res.success && res.complaints ? res.complaints : []);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const onForward = async () => {
    if (!forwardId || !adminId) return;
    setBusy(true);
    try {
      const res = await forwardComplaintToPeso({ complaint_id: forwardId, admin_user_id: adminId, admin_note: note.trim() || undefined });
      if (!res.success) { notify("Forward", res.message || "Could not forward."); return; }
      setForwardId(null);
      setNote("");
      await load();
      notify("Done", "PESO officers and both parties were notified.");
    } finally {
      setBusy(false);
    }
  };

  const openCount = rows.filter((r) => r.status === "Pending").length;

  return (
    <AdminShell active="complaints" title="Complaints" subtitle="Review reports and forward serious cases to PESO" complaintsBadge={openCount} scroll={false} contentMaxWidth={1100}>
      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.complaint_id)}
          contentContainerStyle={{ paddingBottom: 48 }}
          refreshing={loading}
          onRefresh={() => void load()}
          ListEmptyComponent={<Text style={s.empty}>No complaints yet.</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.cardTitle} numberOfLines={2}>{item.subject}</Text>
              <Text style={s.meta}>
                {item.complainant_role ?? "—"} · {item.complainant_name}
                {item.respondent_name ? ` → ${item.respondent_name}` : ""}
                {item.application_id != null ? ` · App #${item.application_id}` : " · General report"}
              </Text>
              <View style={s.badgeRow}>
                <View style={[s.statusPill, item.status === "Pending" ? { backgroundColor: 'rgba(232,163,61,0.16)' } : { backgroundColor: c.accentSoft }]}>
                  <Text style={[s.statusPillText, { color: item.status === "Pending" ? c.amber : c.green }]}>{item.status}</Text>
                </View>
                {item.severity === "elevated" && (
                  <View style={[s.statusPill, { backgroundColor: c.redSoft }]}><Text style={[s.statusPillText, { color: c.red }]}>ELEVATED</Text></View>
                )}
              </View>
              <Text style={s.body}>{item.body}</Text>
              {item.status === "Pending" && (
                <TouchableOpacity style={s.fwd} onPress={() => setForwardId(item.complaint_id)}>
                  <Ionicons name="send" size={15} color="#fff" />
                  <Text style={s.fwdText}>Forward to PESO</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={forwardId != null} transparent animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Forward to PESO?</Text>
            <Text style={s.modalHint}>Optional note for PESO records.</Text>
            <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Internal note…" placeholderTextColor={c.subtle} multiline />
            <View style={s.modalRow}>
              <TouchableOpacity style={[s.modalBtn, s.cancelBtn]} onPress={() => { setForwardId(null); setNote(""); }}>
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
  card: { backgroundColor: c.panel, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  cardTitle: { fontSize: 16.5, fontWeight: "800", color: c.text },
  meta: { fontSize: 13, color: c.muted, marginTop: 6 },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  statusPill: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3 },
  statusPillText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5 },
  body: { fontSize: 14.5, color: c.text, marginTop: 12, lineHeight: 21 },
  fwd: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 14, backgroundColor: c.accent, paddingVertical: 12, borderRadius: 10 },
  fwdText: { color: "#fff", fontWeight: "700" },

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
