// app/(peso)/jobs/index.tsx — PESO Job Verification (two-pane master-detail)
// Built on the shared PESO design system (components/peso/ui): theme-aware
// (light/dark), animated list + controls, gradient header, branded backdrop.
// PHP: peso/get_jobs_for_verification.php, peso/update_job_status.php
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, FlatList, Modal, Platform, Pressable, RefreshControl,
  ScrollView, Text, TextInput, useWindowDimensions, View,
} from "react-native";
import { JobDetailPanel } from "@/components/peso/JobDetailPanel";
import {
  usePesoTheme, ScreenHeader, StatRow, StatTile, ListRow, Pill, EmptyState, IconButton, AnimateIn, layout, font, radius, space,
  type Tone,
} from "@/components/peso/ui";
import API_URL from "../../../constants/api";

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
const STATUS_TONE: Record<string, Tone> = { Pending: "warn", Open: "ok", Rejected: "bad", Closed: "neutral" };
const STATUS_LABEL = (s: string) => (s === "Open" ? "Approved" : s);

export default function JobVerification() {
  const { c } = usePesoTheme();
  const { width } = useWindowDimensions();
  const twoPane = Platform.OS === "web" && width >= 1024;

  const [jobs, setJobs] = useState<VerificationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilter] = useState<string>("All");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

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
    const map: Record<string, number> = { All: jobs.length };
    for (const st of ["Pending", "Open", "Rejected", "Closed"]) map[st] = jobs.filter((j) => j.status === st).length;
    return map;
  }, [jobs]);

  // Keep a valid selection on wide screens.
  useEffect(() => {
    if (twoPane && !selectedJobId && filtered.length) setSelectedJobId(filtered[0].job_post_id);
  }, [twoPane, filtered, selectedJobId]);

  const onStatusChanged = () => { fetchJobs(); };

  const renderJobCard = ({ item, index }: { item: VerificationJob; index: number }) => {
    const category = item.custom_category || item.category_name || "General";
    const posted = item.posted_at ? new Date(item.posted_at).toLocaleDateString("en-PH", { dateStyle: "medium" }) : null;
    return (
      <ListRow selected={twoPane && selectedJobId === item.job_post_id} onPress={() => setSelectedJobId(item.job_post_id)} delay={Math.min(index * 45, 320)}>
        <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="briefcase" size={21} color={c.accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: c.ink }} numberOfLines={1}>{item.title || "Untitled Job"}</Text>
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: c.accentInk }} numberOfLines={1}>{category}</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
            <Meta icon="person-outline" text={item.parent_name} />
            {!!posted && <Meta icon="calendar-outline" text={`Posted ${posted}`} />}
          </View>
        </View>
        <Pill label={STATUS_LABEL(item.status)} tone={STATUS_TONE[item.status] ?? "neutral"} />
        <Ionicons name="chevron-forward" size={16} color={c.subtle} />
      </ListRow>
    );
  };

  const Meta = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0, flexShrink: 1 }}>
      <Ionicons name={icon} size={12} color={c.subtle} />
      <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle }} numberOfLines={1}>{text}</Text>
    </View>
  );

  const leftColumn = (
    <View style={twoPane ? layout.leftPane : layout.flex1}>
      <ScreenHeader eyebrow="Verification & Compliance" title="Job Verification"
        subtitle={loading ? "Loading…" : `${counts.Pending} pending · ${counts.All} total posting${counts.All !== 1 ? "s" : ""}`}
        right={<IconButton icon="refresh" tone="accent" onPress={fetchJobs} />} />

      <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
        {!loading && (
          <StatRow>
            <StatTile label="Total" value={counts.All} tone="accent" sub="postings" delay={0} />
            <StatTile label="Pending" value={counts.Pending} tone="warn" sub="to review" delay={60} />
            <StatTile label="Approved" value={counts.Open} tone="ok" sub="live" delay={120} />
            <StatTile label="Rejected" value={counts.Rejected} tone="bad" sub="declined" delay={180} />
          </StatRow>
        )}

        {/* Search */}
        <AnimateIn delay={215} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 13, paddingVertical: 10, marginTop: space.lg }}>
          <Ionicons name="search" size={16} color={c.subtle} />
          <TextInput style={{ flex: 1, fontFamily: font.regular, fontSize: 14, color: c.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) }}
            placeholder="Search jobs by title, employer or category…" placeholderTextColor={c.subtle} value={search} onChangeText={setSearch} />
          {!!search && <Pressable onPress={() => setSearch("")} hitSlop={10}><Ionicons name="close-circle" size={16} color={c.subtle} /></Pressable>}
        </AnimateIn>

        {/* Filter chips */}
        <AnimateIn delay={260}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: space.md }} contentContainerStyle={{ gap: 8 }}>
          {STATUS_FILTERS.map((st) => {
            const active = filterStatus === st;
            const count = st === "All" ? counts.All : counts[st] ?? 0;
            return (
              <Pressable key={st} onPress={() => setFilter(st)}
                style={({ hovered }: any) => [{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, transitionDuration: "140ms", backgroundColor: active ? c.accent : hovered ? c.accentSoft : c.surface, borderWidth: 1, borderColor: active ? c.accent : hovered ? c.accent : c.line } as any]}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: active ? "#fff" : c.muted }}>{st === "All" ? "All statuses" : STATUS_LABEL(st)}</Text>
                <View style={{ minWidth: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: active ? "rgba(255,255,255,0.25)" : c.sunken, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontFamily: font.semibold, color: active ? "#fff" : c.muted }}>{count}</Text></View>
              </Pressable>
            );
          })}
        </ScrollView>
        </AnimateIn>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 50 }} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="briefcase-outline" title="No jobs found"
          sub={search ? "Try a different search or clear filters." : "No job postings match this filter right now."} />
      ) : (
        <FlatList style={layout.flex1} data={filtered} keyExtractor={(i) => String(i.job_post_id)} renderItem={renderJobCard}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 40, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />} />
      )}
    </View>
  );

  return (
    <View style={layout.page(c.canvas)}>
      <View style={twoPane ? layout.splitRow : layout.flex1}>
        {leftColumn}
        {twoPane && (
          <View style={layout.rightPane(c.line, c.surface)}>
            <JobDetailPanel jobId={selectedJobId} onStatusChanged={onStatusChanged} />
          </View>
        )}
      </View>

      {!twoPane && (
        <Modal visible={!!selectedJobId} animationType="slide" transparent onRequestClose={() => setSelectedJobId(null)}>
          <View style={{ flex: 1, backgroundColor: c.canvas, paddingTop: 40 }}>
            <JobDetailPanel jobId={selectedJobId} onStatusChanged={onStatusChanged} onClose={() => setSelectedJobId(null)} showClose />
          </View>
        </Modal>
      )}
    </View>
  );
}
