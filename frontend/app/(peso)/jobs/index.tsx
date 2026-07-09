// app/(peso)/jobs/index.tsx — PESO Job Verification (two-pane master-detail)
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from "react-native";
import API_URL from "../../../constants/api";
import { theme } from "../../../constants/theme";
import { JobDetailPanel } from "../../../components/peso/JobDetailPanel";

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
}

const STATUS_FILTERS = ["All", "Pending", "Open", "Rejected", "Closed"] as const;
const CFG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  Pending:  { label: "Pending",  color: theme.color.warning, bg: theme.color.warningSoft, icon: "time" },
  Open:     { label: "Approved", color: theme.color.success, bg: theme.color.successSoft, icon: "checkmark-circle" },
  Rejected: { label: "Rejected", color: theme.color.danger,  bg: theme.color.dangerSoft,  icon: "close-circle" },
  Closed:   { label: "Closed",   color: theme.color.muted,   bg: theme.color.surface,     icon: "archive" },
};

export default function JobVerification() {
  const [jobs, setJobs] = useState<VerificationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilter] = useState<string>("All");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const { width } = useWindowDimensions();
  const wide = width >= 1000;

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/peso/get_jobs_for_verification.php`);
      const data = await res.json();
      if (data.success) setJobs(data.data ?? []);
    } catch (e) { console.error("JobVerification fetch:", e); } finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchJobs(); setRefreshing(false); };

  const filtered = useMemo(() => {
    let list = jobs;
    if (filterStatus !== "All") list = list.filter((j) => j.status === filterStatus);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((j) =>
      j.title.toLowerCase().includes(q) ||
      j.parent_name.toLowerCase().includes(q) ||
      (j.custom_category || j.category_name || "").toLowerCase().includes(q));
    return list;
  }, [jobs, filterStatus, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: jobs.length };
    for (const st of ["Pending", "Open", "Rejected", "Closed"]) c[st] = jobs.filter((j) => j.status === st).length;
    return c;
  }, [jobs]);

  // Keep a valid selection on wide screens.
  useEffect(() => {
    if (wide && !selectedJobId && filtered.length) setSelectedJobId(filtered[0].job_post_id);
  }, [wide, filtered, selectedJobId]);

  const onStatusChanged = () => { fetchJobs(); };

  const renderJobCard = ({ item }: { item: VerificationJob }) => {
    const cfg = CFG[item.status] ?? CFG.Pending;
    const active = selectedJobId === item.job_post_id;
    return (
      <TouchableOpacity
        style={[styles.jobCard, active && styles.jobCardActive]}
        onPress={() => setSelectedJobId(item.job_post_id)}
        activeOpacity={0.85}
      >
        <View style={[styles.jobIcon, { backgroundColor: cfg.bg }]}><Ionicons name="briefcase" size={22} color={cfg.color} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title || "Untitled Job"}</Text>
          <Text style={styles.jobCat} numberOfLines={1}>{item.custom_category || item.category_name || "General"}</Text>
          <View style={styles.jobMeta}><Ionicons name="location-outline" size={12} color={theme.color.muted} /><Text style={styles.jobMetaText} numberOfLines={1}>{item.parent_name}</Text></View>
          <View style={styles.jobMeta}><Ionicons name="calendar-outline" size={12} color={theme.color.muted} /><Text style={styles.jobMetaText}>Posted {new Date(item.posted_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}</Text></View>
        </View>
        <View style={[styles.pill, { backgroundColor: cfg.bg }]}><Text style={[styles.pillText, { color: cfg.color }]}>{cfg.label}</Text></View>
      </TouchableOpacity>
    );
  };

  const listPane = (
    <View style={wide ? styles.listPaneWide : styles.listPaneFull}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={theme.color.muted} />
        <TextInput style={styles.searchInput} placeholder="Search jobs…" value={search} onChangeText={setSearch} placeholderTextColor={theme.color.subtle} />
        {!!search && <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}><Ionicons name="close-circle" size={16} color={theme.color.subtle} /></TouchableOpacity>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map((st) => {
          const active = filterStatus === st;
          return (
            <TouchableOpacity key={st} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(st)} activeOpacity={0.8}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{st === "Open" ? "Approved" : st}</Text>
              <View style={[styles.chipBadge, active && styles.chipBadgeActive]}><Text style={[styles.chipBadgeText, active && { color: "#fff" }]}>{counts[st] ?? 0}</Text></View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.color.peso} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}><Ionicons name="briefcase-outline" size={52} color={theme.color.subtle} /><Text style={styles.emptyTitle}>No jobs found</Text></View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderJobCard}
          keyExtractor={(i) => String(i.job_post_id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.peso} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Job Verification</Text>
          <Text style={styles.pageSubtitle}>Review and approve parent job postings</Text>
        </View>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        {[
          { label: "Total Jobs", count: counts.All, color: theme.color.peso, icon: "briefcase" as const, bg: theme.color.pesoSoft },
          { label: "Pending", count: counts.Pending, color: theme.color.warning, icon: "time" as const, bg: theme.color.warningSoft },
          { label: "Approved", count: counts.Open, color: theme.color.success, icon: "checkmark-circle" as const, bg: theme.color.successSoft },
          { label: "Rejected", count: counts.Rejected, color: theme.color.danger, icon: "close-circle" as const, bg: theme.color.dangerSoft },
        ].map((st) => (
          <View key={st.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: st.bg }]}><Ionicons name={st.icon} size={20} color={st.color} /></View>
            <View>
              <Text style={styles.statCount}>{st.count ?? 0}</Text>
              <Text style={styles.statLabel}>{st.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Body */}
      {wide ? (
        <View style={styles.body}>
          {listPane}
          <View style={{ flex: 1 }}>
            <JobDetailPanel jobId={selectedJobId} onStatusChanged={onStatusChanged} />
          </View>
        </View>
      ) : (
        <>
          {listPane}
          <Modal visible={!!selectedJobId} animationType="slide" transparent onRequestClose={() => setSelectedJobId(null)}>
            <View style={styles.modalWrap}>
              <JobDetailPanel jobId={selectedJobId} onStatusChanged={onStatusChanged} onClose={() => setSelectedJobId(null)} showClose />
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.color.canvasPeso },
  pageHeader: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 8 },
  pageTitle: { fontSize: 26, fontWeight: "800", color: theme.color.ink, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: theme.color.muted, marginTop: 2 },

  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 24, paddingVertical: 12 },
  statCard: { flex: 1, minWidth: 150, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.color.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.color.line, padding: 14 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statCount: { fontSize: 22, fontWeight: "800", color: theme.color.ink },
  statLabel: { fontSize: 12, color: theme.color.muted, fontWeight: "600" },

  body: { flex: 1, flexDirection: "row", gap: 16, paddingHorizontal: 24, paddingBottom: 20, paddingTop: 4 },
  listPaneWide: { width: 360, backgroundColor: theme.color.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.color.line, overflow: "hidden" },
  listPaneFull: { flex: 1 },

  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.color.canvasPeso, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, margin: 12, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, color: theme.color.ink },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  chip: { flexDirection: "row", alignItems: "center", height: 34, gap: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: theme.color.canvasPeso, borderWidth: 1, borderColor: theme.color.line },
  chipActive: { backgroundColor: theme.color.peso, borderColor: theme.color.peso },
  chipText: { fontSize: 12.5, fontWeight: "700", color: theme.color.muted },
  chipTextActive: { color: "#fff" },
  chipBadge: { backgroundColor: theme.color.line, borderRadius: 10, paddingHorizontal: 6, minWidth: 18, alignItems: "center" },
  chipBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  chipBadgeText: { fontSize: 11, fontWeight: "800", color: theme.color.muted },

  jobCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.color.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: theme.color.line },
  jobCardActive: { borderColor: theme.color.peso, borderWidth: 2, backgroundColor: theme.color.pesoSoft },
  jobIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  jobTitle: { fontSize: 14, fontWeight: "800", color: theme.color.ink },
  jobCat: { fontSize: 12, fontWeight: "700", color: theme.color.peso, marginBottom: 4 },
  jobMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  jobMetaText: { fontSize: 11.5, color: theme.color.muted, flexShrink: 1 },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  pillText: { fontSize: 11, fontWeight: "800" },

  centered: { padding: 40, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: theme.color.ink },
  modalWrap: { flex: 1, backgroundColor: theme.color.canvasPeso, paddingTop: 40 },
});
