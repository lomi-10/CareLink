// app/(peso)/applications/index.tsx
// PESO oversight of job applications. NOT an approval queue — PESO does not verify
// or approve applications (that would bottleneck every hire). This is an
// exception-based safeguard: PESO can see applications and, if one looks abusive or
// fraudulent, flag + unsubmit it (retracts it and notifies both parties).
//
// Desktop-first master/detail on the shared PESO design system (theme-aware
// light/dark, animated, branded backdrop): a list on the left, the full case file
// on the right (no modal on desktop). On mobile the case file opens in a modal.
// PHP: peso/list_applications.php, peso/flag_application.php, peso/application_detail.php

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from "react-native";
import { useNotice } from "@/hooks/shared/useNotice";
import { CredentialReviewSection, type ReviewDoc } from "@/components/peso/CredentialReviewSection";
import { DocumentViewerModal } from "@/components/peso/DocumentViewerModal";
import API_URL from "@/constants/api";
import {
  usePesoTheme, ScreenHeader, StatRow, StatTile, ListRow, EmptyState, IconButton, AnimateIn, layout, font, radius, space,
} from "@/components/peso/ui";
import { type PesoColors } from "@/contexts/PesoThemeContext";

type AppRow = {
  application_id: number; status: string; applied_at: string; cover_letter?: string | null;
  job_title: string; category_name?: string | null;
  helper_name: string; helper_email?: string; helper_verification?: string | null;
  parent_name: string;
  is_flagged: boolean; flag_reason?: string | null; flagged_at?: string | null;
};
type Filter = "all" | "active" | "flagged";

function statusMeta(status: string, c: PesoColors): { label: string; color: string; bg: string } {
  switch (status) {
    case "Pending": return { label: "Pending", color: c.warn, bg: c.warnSoft };
    case "Reviewed": return { label: "Reviewed", color: c.info, bg: c.infoSoft };
    case "Shortlisted": return { label: "Shortlisted", color: "#8B6FE0", bg: c.accentSoft };
    case "Interview Scheduled": return { label: "Interview", color: c.accent, bg: c.accentSoft };
    case "Accepted": return { label: "Accepted", color: c.ok, bg: c.okSoft };
    case "contract_pending": return { label: "Contract", color: c.warn, bg: c.warnSoft };
    case "hired": return { label: "Hired", color: c.ok, bg: c.okSoft };
    case "Withdrawn": return { label: "Withdrawn", color: c.muted, bg: c.sunken };
    case "Rejected": return { label: "Rejected", color: c.bad, bg: c.badSoft };
    case "auto_rejected": return { label: "Closed", color: c.muted, bg: c.sunken };
    default: return { label: status, color: c.muted, bg: c.sunken };
  }
}
const CAN_FLAG = (status: string, flagged: boolean) =>
  !["hired", "terminated", "termination_pending", "Withdrawn"].includes(status) && !flagged;

export default function PesoApplicationsScreen() {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { notify, noticeHost } = useNotice();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === "web" && width >= 1024;

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

  // Case file / Documents, matching the Job Verification panel.
  const [tab, setTab] = useState<"case" | "documents">("case");
  const [docView, setDocView] = useState<ReviewDoc | null>(null);
  const [docSide, setDocSide] = useState<"front" | "back">("front");
  const [flagDoc, setFlagDoc] = useState<ReviewDoc | null>(null);
  const [flagDocReason, setFlagDocReason] = useState("");
  const [flagDocRevoke, setFlagDocRevoke] = useState(false);

  const openDetail = async (a: AppRow) => {
    setViewing(a); setDetail(null); setDetailLoading(true); setTab("case");
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

  // Desktop: keep the detail pane populated — open the first row automatically.
  useEffect(() => {
    if (wide && rows.length && !rows.some((r) => r.application_id === viewing?.application_id)) void openDetail(rows[0]);
    if (!rows.length) closeDetail();
    // eslint-disable-next-line
  }, [wide, rows]);

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

  const submitDocFlag = async () => {
    if (!flagDoc || !flagDocReason.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/peso/flag_credential.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: flagDoc.document_id,
          reason: flagDocReason.trim(),
          revoke_verification: flagDocRevoke,
          flagged_by: staffId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFlagDoc(null); setFlagDocReason(""); setFlagDocRevoke(false);
        if (viewing) await openDetail(viewing);
        notify("Done", data.message || "Flag recorded.");
      } else notify("Couldn't flag", data.message || "Please try again.");
    } catch {
      notify("Offline", "Couldn't reach the server.");
    } finally { setBusy(false); }
  };

  // ── List row (selector) ──
  const ListCard = ({ a, index }: { a: AppRow; index: number }) => {
    const m = statusMeta(a.status, c);
    const active = viewing?.application_id === a.application_id;
    return (
      <ListRow selected={active} tone={a.is_flagged && !active ? "bad" : undefined} onPress={() => openDetail(a)} delay={Math.min(index * 45, 320)}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.listCardTop}>
            <Text style={s.listTitle} numberOfLines={1}>{a.job_title}</Text>
            <View style={[s.statusDot, { backgroundColor: m.color }]} />
          </View>
          <Text style={s.listParties} numberOfLines={1}>
            <Text style={s.strong}>{a.helper_name}</Text>{a.helper_verification === "Verified" ? " ✓" : ""} → {a.parent_name}
          </Text>
          <View style={s.listFoot}>
            <View style={[s.statusPill, { backgroundColor: m.bg }]}><Text style={[s.statusText, { color: m.color }]}>{m.label}</Text></View>
            {a.is_flagged && <View style={s.flagChip}><Ionicons name="flag" size={10} color={c.bad} /><Text style={s.flagChipText}>Flagged</Text></View>}
            <Text style={s.listApplied}>{timeAgo(a.applied_at)}</Text>
          </View>
        </View>
      </ListRow>
    );
  };

  // ── Detail (case file) — inline on desktop, modal on mobile ──
  const renderDetail = (inPanel: boolean) => {
    const flagAction = !!viewing && CAN_FLAG(viewing.status, viewing.is_flagged);
    const vm = viewing ? statusMeta(viewing.status, c) : null;
    const helperDocs: ReviewDoc[] = detail?.helper_credentials?.documents ?? [];
    const employerDocs: ReviewDoc[] = detail?.employer_credentials?.documents ?? [];
    const docCount = helperDocs.length + employerDocs.length;
    const openFlagCount =
      (detail?.helper_credentials?.flags?.length ?? 0) + (detail?.employer_credentials?.flags?.length ?? 0);

    return (
      <View style={inPanel ? s.detailPanel : [s.modalCard, { maxWidth: 720, padding: 0, overflow: "hidden" }]}>
        <View style={s.dHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.dEyebrow}>APPLICATION #{viewing?.application_id} · {viewing?.category_name || "—"}</Text>
            <Text style={s.dTitle} numberOfLines={2}>{detail?.job?.title ?? viewing?.job_title}</Text>
          </View>
          {!!vm && <View style={[s.statusPill, { backgroundColor: vm.bg }]}><Text style={[s.statusText, { color: vm.color }]}>{vm.label}</Text></View>}
          {!inPanel && <TouchableOpacity onPress={closeDetail} hitSlop={8} style={{ marginLeft: 8 }}><Ionicons name="close" size={22} color={c.muted} /></TouchableOpacity>}
        </View>

        {/* Tabs */}
        <View style={s.tabsRow}>
          {([["case", "Case file"], ["documents", `Documents${docCount ? ` (${docCount})` : ""}`]] as const).map(([key, label]) => (
            <Pressable key={key} onPress={() => setTab(key)} style={[s.tab, tab === key && s.tabActive]}>
              <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
              {key === "documents" && openFlagCount > 0 && <View style={s.tabDot} />}
            </Pressable>
          ))}
        </View>

        {detailLoading && !detail ? (
          <ActivityIndicator color={c.accent} style={{ marginVertical: 60 }} />
        ) : tab === "documents" ? (
          <ScrollView style={inPanel ? { flex: 1 } : { maxHeight: 540 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <CredentialReviewSection
              title="Applicant credentials"
              subtitle="Everything PESO holds for this helper. The marker on each card says whether this employer can see it."
              role="helper"
              documents={helperDocs}
              flags={detail?.helper_credentials?.flags}
              showSharing
              onView={(d, side) => { setDocSide(side); setDocView(d); }}
              onFlag={(d) => { setFlagDoc(d); setFlagDocReason(""); setFlagDocRevoke(false); }}
            />
            <View style={{ height: 22 }} />
            <CredentialReviewSection
              title="Employer credentials"
              subtitle="The household behind this posting."
              role="parent"
              documents={employerDocs}
              flags={detail?.employer_credentials?.flags}
              onView={(d, side) => { setDocSide(side); setDocView(d); }}
              onFlag={(d) => { setFlagDoc(d); setFlagDocReason(""); setFlagDocRevoke(false); }}
            />
          </ScrollView>
        ) : (
          <ScrollView style={inPanel ? { flex: 1 } : { maxHeight: 540 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            {/* Risk signals — the reason this screen exists */}
            {Array.isArray(detail?.risk_signals) && detail.risk_signals.length > 0 && (
              <View style={{ marginBottom: 18 }}>
                <Text style={s.secTitle}>Oversight checks</Text>
                <View style={{ gap: 8 }}>
                  {detail.risk_signals.map((sig: any, i: number) => {
                    const cfg = sig.level === "high" ? { col: c.bad, bg: c.badSoft, ic: "alert-circle" as const }
                      : sig.level === "warn" ? { col: c.warn, bg: c.warnSoft, ic: "warning" as const }
                      : sig.level === "ok" ? { col: c.ok, bg: c.okSoft, ic: "checkmark-circle" as const }
                      : { col: c.info, bg: c.infoSoft, ic: "information-circle" as const };
                    return (
                      <View key={i} style={[s.signal, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.ic} size={16} color={cfg.col} />
                        <Text style={[s.signalText, { color: cfg.col }]}>{sig.text}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Applicant + Employer */}
            <View style={[s.pair, !wide && { flexDirection: "column" }]}>
              <View style={s.entity}>
                <Text style={s.entityLabel}>APPLICANT (HELPER)</Text>
                <Text style={s.entityName}>{detail?.helper?.name ?? viewing?.helper_name}</Text>
                <View style={s.badgeRow2}>
                  {detail?.helper?.verification_status === "Verified"
                    ? <View style={[s.miniBadge, { backgroundColor: c.okSoft }]}><Ionicons name="shield-checkmark" size={11} color={c.ok} /><Text style={[s.miniBadgeText, { color: c.ok }]}>PESO Verified</Text></View>
                    : <View style={[s.miniBadge, { backgroundColor: c.warnSoft }]}><Text style={[s.miniBadgeText, { color: c.warn }]}>Not verified</Text></View>}
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
                    ? <View style={[s.miniBadge, { backgroundColor: c.okSoft }]}><Ionicons name="shield-checkmark" size={11} color={c.ok} /><Text style={[s.miniBadgeText, { color: c.ok }]}>PESO Verified</Text></View>
                    : <View style={[s.miniBadge, { backgroundColor: c.warnSoft }]}><Text style={[s.miniBadgeText, { color: c.warn }]}>Not approved</Text></View>}
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
                <View style={s.chipsWrap}>{detail.job.skills.map((r: string, i: number) => <View key={i} style={[s.roleChip, { backgroundColor: c.infoSoft }]}><Text style={[s.roleChipText, { color: c.info }]}>{r}</Text></View>)}</View>
              </View>
            )}

            {/* Shared documents — summary only. The full review, with the AI
                pre-check and the viewer, lives in the Documents tab; keeping a
                second copy here meant two places to read and two to maintain. */}
            <Text style={[s.secTitle, { marginTop: 18 }]}>Documents shared with the employer</Text>
            {Array.isArray(detail?.shared_documents) && detail.shared_documents.length > 0 ? (
              <>
                <View style={s.chipsWrap}>
                  {detail.shared_documents.map((d: any, i: number) => (
                    <View key={i} style={[s.roleChip, { backgroundColor: d.status === "Verified" ? c.okSoft : c.warnSoft }]}>
                      <Text style={[s.roleChipText, { color: d.status === "Verified" ? c.ok : c.warn }]}>{d.document_type}</Text>
                    </View>
                  ))}
                </View>
                <Pressable onPress={() => setTab("documents")} style={s.tabLink}>
                  <Ionicons name="folder-open-outline" size={14} color={c.accent} />
                  <Text style={s.tabLinkText}>Review all documents</Text>
                  <Ionicons name="arrow-forward" size={13} color={c.accent} />
                </Pressable>
              </>
            ) : <Text style={s.mutedText}>None shared — only the helper's profile is visible to the employer.</Text>}

            {/* Cover letter */}
            <Text style={[s.secTitle, { marginTop: 18 }]}>Cover letter</Text>
            <View style={s.coverBox}><Text style={s.coverFull}>{(detail?.application?.cover_letter ?? viewing?.cover_letter)?.trim() || "No cover letter was written."}</Text></View>

            {detail?.flag && (
              <View style={[s.signal, { backgroundColor: c.badSoft, marginTop: 16 }]}>
                <Ionicons name="flag" size={16} color={c.bad} />
                <Text style={[s.signalText, { color: c.bad }]}>Flagged by PESO: {detail.flag.reason}</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Footer — only shows when there's an action or a modal to close */}
        {(flagAction || !inPanel) && (
          <View style={s.dFooter}>
            {!inPanel && <TouchableOpacity style={s.dSecondary} onPress={closeDetail} activeOpacity={0.85}><Text style={s.dSecondaryText}>Close</Text></TouchableOpacity>}
            {flagAction && (
              <TouchableOpacity style={s.dDanger} onPress={() => { const a = viewing!; if (!inPanel) closeDetail(); setFlagFor(a); setReason(""); }} activeOpacity={0.85}>
                <Ionicons name="flag-outline" size={15} color="#fff" /><Text style={s.dDangerText}>Flag & Unsubmit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const list = (
    loading ? (
      <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 50 }} />
    ) : rows.length === 0 ? (
      <EmptyState icon="reader-outline" title={`No applications${filter === "flagged" ? " flagged" : ""} yet`}
        sub={filter === "flagged" ? "Nothing has been flagged for oversight." : "Applications will appear here as helpers apply."} />
    ) : (
      <ScrollView style={s.flex1} contentContainerStyle={{ gap: 10, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {rows.map((a, i) => <ListCard key={a.application_id} a={a} index={i} />)}
      </ScrollView>
    )
  );

  return (
    <View style={layout.page(c.canvas)}>
     {/* Master-detail: the list column (with its own header) on the left, and the
         case file spanning the FULL height on the right. */}
     <View style={wide ? layout.splitRow : layout.flex1}>
      <View style={wide ? layout.leftPane : layout.flex1}>
        <ScreenHeader eyebrow="Oversight & Safeguards" title="Applications"
          subtitle="Flag & unsubmit any application that looks abusive or fraudulent — PESO does not approve applications."
          right={<IconButton icon="refresh" tone="accent" onPress={() => load(filter, q)} />} />

        <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
          {!loading && (
            <StatRow>
              <StatTile label="Total" value={summary.total} tone="accent" sub="applications" delay={0} />
              <StatTile label="Active" value={summary.active} tone="ok" sub="in progress" delay={60} />
              <StatTile label="Flagged" value={summary.flagged} tone="bad" sub="unsubmitted" delay={120} />
            </StatRow>
          )}

          {/* Search */}
          <AnimateIn delay={200} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 13, paddingVertical: 10, marginTop: space.lg }}>
            <Ionicons name="search" size={16} color={c.subtle} />
            <TextInput style={s.searchInput} value={q} onChangeText={setQ} onSubmitEditing={() => load(filter, q)}
              placeholder="Search helper, employer or job…" placeholderTextColor={c.subtle} returnKeyType="search" />
            {!!q && <Pressable onPress={() => { setQ(""); load(filter, ""); }} hitSlop={10}><Ionicons name="close-circle" size={16} color={c.subtle} /></Pressable>}
          </AnimateIn>

          {/* Filter chips */}
          <AnimateIn delay={250}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: space.md }} contentContainerStyle={{ gap: 8 }}>
            {(["all", "active", "flagged"] as Filter[]).map((f) => {
              const active = filter === f;
              const count = f === "all" ? summary.total : f === "active" ? summary.active : summary.flagged;
              return (
                <Pressable key={f} onPress={() => setFilter(f)}
                  style={({ hovered }: any) => [{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, transitionDuration: "140ms", backgroundColor: active ? c.accent : hovered ? c.accentSoft : c.surface, borderWidth: 1, borderColor: active ? c.accent : hovered ? c.accent : c.line } as any]}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: active ? "#fff" : c.muted }}>{f === "all" ? "All" : f === "active" ? "Active" : "Flagged"}</Text>
                  <View style={{ minWidth: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: active ? "rgba(255,255,255,0.25)" : c.sunken, alignItems: "center" }}>
                    <Text style={{ fontSize: 11, fontFamily: font.semibold, color: active ? "#fff" : c.muted }}>{count}</Text></View>
                </Pressable>
              );
            })}
          </ScrollView>
          </AnimateIn>
        </View>
        {list}
      </View>

      {wide && (
        <View style={layout.rightPane(c.line, c.surface)}>
          {viewing ? renderDetail(true) : (
            <EmptyState icon="reader-outline" title="Select an application" sub="Choose one on the left to review the full case file here." />
          )}
        </View>
      )}
     </View>

      {/* Mobile: case file in a modal */}
      {!wide && (
        <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={closeDetail}>
          <View style={s.modalBg}>{renderDetail(false)}</View>
        </Modal>
      )}

      {/* Flag modal */}
      <Modal visible={!!flagFor} transparent animationType="fade" onRequestClose={() => setFlagFor(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}><Ionicons name="flag" size={26} color={c.bad} /></View>
            <Text style={s.modalTitle}>Flag & Unsubmit Application</Text>
            <Text style={s.modalHint}>
              This retracts {flagFor?.helper_name}'s application for “{flagFor?.job_title}” and notifies both the helper and the employer. Use only for abusive or fraudulent applications.
            </Text>
            <Text style={s.label}>Reason (shown to the helper)</Text>
            <TextInput style={[s.input, s.multiline]} value={reason} onChangeText={setReason} placeholder="e.g. Duplicate / suspicious application, policy violation…" placeholderTextColor={c.subtle} multiline autoFocus />
            <View style={s.modalRow}>
              <TouchableOpacity style={[s.mBtn, s.mCancel]} onPress={() => setFlagFor(null)}><Text style={s.mCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.mBtn, s.mDanger, busy && { opacity: 0.6 }]} onPress={submitFlag} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.mDangerText}>Flag & Unsubmit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <DocumentViewerModal
        visible={!!docView}
        doc={docView as any}
        side={docSide}
        onChangeSide={setDocSide}
        onClose={() => setDocView(null)}
        onFlag={() => { setFlagDoc(docView); setFlagDocReason(""); setFlagDocRevoke(false); setDocView(null); }}
      />

      {/* Flag an altered credential — same endpoint the Job Verification panel uses */}
      <Modal visible={!!flagDoc} transparent animationType="fade" onRequestClose={() => setFlagDoc(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}><Ionicons name="flag" size={26} color={c.bad} /></View>
            <Text style={s.modalTitle}>Flag this credential</Text>
            <Text style={s.modalHint}>{flagDoc?.document_type} — the reason is shown to the account holder and kept on the record even after they re-upload.</Text>
            <TextInput
              style={[s.input, s.multiline]} value={flagDocReason} onChangeText={setFlagDocReason}
              placeholder="e.g. Details do not match the profile; the document appears edited…"
              placeholderTextColor={c.subtle} multiline
            />
            <Pressable onPress={() => setFlagDocRevoke((v) => !v)} style={[s.revokeRow, flagDocRevoke && { borderColor: c.bad, backgroundColor: c.badSoft }]}>
              <Ionicons name={flagDocRevoke ? "checkbox" : "square-outline"} size={20} color={flagDocRevoke ? c.bad : c.subtle} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.revokeTitle, flagDocRevoke && { color: c.bad }]}>Also withdraw PESO verification</Text>
                <Text style={s.revokeSub}>
                  {flagDocRevoke
                    ? "The account returns to Rejected and must be re-reviewed. They keep access so they can re-upload."
                    : "Leave off to record the concern without changing their status."}
                </Text>
              </View>
            </Pressable>
            <View style={s.modalRow}>
              <TouchableOpacity style={[s.mBtn, s.mCancel]} onPress={() => setFlagDoc(null)}><Text style={s.mCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.mBtn, s.mDanger, (busy || !flagDocReason.trim()) && { opacity: 0.5 }]} onPress={submitDocFlag} disabled={busy || !flagDocReason.trim()}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.mDangerText}>{flagDocRevoke ? "Flag & withdraw" : "Record flag"}</Text>}
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
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  if (inline) {
    return (
      <View style={s.factInline}>
        <Text style={s.factInlineLabel}>{label}</Text>
        <Text style={[s.factInlineValue, danger && { color: c.bad }]}>{value}</Text>
      </View>
    );
  }
  return (
    <View style={[s.factRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={[s.factValue, danger && { color: c.bad }]} numberOfLines={1}>{value}</Text>
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

const makeStyles = (c: PesoColors) => StyleSheet.create({
  searchInput: { flex: 1, color: c.ink, fontSize: 14, fontFamily: font.regular, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) },

  flex1: { flex: 1, minHeight: 0 },

  // List card (selector) — inner content; ListRow provides the frame/animation
  listCardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  listTitle: { flex: 1, fontSize: 14.5, fontFamily: font.semibold, color: c.ink },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  listParties: { fontSize: 12.5, color: c.muted, marginTop: 4, fontFamily: font.regular },
  strong: { color: c.ink, fontFamily: font.semibold },
  listFoot: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  listApplied: { fontSize: 11, color: c.subtle, marginLeft: "auto", fontFamily: font.regular },
  flagChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: c.badSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  flagChipText: { fontSize: 10, fontFamily: font.semibold, color: c.bad },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontFamily: font.semibold },

  // Detail panel (desktop) — fills the full-height rightPane frame
  detailPanel: { flex: 1 },

  // Case file
  dHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.sunken },
  dEyebrow: { fontSize: 10.5, fontFamily: font.semibold, color: c.subtle, letterSpacing: 0.6, marginBottom: 3 },
  dTitle: { fontSize: 18, fontFamily: font.display, color: c.ink, lineHeight: 23 },
  secTitle: { fontSize: 12, fontFamily: font.semibold, color: c.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 },

  tabsRow: { flexDirection: "row", gap: 4, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.surface },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: c.accent },
  tabText: { fontFamily: font.semibold, fontSize: 13.5, color: c.muted },
  tabTextActive: { color: c.accent },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.bad },
  tabLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.accentSoft },
  tabLinkText: { fontFamily: font.semibold, fontSize: 12, color: c.accent },

  revokeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1.4, borderColor: c.line },
  revokeTitle: { fontFamily: font.semibold, fontSize: 13, color: c.ink },
  revokeSub: { fontFamily: font.regular, fontSize: 11.5, color: c.muted, marginTop: 2, lineHeight: 16 },
  signal: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  signalText: { flex: 1, fontSize: 12.5, fontFamily: font.regular, lineHeight: 17 },

  pair: { flexDirection: "row", gap: 12 },
  entity: { flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 14 },
  entityLabel: { fontSize: 10, fontFamily: font.semibold, color: c.subtle, letterSpacing: 0.6 },
  entityName: { fontSize: 15.5, fontFamily: font.semibold, color: c.ink, marginTop: 3 },
  badgeRow2: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, marginBottom: 6 },
  miniBadge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  miniBadgeText: { fontSize: 10.5, fontFamily: font.semibold },
  factRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.line },
  factLabel: { fontSize: 12, color: c.muted, fontFamily: font.regular },
  factValue: { fontSize: 12.5, color: c.ink, fontFamily: font.semibold, flexShrink: 1, textAlign: "right" },
  factInline: { minWidth: 130, marginBottom: 6 },
  factInlineLabel: { fontSize: 11, color: c.subtle, fontFamily: font.semibold, textTransform: "uppercase", letterSpacing: 0.4 },
  factInlineValue: { fontSize: 13.5, color: c.ink, fontFamily: font.semibold, marginTop: 1 },
  termsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, columnGap: 24 },
  chipsLabel: { fontSize: 11.5, color: c.muted, fontFamily: font.semibold, marginBottom: 6 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  roleChip: { backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  roleChipText: { fontSize: 12, fontFamily: font.semibold, color: c.accentInk },
  docRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  docName: { flex: 1, fontSize: 13, color: c.ink, fontFamily: font.regular },
  docStatus: { fontSize: 11.5, fontFamily: font.semibold },
  mutedText: { fontSize: 13, color: c.muted, fontFamily: font.regular },
  coverBox: { backgroundColor: c.sunken, borderRadius: 12, borderWidth: 1, borderColor: c.line, padding: 14 },
  coverFull: { fontSize: 13.5, color: c.ink, lineHeight: 20, fontFamily: font.regular },
  dFooter: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.sunken },
  dSecondary: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: c.line, alignItems: "center", backgroundColor: c.surface },
  dSecondaryText: { fontFamily: font.semibold, color: c.ink, fontSize: 14 },
  dDanger: { flex: 1.3, flexDirection: "row", gap: 7, paddingVertical: 13, borderRadius: 12, backgroundColor: c.bad, alignItems: "center", justifyContent: "center" },
  dDangerText: { fontFamily: font.semibold, color: "#fff", fontSize: 14 },

  modalBg: { flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", padding: 22 },
  modalCard: { width: "100%", maxWidth: 460, backgroundColor: c.surface, borderRadius: 18, padding: 22 },
  modalIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.badSoft, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  modalTitle: { fontSize: 18, fontFamily: font.display, color: c.ink, marginTop: 12, textAlign: "center" },
  modalHint: { fontSize: 13, color: c.muted, marginTop: 8, lineHeight: 19, textAlign: "center", fontFamily: font.regular },
  label: { fontSize: 13, fontFamily: font.semibold, color: c.muted, marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: c.ink, backgroundColor: c.sunken, fontFamily: font.regular, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  modalRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  mBtn: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  mCancel: { borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  mCancelText: { fontFamily: font.semibold, color: c.ink },
  mDanger: { backgroundColor: c.bad },
  mDangerText: { fontFamily: font.semibold, color: "#fff" },
});
