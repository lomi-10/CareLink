// app/(PESO)/job_verification.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API_URL from "../../constants/api";
import { theme } from "../../constants/theme";
import { JobVerificationModal } from "../../components/peso/JobVerificationModal";

export interface VerificationJob {
  job_post_id: number;
  parent_name: string;
  parent_email: string;
  title: string;
  category_name: string;
  custom_category: string;
  salary_offered: number;
  salary_period: string;
  status: string;
  posted_at: string;
  verified_at: string | null;
  verified_by_name: string | null;
  rejection_reason: string | null;
}

const STATUS_FILTERS = ["All", "Pending", "Open", "Rejected", "Closed"] as const;

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  Pending:  { label: "Pending",  color: theme.color.warning, bg: theme.color.warningSoft,  icon: "time" },
  Open:     { label: "Approved", color: theme.color.success, bg: theme.color.successSoft,  icon: "checkmark-circle" },
  Rejected: { label: "Rejected", color: theme.color.danger,  bg: theme.color.dangerSoft,   icon: "close-circle" },
  Closed:   { label: "Closed",   color: theme.color.muted,   bg: theme.color.surface,      icon: "archive" },
};

export default function JobVerification() {
  const [jobs, setJobs]             = useState<VerificationJob[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilter]   = useState<string>("Pending");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_URL}/peso/get_jobs_for_verification.php`);
      const data = await res.json();
      if (data.success) setJobs(data.data ?? []);
    } catch (e) {
      console.error("JobVerification fetch:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let list = jobs;
    if (filterStatus !== "All") list = list.filter((j) => j.status === filterStatus);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.parent_name.toLowerCase().includes(q) ||
        (j.custom_category || j.category_name || "").toLowerCase().includes(q)
    );
    return list;
  }, [jobs, filterStatus, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: jobs.length };
    for (const s of ["Pending", "Open", "Rejected", "Closed"]) {
      c[s] = jobs.filter((j) => j.status === s).length;
    }
    return c;
  }, [jobs]);

  const pendingCount = counts["Pending"] ?? 0;

  const renderJobCard = ({ item }: { item: VerificationJob }) => {
    const cfg = STATUS_CFG[item.status] ?? STATUS_CFG["Pending"];
    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => setSelectedJobId(item.job_post_id)}
        activeOpacity={0.85}
      >
        {/* Icon */}
        <View style={[styles.jobIconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name="briefcase" size={26} color={cfg.color} />
        </View>

        {/* Main */}
        <View style={styles.jobMain}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title || "Untitled Job"}</Text>
          <Text style={styles.jobCategory} numberOfLines={1}>
            {item.custom_category || item.category_name || "General"}
          </Text>

          <View style={styles.jobMeta}>
            <Ionicons name="person-outline" size={13} color={theme.color.muted} />
            <Text style={styles.jobMetaText}>{item.parent_name}</Text>
          </View>

          <View style={styles.jobMeta}>
            <Ionicons name="cash-outline" size={13} color={theme.color.success} />
            <Text style={[styles.jobMetaText, { color: theme.color.success, fontWeight: "700" }]}>
              ₱{Number(item.salary_offered).toLocaleString()} / {item.salary_period}
            </Text>
          </View>

          <View style={styles.jobMeta}>
            <Ionicons name="calendar-outline" size={13} color={theme.color.muted} />
            <Text style={styles.jobMetaText}>
              Posted {new Date(item.posted_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}
            </Text>
          </View>
        </View>

        {/* Status + chevron */}
        <View style={styles.jobRight}>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={13} color={cfg.color} />
            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.color.subtle} style={{ marginTop: 8 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Page Header ── */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Job Verification</Text>
          <Text style={styles.pageSubtitle}>Review and approve parent job postings</Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      {/* ── Summary Stats ── */}
      <View style={styles.statsRow}>
        {[
          { label: "Total",    count: counts["All"],      color: theme.color.peso },
          { label: "Pending",  count: counts["Pending"],  color: theme.color.warning },
          { label: "Approved", count: counts["Open"],     color: theme.color.success },
          { label: "Rejected", count: counts["Rejected"], color: theme.color.danger },
        ].map((s) => (
          <View key={s.label} style={styles.statTile}>
            <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Search ── */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={theme.color.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, employer, category…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={theme.color.subtle}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.color.subtle} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map((s) => {
            const active = filterStatus === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(s)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {s === "Open" ? "Approved" : s}
                </Text>
                <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
                  <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
                    {counts[s] ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.color.peso} />
          <Text style={styles.loadingText}>Loading job posts…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="briefcase-outline" size={64} color={theme.color.subtle} />
          <Text style={styles.emptyTitle}>No job posts found</Text>
          <Text style={styles.emptyBody}>
            {filterStatus !== "All"
              ? `No ${STATUS_CFG[filterStatus]?.label ?? filterStatus} jobs match your search.`
              : "No job postings have been submitted yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderJobCard}
          keyExtractor={(item) => String(item.job_post_id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.peso} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Modal ── */}
      <JobVerificationModal
        visible={!!selectedJobId}
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onStatusChanged={fetchJobs}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: theme.color.canvasPeso },
  pageHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, backgroundColor: theme.color.surface, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  pageTitle:     { fontSize: 26, fontWeight: "800", color: theme.color.ink, letterSpacing: -0.5 },
  pageSubtitle:  { fontSize: 13, color: theme.color.muted, marginTop: 2 },
  pendingBadge:  { backgroundColor: theme.color.warning, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  pendingBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  statsRow:  { flexDirection: "row", backgroundColor: theme.color.surface, borderBottomWidth: 1, borderBottomColor: theme.color.line, paddingVertical: 12 },
  statTile:  { flex: 1, alignItems: "center" },
  statCount: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: theme.color.muted, marginTop: 2, fontWeight: "600", textTransform: "uppercase" },

  searchSection: { backgroundColor: theme.color.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  searchBar:     { flexDirection: "row", alignItems: "center", backgroundColor: theme.color.canvasPeso, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 10, marginBottom: 10 },
  searchInput:   { flex: 1, fontSize: 14, color: theme.color.ink },
  filterRow:     { flexDirection: "row", gap: 8, paddingBottom: 10 },
  chip:          { flexDirection: "row", alignItems: "center", paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: theme.color.canvasPeso, gap: 6, borderWidth: 1, borderColor: theme.color.line },
  chipActive:    { backgroundColor: theme.color.peso, borderColor: theme.color.peso },
  chipText:      { fontSize: 13, fontWeight: "600", color: theme.color.muted },
  chipTextActive:{ color: "#fff" },
  chipBadge:     { backgroundColor: theme.color.line, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: "center" },
  chipBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  chipBadgeText: { fontSize: 11, fontWeight: "700", color: theme.color.muted },
  chipBadgeTextActive: { color: "#fff" },

  listContent: { padding: 16, paddingBottom: 48 },
  jobCard:     { flexDirection: "row", alignItems: "flex-start", backgroundColor: theme.color.surface, borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  jobIconWrap: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 },
  jobMain:     { flex: 1 },
  jobTitle:    { fontSize: 15, fontWeight: "700", color: theme.color.ink, marginBottom: 2 },
  jobCategory: { fontSize: 12, fontWeight: "600", color: theme.color.peso, marginBottom: 6 },
  jobMeta:     { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  jobMetaText: { fontSize: 12, color: theme.color.muted },
  jobRight:    { alignItems: "flex-end", flexShrink: 0, marginLeft: 8 },
  statusPill:  { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  centered:     { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText:  { marginTop: 12, color: theme.color.muted, fontSize: 14 },
  emptyTitle:   { fontSize: 18, fontWeight: "700", color: theme.color.ink, marginTop: 16, marginBottom: 6 },
  emptyBody:    { fontSize: 14, color: theme.color.muted, textAlign: "center" },
});
