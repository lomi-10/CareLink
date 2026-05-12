import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API_URL from "@/constants/api";
import { pesoHireReportsUrl } from "@/constants/applications";
import { withPesoStaffQuery } from "@/lib/pesoStaffQuery";
import { theme } from "@/constants/theme";

type ReportRow = {
  log_id: number;
  verified_by: number;
  verified_by_name: string;
  verified_by_email: string;
  action: string;
  module: string;
  record_id: number | null;
  status: string;
  created_at: string | null;
  // User verification
  target_user_id?: number | null;
  target_user_name?: string | null;
  target_user_email?: string | null;
  target_user_type?: string | null;
  target_verification_status?: string | null;
  // Document verification
  target_document_id?: number | null;
  target_document_type?: string | null;
  target_document_status?: string | null;
  doc_owner_user_id?: number | null;
  doc_owner_name?: string | null;
  doc_owner_email?: string | null;
  doc_owner_type?: string | null;
  // Job verification
  target_job_id?: number | null;
  target_job_title?: string | null;
  target_job_status?: string | null;
  target_job_rejection_reason?: string | null;
  job_owner_user_id?: number | null;
  job_owner_name?: string | null;
  job_owner_email?: string | null;
};

type HireReportRow = {
  application_id: number;
  job_post_id: number;
  job_title: string;
  parent_id: number;
  parent_name: string;
  parent_email?: string | null;
  helper_id: number;
  helper_name: string;
  helper_email?: string | null;
  application_status: string;
  employer_signed_at: string | null;
  helper_signed_at: string | null;
  contract_generated_at: string | null;
  template_version?: string | null;
  fully_signed: boolean;
  pdf_url: string | null;
};

function lastActivityMs(r: HireReportRow): number {
  const candidates = [r.employer_signed_at, r.helper_signed_at, r.contract_generated_at]
    .filter(Boolean)
    .map((s) => new Date(s as string).getTime());
  return candidates.length ? Math.max(...candidates) : 0;
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLastActivity(r: HireReportRow): string {
  const ms = lastActivityMs(r);
  if (!ms) return "—";
  return formatWhen(new Date(ms).toISOString());
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function exportCsvDownload(filename: string, header: string[], rows: (string | number | boolean | null | undefined)[][]): Promise<void> {
  const lines = [header.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  const body = "\uFEFF" + lines.join("\r\n");
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const msg = body.length > 120000 ? body.slice(0, 120000) + "\n…(truncated for share sheet)" : body;
  await Share.share({ title: filename, message: msg });
}

const ACTION_LABEL: Record<string, string> = {
  VERIFY_USER_APPROVE:    "Account Approved",
  VERIFY_USER_REJECT:     "Account Rejected",
  VERIFY_DOCUMENT_APPROVE:"Document Approved",
  VERIFY_DOCUMENT_REJECT: "Document Rejected",
  VERIFY_JOB_APPROVE:     "Job Approved",
  VERIFY_JOB_REJECT:      "Job Rejected",
};

function verificationCsvFields(r: ReportRow) {
  const isDoc = (r.action || "").includes("DOCUMENT");
  const isUser = (r.action || "").includes("USER") && !isDoc;
  const isJob = (r.action || "").includes("JOB");
  const subject = isJob ? r.job_owner_name : isUser ? r.target_user_name : r.doc_owner_name;
  const subEmail = isJob ? r.job_owner_email : isUser ? r.target_user_email : r.doc_owner_email;
  const detailLine = isJob
    ? `Job: ${r.target_job_title ?? "—"}`
    : isUser
      ? `Account ${r.target_verification_status ?? "—"}`
      : `${r.target_document_type ?? "—"}`;
  return { subject, subEmail, detailLine };
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Verified:  { bg: theme.color.successSoft,  text: theme.color.success },
  Approved:  { bg: theme.color.successSoft,  text: theme.color.success },
  Rejected:  { bg: theme.color.dangerSoft,   text: theme.color.danger  },
  Pending:   { bg: theme.color.warningSoft,  text: theme.color.warning },
};

function statusChip(label?: string | null) {
  if (!label) return null;
  const color = STATUS_COLORS[label] ?? { bg: theme.color.surface, text: theme.color.muted };
  return { bg: color.bg, text: color.text, label };
}

function Badge({ label, approved }: { label: string; approved: boolean }) {
  return (
    <View style={[bStyles.badge, { backgroundColor: approved ? theme.color.successSoft : theme.color.dangerSoft }]}>
      <Text style={[bStyles.badgeText, { color: approved ? theme.color.success : theme.color.danger }]}>
        {label}
      </Text>
    </View>
  );
}

const bStyles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
});

const COLS = [
  { key: "date",     label: "Date & Time",   w: 168 },
  { key: "role",     label: "Role",          w: 88  },
  { key: "subject",  label: "Subject User",  w: 220 },
  { key: "action",   label: "Action",        w: 190 },
  { key: "details",  label: "Details",       w: 200 },
  { key: "verifier", label: "Verified By",   w: 200 },
];

const HIRE_COLS = [
  { key: "activity", label: "Last activity", w: 152 },
  { key: "job", label: "Job", w: 200 },
  { key: "parent", label: "Employer (parent)", w: 210 },
  { key: "helper", label: "Helper", w: 210 },
  { key: "status", label: "Record", w: 100 },
  { key: "signatures", label: "Signatures", w: 220 },
  { key: "contract", label: "Contract", w: 108 },
];

export default function Reports() {
  const [reportSection, setReportSection] = useState<"verification" | "hires">("verification");

  const [loading, setLoading]         = useState(true);
  const [rows, setRows]               = useState<ReportRow[]>([]);
  const [query, setQuery]             = useState("");
  const [filterAction, setFilterAction] = useState<"All" | "User" | "Document" | "Job">("All");
  const [filterRole, setFilterRole]   = useState<"All" | "helper" | "parent">("All");

  const [hireLoading, setHireLoading] = useState(false);
  const [hireRows, setHireRows]       = useState<HireReportRow[]>([]);
  const [hireQuery, setHireQuery]     = useState("");
  const [hireSort, setHireSort]       = useState<"recent" | "oldest" | "parent" | "helper" | "job">("recent");
  const [hireSigFilter, setHireSigFilter] = useState<"all" | "signed" | "pending">("all");

  const [repMeta, setRepMeta] = useState<{ total?: number; limit?: number; offset?: number } | null>(null);
  const [lastFetchedVerification, setLastFetchedVerification] = useState<string | null>(null);
  const [lastFetchedHires, setLastFetchedHires] = useState<string | null>(null);
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "500", offset: "0" });
      const df = reportDateFrom.trim();
      const dt = reportDateTo.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(df)) params.set("from", df);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) params.set("to", dt);
      const rawUrl = `${API_URL}/peso/get_verification_reports.php?${params.toString()}`;
      const res = await fetch(await withPesoStaffQuery(rawUrl));
      const text = await res.text();
      const data = JSON.parse(text);
      setRows(data.success ? (data.data || []) : []);
      setRepMeta(data.success ? data.meta ?? null : null);
      setLastFetchedVerification(data.success ? new Date().toLocaleString() : null);
    } catch {
      setRows([]);
      setRepMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const fetchHires = useCallback(async () => {
    try {
      setHireLoading(true);
      const res = await fetch(await withPesoStaffQuery(pesoHireReportsUrl()));
      const data = await res.json();
      setHireRows(data.success && Array.isArray(data.hires) ? data.hires : []);
      setLastFetchedHires(data.success ? new Date().toLocaleString() : null);
    } catch {
      setHireRows([]);
      setLastFetchedHires(null);
    } finally {
      setHireLoading(false);
    }
  }, []);

  useEffect(() => {
    if (reportSection !== "hires") return;
    void fetchHires();
  }, [reportSection, fetchHires]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const isDoc  = (r.action || "").includes("DOCUMENT");
      const isUser = (r.action || "").includes("USER") && !isDoc;
      const isJob  = (r.action || "").includes("JOB");

      if (filterAction === "Document" && !isDoc)  return false;
      if (filterAction === "User"     && !isUser)  return false;
      if (filterAction === "Job"      && !isJob)   return false;

      // Role filter: jobs are always parent-owned
      const role = isJob
        ? "parent"
        : (isUser ? r.target_user_type : r.doc_owner_type) ?? null;
      if (filterRole !== "All" && role !== filterRole) return false;

      if (!q) return true;
      return (
        (r.verified_by_name    || "").toLowerCase().includes(q) ||
        (r.verified_by_email   || "").toLowerCase().includes(q) ||
        (r.target_user_name    || "").toLowerCase().includes(q) ||
        (r.target_user_email   || "").toLowerCase().includes(q) ||
        (r.doc_owner_name      || "").toLowerCase().includes(q) ||
        (r.doc_owner_email     || "").toLowerCase().includes(q) ||
        (r.job_owner_name      || "").toLowerCase().includes(q) ||
        (r.target_job_title    || "").toLowerCase().includes(q) ||
        (r.action              || "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, filterAction, filterRole]);

  const filteredHires = useMemo(() => {
    const q = hireQuery.trim().toLowerCase();
    let list = hireRows.filter((r) => {
      if (hireSigFilter === "signed" && !r.fully_signed) return false;
      if (hireSigFilter === "pending" && r.fully_signed) return false;
      if (!q) return true;
      return (
        (r.parent_name || "").toLowerCase().includes(q) ||
        (r.helper_name || "").toLowerCase().includes(q) ||
        (r.job_title || "").toLowerCase().includes(q) ||
        (r.parent_email || "").toLowerCase().includes(q) ||
        (r.helper_email || "").toLowerCase().includes(q)
      );
    });
    const copy = [...list];
    copy.sort((a, b) => {
      switch (hireSort) {
        case "recent":
          return lastActivityMs(b) - lastActivityMs(a);
        case "oldest":
          return lastActivityMs(a) - lastActivityMs(b);
        case "parent":
          return (a.parent_name || "").localeCompare(b.parent_name || "", undefined, { sensitivity: "base" });
        case "helper":
          return (a.helper_name || "").localeCompare(b.helper_name || "", undefined, { sensitivity: "base" });
        case "job":
          return (a.job_title || "").localeCompare(b.job_title || "", undefined, { sensitivity: "base" });
        default:
          return 0;
      }
    });
    return copy;
  }, [hireRows, hireQuery, hireSort, hireSigFilter]);

  const totalApproved = filtered.filter((r) => r.action.endsWith("APPROVE")).length;
  const totalRejected = filtered.filter((r) => r.action.endsWith("REJECT")).length;

  const dateFilterInvalid =
    (reportDateFrom.trim() !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(reportDateFrom.trim())) ||
    (reportDateTo.trim() !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(reportDateTo.trim()));

  const exportVerificationCsv = useCallback(() => {
    const header = [
      "created_at",
      "action_code",
      "action_label",
      "module",
      "verified_by_name",
      "verified_by_email",
      "subject",
      "subject_email",
      "detail",
    ];
    const dataRows = filtered.map((r) => {
      const { subject, subEmail, detailLine } = verificationCsvFields(r);
      return [
        r.created_at,
        r.action,
        ACTION_LABEL[r.action] ?? r.action,
        r.module,
        r.verified_by_name,
        r.verified_by_email,
        subject ?? "",
        subEmail ?? "",
        detailLine,
      ];
    });
    void exportCsvDownload(`peso-verification-audit-${Date.now()}.csv`, header, dataRows);
  }, [filtered]);

  const exportHiresCsv = useCallback(() => {
    const header = [
      "application_id",
      "job_title",
      "parent_name",
      "parent_email",
      "helper_name",
      "helper_email",
      "application_status",
      "fully_signed",
      "employer_signed_at",
      "helper_signed_at",
      "contract_generated_at",
      "pdf_url",
    ];
    const dataRows = filteredHires.map((r) => [
      r.application_id,
      r.job_title,
      r.parent_name,
      r.parent_email ?? "",
      r.helper_name,
      r.helper_email ?? "",
      r.application_status,
      r.fully_signed,
      r.employer_signed_at ?? "",
      r.helper_signed_at ?? "",
      r.contract_generated_at ?? "",
      r.pdf_url ?? "",
    ]);
    void exportCsvDownload(`peso-hires-${Date.now()}.csv`, header, dataRows);
  }, [filteredHires]);

  const hireFullySigned = hireRows.filter((r) => r.fully_signed).length;
  const hirePendingSig = hireRows.filter((r) => !r.fully_signed).length;

  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.pageTitle}>Reports</Text>
          <Text style={styles.pageSubtitle}>
            {reportSection === "verification"
              ? loading
                ? "Loading…"
                : `${filtered.length} shown after filters · ${rows.length} loaded${
                    typeof repMeta?.total === "number" ? ` · ${repMeta.total} in date range` : ""
                  }`
              : hireLoading
                ? "Loading…"
                : `${filteredHires.length} hire${filteredHires.length !== 1 ? "s" : ""} shown after filters`}
          </Text>
          {(reportSection === "verification" ? lastFetchedVerification : lastFetchedHires) ? (
            <Text style={styles.lastFetched}>
              Last fetched: {reportSection === "verification" ? lastFetchedVerification : lastFetchedHires}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={reportSection === "verification" ? fetchReports : fetchHires}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={16} color={theme.color.peso} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* ── REPORT SECTION (admin-style) ── */}
      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[styles.segmentBtn, reportSection === "verification" && styles.segmentBtnActive]}
          onPress={() => setReportSection("verification")}
          activeOpacity={0.85}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={reportSection === "verification" ? "#fff" : theme.color.muted}
          />
          <Text style={[styles.segmentBtnText, reportSection === "verification" && styles.segmentBtnTextActive]}>
            Verification audit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, reportSection === "hires" && styles.segmentBtnActive]}
          onPress={() => setReportSection("hires")}
          activeOpacity={0.85}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={reportSection === "hires" ? "#fff" : theme.color.muted}
          />
          <Text style={[styles.segmentBtnText, reportSection === "hires" && styles.segmentBtnTextActive]}>
            Hires & contracts
          </Text>
        </TouchableOpacity>
      </View>

      {reportSection === "verification" && (
        <>

      {/* ── SUMMARY CHIPS ── */}
      {!loading && rows.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="checkmark-circle" size={20} color={theme.color.success} />
            <Text style={styles.summaryNum}>{totalApproved}</Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="close-circle" size={20} color={theme.color.danger} />
            <Text style={styles.summaryNum}>{totalRejected}</Text>
            <Text style={styles.summaryLabel}>Rejected</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="document-text" size={20} color={theme.color.info} />
            <Text style={styles.summaryNum}>{filtered.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
      )}

      <View style={styles.dateExportSection}>
        <Text style={styles.dateHint}>Verification audit: filter server rows by date (YYYY-MM-DD)</Text>
        <View style={styles.dateInputsRow}>
          <TextInput
            value={reportDateFrom}
            onChangeText={setReportDateFrom}
            placeholder="From"
            placeholderTextColor={theme.color.subtle}
            style={styles.dateInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            value={reportDateTo}
            onChangeText={setReportDateTo}
            placeholder="To"
            placeholderTextColor={theme.color.subtle}
            style={styles.dateInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.smallBtn, dateFilterInvalid && styles.smallBtnDisabled]}
            onPress={() => void fetchReports()}
            disabled={dateFilterInvalid}
            activeOpacity={0.85}
          >
            <Text style={styles.smallBtnText}>Apply range</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportCsvBtn, filtered.length === 0 && styles.smallBtnDisabled]}
            onPress={() => void exportVerificationCsv()}
            disabled={filtered.length === 0}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.exportCsvBtnText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
        {dateFilterInvalid ? (
          <Text style={styles.dateWarn}>Use YYYY-MM-DD or leave fields blank.</Text>
        ) : null}
      </View>

      {/* ── TOOLBAR ── */}
      <View style={styles.toolbar}>
        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={theme.color.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, email, action…"
            placeholderTextColor={theme.color.subtle}
            style={styles.searchInput}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={theme.color.subtle} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter rows */}
        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.chipRow}>
              {(["All", "User", "Document", "Job"] as const).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.chip, filterAction === k && styles.chipActive]}
                  onPress={() => setFilterAction(k)}
                >
                  <Text style={[styles.chipText, filterAction === k && styles.chipTextActive]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.filterGroup, { marginLeft: 24 }]}>
            <Text style={styles.filterLabel}>Role</Text>
            <View style={styles.chipRow}>
              {(["All", "helper", "parent"] as const).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.chip, filterRole === k && styles.chipActive]}
                  onPress={() => setFilterRole(k)}
                >
                  <Text style={[styles.chipText, filterRole === k && styles.chipTextActive]}>
                    {k === "All" ? "All" : k === "helper" ? "Helpers" : "Parents"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* ── CONTENT ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.color.peso} />
          <Text style={styles.centerText}>Loading…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="file-tray-outline" size={56} color={theme.color.subtle} />
          <Text style={styles.emptyTitle}>No records found</Text>
          <Text style={styles.emptyBody}>
            Try adjusting the filters, or start verifying accounts to build the audit trail.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.tableOuter}
        >
          <View style={styles.table}>
            {/* Header row */}
            <View style={[styles.tr, styles.theadRow]}>
              {COLS.map((c) => (
                <Text key={c.key} style={[styles.thCell, { width: c.w }]}>
                  {c.label}
                </Text>
              ))}
            </View>

            {/* Data rows */}
            <ScrollView>
              {filtered.map((r, idx) => {
                const isDoc    = (r.action || "").includes("DOCUMENT");
                const isUser   = (r.action || "").includes("USER") && !isDoc;
                const isJob    = (r.action || "").includes("JOB");
                const approved = (r.action || "").endsWith("APPROVE");

                const role     = isJob
                  ? "PARENT"
                  : ((isUser ? r.target_user_type : r.doc_owner_type) ?? "—").toUpperCase();

                const subject  = isJob ? r.job_owner_name  : isUser ? r.target_user_name  : r.doc_owner_name;
                const subEmail = isJob ? r.job_owner_email : isUser ? r.target_user_email : r.doc_owner_email;

                const chip = isJob
                  ? statusChip(r.target_job_status === "Open" ? "Approved" : r.target_job_status)
                  : isUser
                  ? statusChip(r.target_verification_status)
                  : statusChip(r.target_document_status);

                const detailLine = isJob
                  ? `Job: ${r.target_job_title ?? "—"}`
                  : isUser
                  ? `Account ${r.target_verification_status ?? "—"}`
                  : `${r.target_document_type ?? "—"}`;

                const isEven = idx % 2 === 0;

                return (
                  <View
                    key={String(r.log_id)}
                    style={[styles.tr, styles.tbodyRow, isEven && styles.trEven]}
                  >
                    {/* Date */}
                    <View style={[styles.tdCell, { width: COLS[0].w }]}>
                      <Text style={styles.tdDate}>
                        {r.created_at ? r.created_at.replace(" ", "\n") : "—"}
                      </Text>
                    </View>

                    {/* Role */}
                    <View style={[styles.tdCell, { width: COLS[1].w }]}>
                      <View style={[styles.rolePill, role === "HELPER" ? styles.roleHelper : styles.roleParent]}>
                        <Text style={[styles.rolePillText, role === "HELPER" ? styles.roleHelperText : styles.roleParentText]}>
                          {role}
                        </Text>
                      </View>
                    </View>

                    {/* Subject user */}
                    <View style={[styles.tdCell, { width: COLS[2].w }]}>
                      <Text style={styles.tdPrimary} numberOfLines={1}>{subject ?? "—"}</Text>
                      <Text style={styles.tdSecondary} numberOfLines={1}>{subEmail ?? ""}</Text>
                    </View>

                    {/* Action */}
                    <View style={[styles.tdCell, { width: COLS[3].w }]}>
                      <Badge label={ACTION_LABEL[r.action] ?? r.action} approved={approved} />
                    </View>

                    {/* Details */}
                    <View style={[styles.tdCell, { width: COLS[4].w }]}>
                      <Text style={styles.tdPrimary}>{detailLine}</Text>
                      {chip && (
                        <View style={[styles.detailChip, { backgroundColor: chip.bg }]}>
                          <Text style={[styles.detailChipText, { color: chip.text }]}>{chip.label}</Text>
                        </View>
                      )}
                    </View>

                    {/* Verified by */}
                    <View style={[styles.tdCell, { width: COLS[5].w }]}>
                      <Text style={styles.tdPrimary} numberOfLines={1}>{r.verified_by_name}</Text>
                      <Text style={styles.tdSecondary} numberOfLines={1}>{r.verified_by_email}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      )}
        </>
      )}

      {reportSection === "hires" && (
        <>
          {!hireLoading && hireRows.length > 0 && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Ionicons name="people" size={20} color={theme.color.parent} />
                <Text style={styles.summaryNum}>{hireRows.length}</Text>
                <Text style={styles.summaryLabel}>Active hires</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="checkmark-done" size={20} color={theme.color.success} />
                <Text style={styles.summaryNum}>{hireFullySigned}</Text>
                <Text style={styles.summaryLabel}>Fully signed</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="hourglass-outline" size={20} color={theme.color.warning} />
                <Text style={styles.summaryNum}>{hirePendingSig}</Text>
                <Text style={styles.summaryLabel}>Awaiting signatures</Text>
              </View>
            </View>
          )}

          <View style={styles.toolbar}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={theme.color.muted} />
              <TextInput
                value={hireQuery}
                onChangeText={setHireQuery}
                placeholder="Search employer, helper, job, email…"
                placeholderTextColor={theme.color.subtle}
                style={styles.searchInput}
              />
              {!!hireQuery && (
                <TouchableOpacity onPress={() => setHireQuery("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={16} color={theme.color.subtle} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Sort</Text>
                <View style={[styles.chipRow, styles.chipRowWrap]}>
                  {([
                    ["recent", "Recent"],
                    ["oldest", "Oldest"],
                    ["parent", "Employer A–Z"],
                    ["helper", "Helper A–Z"],
                    ["job", "Job A–Z"],
                  ] as const).map(([k, label]) => (
                    <TouchableOpacity
                      key={k}
                      style={[styles.chip, hireSort === k && styles.chipActive]}
                      onPress={() => setHireSort(k)}
                    >
                      <Text style={[styles.chipText, hireSort === k && styles.chipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.filterGroup, { marginLeft: 24 }]}>
                <Text style={styles.filterLabel}>Contract</Text>
                <View style={styles.chipRow}>
                  {([
                    ["all", "All"],
                    ["signed", "Fully signed"],
                    ["pending", "Awaiting"],
                  ] as const).map(([k, label]) => (
                    <TouchableOpacity
                      key={k}
                      style={[styles.chip, hireSigFilter === k && styles.chipActive]}
                      onPress={() => setHireSigFilter(k)}
                    >
                      <Text style={[styles.chipText, hireSigFilter === k && styles.chipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.hiresExportRow}>
              <TouchableOpacity
                style={[styles.exportCsvBtn, filteredHires.length === 0 && styles.smallBtnDisabled]}
                onPress={() => void exportHiresCsv()}
                disabled={filteredHires.length === 0}
                activeOpacity={0.85}
              >
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={styles.exportCsvBtnText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
          </View>

          {hireLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.color.peso} />
              <Text style={styles.centerText}>Loading hire records…</Text>
            </View>
          ) : filteredHires.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="briefcase-outline" size={56} color={theme.color.subtle} />
              <Text style={styles.emptyTitle}>No hire records match</Text>
              <Text style={styles.emptyBody}>
                Adjust search or filters, or confirm placements are marked hired in the system.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={styles.tableOuter}
            >
              <View style={[styles.table, styles.hireTableMin]}>
                <View style={[styles.tr, styles.theadRow]}>
                  {HIRE_COLS.map((c) => (
                    <Text key={c.key} style={[styles.thCell, { width: c.w }]}>
                      {c.label}
                    </Text>
                  ))}
                </View>
                <ScrollView>
                  {filteredHires.map((r, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <View
                        key={String(r.application_id)}
                        style={[styles.tr, styles.tbodyRow, isEven && styles.trEven]}
                      >
                        <View style={[styles.tdCell, { width: HIRE_COLS[0].w }]}>
                          <Text style={styles.tdDate}>{formatLastActivity(r)}</Text>
                        </View>
                        <View style={[styles.tdCell, { width: HIRE_COLS[1].w }]}>
                          <Text style={styles.tdPrimary} numberOfLines={2}>
                            {r.job_title}
                          </Text>
                        </View>
                        <View style={[styles.tdCell, { width: HIRE_COLS[2].w }]}>
                          <Text style={styles.tdPrimary} numberOfLines={1}>
                            {r.parent_name}
                          </Text>
                          <Text style={styles.tdSecondary} numberOfLines={1}>
                            {r.parent_email ?? ""}
                          </Text>
                        </View>
                        <View style={[styles.tdCell, { width: HIRE_COLS[3].w }]}>
                          <Text style={styles.tdPrimary} numberOfLines={1}>
                            {r.helper_name}
                          </Text>
                          <Text style={styles.tdSecondary} numberOfLines={1}>
                            {r.helper_email ?? ""}
                          </Text>
                        </View>
                        <View style={[styles.tdCell, { width: HIRE_COLS[4].w }]}>
                          <View style={[styles.rolePill, styles.hireStatusPill]}>
                            <Text style={styles.hireStatusText} numberOfLines={2}>
                              {r.application_status}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.tdCell, { width: HIRE_COLS[5].w }]}>
                          <Text style={styles.tdSecondary}>
                            Employer: {formatWhen(r.employer_signed_at)}
                          </Text>
                          <Text style={[styles.tdSecondary, { marginTop: 4 }]}>
                            Helper: {formatWhen(r.helper_signed_at)}
                          </Text>
                          {r.fully_signed ? (
                            <View style={[styles.detailChip, { backgroundColor: theme.color.successSoft, marginTop: 6 }]}>
                              <Text style={[styles.detailChipText, { color: theme.color.success }]}>
                                Fully signed
                              </Text>
                            </View>
                          ) : (
                            <View style={[styles.detailChip, { backgroundColor: theme.color.warningSoft, marginTop: 6 }]}>
                              <Text style={[styles.detailChipText, { color: theme.color.warning }]}>
                                Awaiting signatures
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={[styles.tdCell, { width: HIRE_COLS[6].w }]}>
                          {r.pdf_url ? (
                            <TouchableOpacity
                              style={styles.pdfBtn}
                              onPress={() => Linking.openURL(r.pdf_url!)}
                            >
                              <Ionicons name="document-text-outline" size={16} color="#fff" />
                              <Text style={styles.pdfBtnText}>PDF</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.tdSecondary}>—</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },

  segmentWrap: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  segmentBtnActive: {
    backgroundColor: theme.color.peso,
    borderColor: theme.color.peso,
    ...theme.shadow.nav,
  },
  segmentBtnText: { fontSize: 14, fontWeight: "800", color: theme.color.muted },
  segmentBtnTextActive: { color: "#fff" },

  hireTableMin: { minWidth: 1220 },
  chipRowWrap: { flexWrap: "wrap" },
  hireStatusPill: {
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.line,
    maxWidth: "100%",
  },
  hireStatusText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.color.ink,
    textTransform: "capitalize",
  },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: theme.color.peso,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pdfBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  pageTitle: { fontSize: 26, fontWeight: "900", color: theme.color.ink, letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 13, color: theme.color.muted, fontWeight: "600", marginTop: 3 },
  lastFetched: { fontSize: 11, color: theme.color.subtle, fontWeight: "600", marginTop: 4 },

  dateExportSection: { paddingHorizontal: 24, marginBottom: 12, gap: 8 },
  dateHint: { fontSize: 12, color: theme.color.muted, fontWeight: "600" },
  dateInputsRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  dateInput: {
    minWidth: 110,
    flexGrow: 1,
    maxWidth: 160,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.color.line,
    backgroundColor: theme.color.surfaceElevated,
    color: theme.color.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  dateWarn: { fontSize: 12, color: theme.color.danger, fontWeight: "700" },
  smallBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  smallBtnDisabled: { opacity: 0.45 },
  smallBtnText: { fontSize: 13, fontWeight: "800", color: theme.color.ink },
  exportCsvBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: theme.color.peso,
    ...theme.shadow.nav,
  },
  exportCsvBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  hiresExportRow: { marginTop: 12 },

  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.nav,
  },
  refreshText: { color: theme.color.ink, fontWeight: "700", fontSize: 13 },

  summaryRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.nav,
  },
  summaryNum: { fontSize: 22, fontWeight: "900", color: theme.color.ink },
  summaryLabel: { fontSize: 13, color: theme.color.muted, fontWeight: "600" },

  toolbar: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  searchInput: { flex: 1, color: theme.color.ink, fontSize: 14, fontWeight: "500" },

  filterRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  filterGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  filterLabel: { fontSize: 12, fontWeight: "800", color: theme.color.muted, letterSpacing: 0.6, textTransform: "uppercase" },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  chipActive: { backgroundColor: theme.color.peso, borderColor: theme.color.peso },
  chipText: { fontSize: 13, fontWeight: "700", color: theme.color.muted },
  chipTextActive: { color: "#fff" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 24 },
  centerText: { marginTop: 12, color: theme.color.muted, fontSize: 14 },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: "800", color: theme.color.ink },
  emptyBody: { marginTop: 8, fontSize: 14, color: theme.color.muted, textAlign: "center", lineHeight: 21 },

  tableOuter: { paddingHorizontal: 24, paddingBottom: 40 },
  table: {
    minWidth: 1060,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 16,
    overflow: "hidden",
    ...theme.shadow.card,
  },

  tr: { flexDirection: "row" },

  theadRow: {
    backgroundColor: theme.color.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.color.lineStrong,
  },
  thCell: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 11,
    fontWeight: "900",
    color: theme.color.muted,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },

  tbodyRow: {
    borderTopWidth: 1,
    borderTopColor: theme.color.line,
  },
  trEven: { backgroundColor: theme.color.surface + "88" },

  tdCell: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  tdDate: { fontSize: 12, fontWeight: "700", color: theme.color.inkMuted, lineHeight: 18 },
  tdPrimary: { fontSize: 13, fontWeight: "800", color: theme.color.ink, marginBottom: 3 },
  tdSecondary: { fontSize: 12, fontWeight: "600", color: theme.color.muted },

  rolePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  roleHelper: { backgroundColor: theme.color.helperSoft },
  roleParent: { backgroundColor: theme.color.parentSoft },
  rolePillText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  roleHelperText: { color: theme.color.helper },
  roleParentText: { color: theme.color.parent },

  detailChip: { marginTop: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  detailChipText: { fontSize: 11, fontWeight: "800" },
});
