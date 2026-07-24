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
  const [viewing, setViewing] = useState<AppRow | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const openDetail = async (a: AppRow) => {
    setViewing(a); setDetail(null); setDetailLoading(true);
    try {
      const raw = await AsyncStorage.getItem("user_data");
      const uid = raw ? JSON.parse(raw)?.user_id : "";
      const res = await fetch(`${API_URL}/peso/application_detail.php?application_id=${a.application_id}&staff_user_id=${uid}`);
      const data = await res.json();
      if (data.success) setDetail(data);
    } catch { /* show basics */ } finally { setDetailLoading(false); }
  };
  const closeDetail = () => { setViewing(null); setDetail(null); };

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
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity style={s.viewBtn} onPress={() => openDetail(a)} activeOpacity={0.85}>
                      <Ionicons name="eye-outline" size={15} color={P.peso} />
                      <Text style={s.viewBtnText}>Review</Text>
                    </TouchableOpacity>
                    {canFlag && (
                      <TouchableOpacity style={s.flagBtn} onPress={() => { setFlagFor(a); setReason(""); }} activeOpacity={0.85}>
                        <Ionicons name="flag-outline" size={15} color="#fff" />
                        <Text style={s.flagBtnText}>Flag & Unsubmit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Case-review modal */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={closeDetail}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { maxWidth: 720, padding: 0, overflow: "hidden" }]}>
            {/* Header */}
            <View style={s.dHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.dEyebrow}>APPLICATION #{viewing?.application_id} · {viewing?.category_name || "—"}</Text>
                <Text style={s.dTitle} numberOfLines={2}>{detail?.job?.title ?? viewing?.job_title}</Text>
              </View>
              {!!viewing && <View style={[s.statusPill, { backgroundColor: meta(viewing.status).bg }]}><Text style={[s.statusText, { color: meta(viewing.status).color }]}>{meta(viewing.status).label}</Text></View>}
              <TouchableOpacity onPress={closeDetail} hitSlop={8} style={{ marginLeft: 8 }}><Ionicons name="close" size={22} color={P.muted} /></TouchableOpacity>
            </View>

            {detailLoading && !detail ? (
              <ActivityIndicator color={P.peso} style={{ marginVertical: 60 }} />
            ) : (
              <ScrollView style={{ maxHeight: 540 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                {/* Risk signals — the reason this screen exists */}
                {Array.isArray(detail?.risk_signals) && detail.risk_signals.length > 0 && (
                  <View style={{ marginBottom: 18 }}>
                    <Text style={s.secTitle}>Oversight checks</Text>
                    <View style={{ gap: 8 }}>
                      {detail.risk_signals.map((sig: any, i: number) => {
                        const cfg = sig.level === "high" ? { c: P.danger, bg: P.dangerSoft, ic: "alert-circle" as const }
                          : sig.level === "warn" ? { c: P.warning, bg: P.warningSoft, ic: "warning" as const }
                          : sig.level === "ok" ? { c: P.success, bg: P.successSoft, ic: "checkmark-circle" as const }
                          : { c: P.info, bg: P.infoSoft, ic: "information-circle" as const };
                        return (
                          <View key={i} style={[s.signal, { backgroundColor: cfg.bg }]}>
                            <Ionicons name={cfg.ic} size={16} color={cfg.c} />
                            <Text style={[s.signalText, { color: cfg.c }]}>{sig.text}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Applicant + Employer, side by side on wide */}
                <View style={[s.pair, !wide && { flexDirection: "column" }]}>
                  <View style={s.entity}>
                    <Text style={s.entityLabel}>APPLICANT (HELPER)</Text>
                    <Text style={s.entityName}>{detail?.helper?.name ?? viewing?.helper_name}</Text>
                    <View style={s.badgeRow2}>
                      {detail?.helper?.verification_status === "Verified"
                        ? <View style={[s.miniBadge, { backgroundColor: P.pesoSoft }]}><Ionicons name="shield-checkmark" size={11} color={P.peso} /><Text style={[s.miniBadgeText, { color: P.peso }]}>PESO Verified</Text></View>
                        : <View style={[s.miniBadge, { backgroundColor: P.warningSoft }]}><Text style={[s.miniBadgeText, { color: P.warning }]}>Not verified</Text></View>}
                    </View>
                    <Fact label="Age" value={detail?.helper?.age != null ? `${detail.helper.age} yrs` : "—"} />
                    <Fact label="Gender" value={detail?.helper?.gender || "—"} />
                    <Fact label="Location" value={detail?.helper?.location || "—"} />
                    <Fact label="Experience" value={detail ? `${detail.helper.experience_years} yr${detail.helper.experience_years === 1 ? "" : "s"}` : "—"} />
                    <Fact label="Expected salary" value={detail?.helper?.expected_salary ? `₱${Number(detail.helper.expected_salary).toLocaleString()}` : "—"} />
                    <Fact label="Rating" value={detail?.helper?.rating_count ? `${detail.helper.rating_average.toFixed(1)}★ (${detail.helper.rating_count})` : "No reviews"} />
                    <Fact label="Verified docs" value={detail ? String(detail.helper.verified_documents) : "—"} last />
                  </View>

                  <View style={s.entity}>
                    <Text style={s.entityLabel}>EMPLOYER (HOUSEHOLD)</Text>
                    <Text style={s.entityName}>{detail?.employer?.name ?? viewing?.parent_name}</Text>
                    <View style={s.badgeRow2}>
                      {(detail?.employer?.verification_status === "Verified" || String(detail?.employer?.account_status).toLowerCase() === "approved")
                        ? <View style={[s.miniBadge, { backgroundColor: P.pesoSoft }]}><Ionicons name="shield-checkmark" size={11} color={P.peso} /><Text style={[s.miniBadgeText, { color: P.peso }]}>PESO Verified</Text></View>
                        : <View style={[s.miniBadge, { backgroundColor: P.warningSoft }]}><Text style={[s.miniBadgeText, { color: P.warning }]}>Not approved</Text></View>}
                    </View>
                    <Fact label="Location" value={detail?.employer?.location || "—"} />
                    <Fact label="Active posts" value={detail ? String(detail.employer.active_posts) : "—"} />
                    <Fact label="Complaints" value={detail ? String(detail.employer.complaints_against) : "—"} danger={!!detail && detail.employer.complaints_against > 0} last />
                  </View>
                </View>

                {/* Job terms */}
                <Text style={[s.secTitle, { marginTop: 18 }]}>Job terms</Text>
                <View style={s.termsGrid}>
                  <Fact label="Salary" value={detail ? `₱${Number(detail.job.salary_monthly).toLocaleString()} / mo` : "—"} inline />
                  <Fact label="Employment" value={detail?.job?.employment_type || "—"} inline />
                  <Fact label="Schedule" value={detail?.job?.work_schedule || "—"} inline />
                  <Fact label="Min. experience" value={detail ? `${detail.job.min_experience_years} yr` : "—"} inline />
                  <Fact label="Location" value={detail?.job?.location || "—"} inline />
                </View>
                {Array.isArray(detail?.job?.roles) && detail.job.roles.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={s.chipsLabel}>Roles</Text>
                    <View style={s.chipsWrap}>{detail.job.roles.map((r: string, i: number) => <View key={i} style={s.roleChip}><Text style={s.roleChipText}>{r}</Text></View>)}</View>
                  </View>
                )}
                {Array.isArray(detail?.job?.skills) && detail.job.skills.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={s.chipsLabel}>Skills</Text>
                    <View style={s.chipsWrap}>{detail.job.skills.map((r: string, i: number) => <View key={i} style={[s.roleChip, { backgroundColor: P.infoSoft }]}><Text style={[s.roleChipText, { color: P.info }]}>{r}</Text></View>)}</View>
                  </View>
                )}

                {/* Shared documents */}
                <Text style={[s.secTitle, { marginTop: 18 }]}>Documents shared with the employer</Text>
                {Array.isArray(detail?.shared_documents) && detail.shared_documents.length > 0 ? (
                  <View style={{ gap: 6 }}>
                    {detail.shared_documents.map((d: any, i: number) => (
                      <View key={i} style={s.docRow}>
                        <Ionicons name="document-text-outline" size={15} color={P.peso} />
                        <Text style={s.docName}>{d.document_type}</Text>
                        <Text style={[s.docStatus, { color: d.status === "Verified" ? P.success : P.warning }]}>{d.status}</Text>
                      </View>
                    ))}
                  </View>
                ) : <Text style={s.muted}>None shared — only the helper's profile is visible to the employer.</Text>}

                {/* Cover letter */}
                <Text style={[s.secTitle, { marginTop: 18 }]}>Cover letter</Text>
                <View style={s.coverBox}><Text style={s.coverFull}>{(detail?.application?.cover_letter ?? viewing?.cover_letter)?.trim() || "No cover letter was written."}</Text></View>

                {detail?.flag && (
                  <View style={[s.signal, { backgroundColor: P.dangerSoft, marginTop: 16 }]}>
                    <Ionicons name="flag" size={16} color={P.danger} />
                    <Text style={[s.signalText, { color: P.danger }]}>Flagged by PESO: {detail.flag.reason}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Footer actions */}
            <View style={s.dFooter}>
              <TouchableOpacity style={s.dSecondary} onPress={closeDetail} activeOpacity={0.85}><Text style={s.dSecondaryText}>Close</Text></TouchableOpacity>
              {!!viewing && !["hired", "terminated", "termination_pending", "Withdrawn"].includes(viewing.status) && !viewing.is_flagged && (
                <TouchableOpacity style={s.dDanger} onPress={() => { const a = viewing; closeDetail(); setFlagFor(a); setReason(""); }} activeOpacity={0.85}>
                  <Ionicons name="flag-outline" size={15} color="#fff" /><Text style={s.dDangerText}>Flag & Unsubmit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

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

function Fact({ label, value, danger, last, inline }: { label: string; value: string; danger?: boolean; last?: boolean; inline?: boolean }) {
  if (inline) {
    return (
      <View style={s.factInline}>
        <Text style={s.factInlineLabel}>{label}</Text>
        <Text style={[s.factInlineValue, danger && { color: P.danger }]}>{value}</Text>
      </View>
    );
  }
  return (
    <View style={[s.factRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={[s.factValue, danger && { color: P.danger }]} numberOfLines={1}>{value}</Text>
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
  viewBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: P.line, backgroundColor: P.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  viewBtnText: { color: P.peso, fontWeight: "700", fontSize: 13 },

  // Case-review modal
  dHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: P.line, backgroundColor: P.canvasPeso },
  dEyebrow: { fontSize: 10.5, fontWeight: "800", color: P.subtle, letterSpacing: 0.6, marginBottom: 3 },
  dTitle: { fontSize: 18, fontWeight: "800", color: P.ink, lineHeight: 23 },
  secTitle: { fontSize: 12, fontWeight: "800", color: P.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 },
  signal: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  signalText: { flex: 1, fontSize: 12.5, fontWeight: "600", lineHeight: 17 },

  pair: { flexDirection: "row", gap: 12 },
  entity: { flex: 1, backgroundColor: P.surface, borderWidth: 1, borderColor: P.line, borderRadius: 14, padding: 14 },
  entityLabel: { fontSize: 10, fontWeight: "800", color: P.subtle, letterSpacing: 0.6 },
  entityName: { fontSize: 15.5, fontWeight: "800", color: P.ink, marginTop: 3 },
  badgeRow2: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, marginBottom: 6 },
  miniBadge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  miniBadgeText: { fontSize: 10.5, fontWeight: "800" },
  factRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: P.line },
  factLabel: { fontSize: 12, color: P.muted, fontWeight: "600" },
  factValue: { fontSize: 12.5, color: P.ink, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  factInline: { minWidth: 130, marginBottom: 6 },
  factInlineLabel: { fontSize: 11, color: P.subtle, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  factInlineValue: { fontSize: 13.5, color: P.ink, fontWeight: "700", marginTop: 1 },
  termsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, columnGap: 24 },
  chipsLabel: { fontSize: 11.5, color: P.muted, fontWeight: "700", marginBottom: 6 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  roleChip: { backgroundColor: P.pesoSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  roleChipText: { fontSize: 12, fontWeight: "700", color: P.peso },
  docRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: P.surface, borderWidth: 1, borderColor: P.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  docName: { flex: 1, fontSize: 13, color: P.ink, fontWeight: "600" },
  docStatus: { fontSize: 11.5, fontWeight: "800" },
  muted: { fontSize: 13, color: P.muted },
  coverBox: { backgroundColor: P.canvasPeso, borderRadius: 12, borderWidth: 1, borderColor: P.line, padding: 14 },
  coverFull: { fontSize: 13.5, color: P.ink, lineHeight: 20 },
  dFooter: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: P.line, backgroundColor: P.canvasPeso },
  dSecondary: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: P.line, alignItems: "center", backgroundColor: P.surface },
  dSecondaryText: { fontWeight: "800", color: P.ink, fontSize: 14 },
  dDanger: { flex: 1.3, flexDirection: "row", gap: 7, paddingVertical: 13, borderRadius: 12, backgroundColor: P.danger, alignItems: "center", justifyContent: "center" },
  dDangerText: { fontWeight: "800", color: "#fff", fontSize: 14 },

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
