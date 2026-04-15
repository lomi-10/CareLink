import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API_URL from "@/constants/api";
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

const ACTION_LABEL: Record<string, string> = {
  VERIFY_USER_APPROVE:    "Account Approved",
  VERIFY_USER_REJECT:     "Account Rejected",
  VERIFY_DOCUMENT_APPROVE:"Document Approved",
  VERIFY_DOCUMENT_REJECT: "Document Rejected",
  VERIFY_JOB_APPROVE:     "Job Approved",
  VERIFY_JOB_REJECT:      "Job Rejected",
};

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

export default function Reports() {
  const [loading, setLoading]         = useState(true);
  const [rows, setRows]               = useState<ReportRow[]>([]);
  const [query, setQuery]             = useState("");
  const [filterAction, setFilterAction] = useState<"All" | "User" | "Document" | "Job">("All");
  const [filterRole, setFilterRole]   = useState<"All" | "helper" | "parent">("All");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_URL}/peso/get_verification_reports.php?limit=250`);
      const text = await res.text();
      const data = JSON.parse(text);
      setRows(data.success ? (data.data || []) : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

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

  const totalApproved = filtered.filter((r) => r.action.endsWith("APPROVE")).length;
  const totalRejected = filtered.filter((r) => r.action.endsWith("REJECT")).length;

  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Verification Reports</Text>
          <Text style={styles.pageSubtitle}>
            {loading ? "Loading…" : `${filtered.length} record${filtered.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchReports} activeOpacity={0.8}>
          <Ionicons name="refresh" size={16} color={theme.color.peso} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },

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
