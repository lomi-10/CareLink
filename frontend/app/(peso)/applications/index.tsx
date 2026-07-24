// app/(peso)/applications/index.tsx
// PESO oversight of job applications. NOT an approval queue — PESO does not verify
// or approve applications (that would bottleneck every hire). This is an
// exception-based safeguard: PESO can see applications and, if one looks abusive or
// fraudulent, flag + unsubmit it (retracts it and notifies both parties).
// PHP: peso/list_applications.php, peso/flag_application.php

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from "react-native";
import { theme } from "@/constants/theme";
import { useNotice } from "@/hooks/shared/useNotice";
import API_URL from "@/constants/api";

const P = theme.color;

type AppRow = {
  application_id: number; status: string; applied_at: string; cover_letter?: string | null;
  job_title: string; category_name?: string | null;
  helper_name: string; helper_email?: string; helper_verification?: string | null;
  parent_name: string;
  is_flagged: boolean; flag_reason?: string | null; flagged_at?: string | null;
};
type Filter = "all" | "active" | "flagged";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  Pending: { label: "Pending", color: P.warning, bg: P.warningSoft },
  Reviewed: { label: "Reviewed", color: P.info, bg: P.infoSoft },
  Shortlisted: { label: "Shortlisted", color: "#7C5CD6", bg: "#EEE9FB" },
  "Interview Scheduled": { label: "Interview", color: P.peso, bg: P.pesoSoft },
  Accepted: { label: "Accepted", color: P.success, bg: P.successSoft },
  contract_pending: { label: "Contract", color: P.warning, bg: P.warningSoft },
  hired: { label: "Hired", color: P.success, bg: P.successSoft },
  Withdrawn: { label: "Withdrawn", color: P.muted, bg: P.line },
  Rejected: { label: "Rejected", color: P.danger, bg: P.dangerSoft },
  auto_rejected: { label: "Closed", color: P.muted, bg: P.line },
};
const meta = (s: string) => STATUS_META[s] ?? { label: s, color: P.muted, bg: P.line };

export default function PesoApplicationsScreen() {
  const { notify, noticeHost } = useNotice();
  const { width } = useWindowDimensions();
  const wide = width > 900;

  const [staffId, setStaffId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, flagged: 0 });
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [flagFor, setFlagFor] = useState<AppRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (f: Filter, query: string) => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem("user_data");
      const id = raw ? Number(JSON.parse(raw)?.user_id) : 0;
      setStaffId(id);
      const res = await fetch(`${API_URL}/peso/list_applications.php?staff_user_id=${id}&filter=${f}&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) { setRows(data.applications || []); setSummary(data.summary || { total: 0, active: 0, flagged: 0 }); }
      else notify("Couldn't load", data.message || "Please try again.");
    } catch {
      notify("Offline", "Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(filter, ""); }, [filter]); // eslint-disable-line

  const submitFlag = async () => {
    if (!flagFor) return;
    if (!reason.trim()) { notify("Reason needed", "Please explain why so the helper understands."); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/peso/flag_application.php?staff_user_id=${staffId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: flagFor.application_id, reason: reason.trim() }),
      });
      const data = await res.json();
      if (data.success) { setFlagFor(null); setReason(""); await load(filter, q); notify("Done", "Application flagged and unsubmitted. Both parties were notified."); }
      else notify("Couldn't flag", data.message || "Please try again.");
    } catch {
      notify("Offline", "Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={s.statCard}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={s.page}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Applications</Text>
        <Text style={s.subtitle}>Oversight of job applications. Flag & unsubmit any that look abusive or fraudulent — PESO does not approve applications.</Text>

        {/* Summary */}
        <View style={s.statRow}>
          <StatCard label="Total" value={summary.total} color={P.ink} />
          <StatCard label="Active" value={summary.active} color={P.success} />
          <StatCard label="Flagged" value={summary.flagged} color={P.danger} />
        </View>

        {/* Filters + search */}
        <View style={s.controls}>
          <View style={s.chips}>
            {(["all", "active", "flagged"] as Filter[]).map((f) => (
              <TouchableOpacity key={f} style={[s.chip, filter === f && s.chipActive]} onPress={() => setFilter(f)}>
                <Text style={[s.chipText, filter === f && s.chipTextActive]}>{f === "all" ? "All" : f === "active" ? "Active" : "Flagged"}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.search}>
            <Ionicons name="search" size={17} color={P.subtle} />
            <TextInput style={s.searchInput} value={q} onChangeText={setQ} onSubmitEditing={() => load(filter, q)}
              placeholder="Search helper, employer or job…" placeholderTextColor={P.subtle} returnKeyType="search" />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={P.peso} style={{ marginTop: 50 }} />
        ) : rows.length === 0 ? (
          <View style={s.empty}><Ionicons name="reader-outline" size={34} color={P.subtle} /><Text style={s.emptyText}>No applications{filter === "flagged" ? " flagged" : ""} yet.</Text></View>
        ) : (
          rows.map((a) => {
            const m = meta(a.status);
            const canFlag = !["hired", "terminated", "termination_pending", "Withdrawn"].includes(a.status) && !a.is_flagged;
            return (
              <View key={a.application_id} style={[s.card, a.is_flagged && s.cardFlagged]}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.jobTitle} numberOfLines={1}>{a.job_title}</Text>
                    <Text style={s.parties} numberOfLines={1}>
                      <Text style={s.strong}>{a.helper_name}</Text>{a.helper_verification === "Verified" ? " ✓" : ""} → {a.parent_name}
                    </Text>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: m.bg }]}><Text style={[s.statusText, { color: m.color }]}>{m.label}</Text></View>
                </View>

                {!!a.cover_letter && <Text style={s.cover} numberOfLines={2}>“{a.cover_letter}”</Text>}

                {a.is_flagged && (
                  <View style={s.flagBanner}>
                    <Ionicons name="flag" size={14} color={P.danger} />
                    <Text style={s.flagText}>Flagged by PESO: {a.flag_reason}</Text>
                  </View>
                )}

                <View style={s.cardFoot}>
                  <Text style={s.applied}>{a.category_name ? a.category_name + " · " : ""}Applied {timeAgo(a.applied_at)}</Text>
                  {canFlag && (
                    <TouchableOpacity style={s.flagBtn} onPress={() => { setFlagFor(a); setReason(""); }} activeOpacity={0.85}>
                      <Ionicons name="flag-outline" size={15} color="#fff" />
                      <Text style={s.flagBtnText}>Flag & Unsubmit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Flag modal */}
      <Modal visible={!!flagFor} transparent animationType="fade" onRequestClose={() => setFlagFor(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}><Ionicons name="flag" size={26} color={P.danger} /></View>
            <Text style={s.modalTitle}>Flag & Unsubmit Application</Text>
            <Text style={s.modalHint}>
              This retracts {flagFor?.helper_name}'s application for “{flagFor?.job_title}” and notifies both the helper and the employer. Use only for abusive or fraudulent applications.
            </Text>
            <Text style={s.label}>Reason (shown to the helper)</Text>
            <TextInput style={[s.input, s.multiline]} value={reason} onChangeText={setReason} placeholder="e.g. Duplicate / suspicious application, policy violation…" placeholderTextColor={P.subtle} multiline autoFocus />
            <View style={s.modalRow}>
              <TouchableOpacity style={[s.mBtn, s.mCancel]} onPress={() => setFlagFor(null)}><Text style={s.mCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.mBtn, s.mDanger, busy && { opacity: 0.6 }]} onPress={submitFlag} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.mDangerText}>Flag & Unsubmit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {noticeHost}
    </View>
  );
}

function timeAgo(v?: string) {
  if (!v) return "";
  const d = new Date(String(v).replace(" ", "T"));
  if (isNaN(d.getTime())) return v;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: P.canvasPeso },
  title: { fontSize: 26, fontWeight: "800", color: P.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: P.muted, marginTop: 3, maxWidth: 680, lineHeight: 18 },

  statRow: { flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: P.surface, borderRadius: 14, borderWidth: 1, borderColor: P.line, padding: 14, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "900" },
  statLabel: { fontSize: 12, color: P.muted, marginTop: 2, fontWeight: "600" },

  controls: { flexDirection: "row", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" },
  chips: { flexDirection: "row", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: P.line, backgroundColor: P.surface },
  chipActive: { backgroundColor: P.peso, borderColor: P.peso },
  chipText: { color: P.muted, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  search: { flex: 1, minWidth: 220, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: P.surface, borderWidth: 1, borderColor: P.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  searchInput: { flex: 1, color: P.ink, fontSize: 14, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) },

  card: { backgroundColor: P.surface, borderRadius: 14, borderWidth: 1, borderColor: P.line, padding: 16, marginBottom: 12 },
  cardFlagged: { borderColor: P.danger, borderWidth: 1.4 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  jobTitle: { fontSize: 15.5, fontWeight: "800", color: P.ink },
  parties: { fontSize: 13, color: P.muted, marginTop: 3 },
  strong: { color: P.ink, fontWeight: "700" },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: "800" },
  cover: { fontSize: 13, color: P.inkMuted, fontStyle: "italic", marginTop: 10, lineHeight: 19 },

  flagBanner: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: P.dangerSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 },
  flagText: { flex: 1, fontSize: 12.5, color: P.danger, fontWeight: "600" },

  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, gap: 10, flexWrap: "wrap" },
  applied: { fontSize: 12, color: P.subtle },
  flagBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: P.danger, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  flagBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  empty: { alignItems: "center", gap: 10, paddingVertical: 50 },
  emptyText: { fontSize: 14, color: P.muted },

  modalBg: { flex: 1, backgroundColor: "rgba(42,20,9,0.45)", alignItems: "center", justifyContent: "center", padding: 22 },
  modalCard: { width: "100%", maxWidth: 460, backgroundColor: P.surface, borderRadius: 18, padding: 22 },
  modalIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: P.dangerSoft, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: P.ink, marginTop: 12, textAlign: "center" },
  modalHint: { fontSize: 13, color: P.muted, marginTop: 8, lineHeight: 19, textAlign: "center" },
  label: { fontSize: 13, fontWeight: "700", color: P.inkMuted, marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: P.line, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: P.ink, backgroundColor: P.canvasPeso, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  modalRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  mBtn: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  mCancel: { borderWidth: 1, borderColor: P.line, backgroundColor: P.surface },
  mCancelText: { fontWeight: "700", color: P.ink },
  mDanger: { backgroundColor: P.danger },
  mDangerText: { fontWeight: "800", color: "#fff" },
});
