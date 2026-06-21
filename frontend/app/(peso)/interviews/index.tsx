// app/(peso)/interviews/index.tsx — PESO interview oversight
// PHP: peso/get_interviews.php
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { theme } from "@/constants/theme";
import { fetchPesoInterviews, type InterviewStatus, type PesoInterviewRow } from "@/lib/pesoInterviewsApi";

type FilterKey = InterviewStatus | "All";
const FILTERS: FilterKey[] = ["All", "Scheduled", "Confirmed", "Completed", "Cancelled"];

const STATUS_COLOR: Record<string, string> = {
  Scheduled: theme.color.peso,
  Confirmed: "#2563EB",
  Completed: "#16A34A",
  Cancelled: "#DC2626",
  Rescheduled: "#9333EA",
};

export default function PesoInterviewsScreen() {
  const [filter, setFilter] = useState<FilterKey>("All");
  const [rows, setRows] = useState<PesoInterviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (status: FilterKey) => {
    try {
      const res = await fetchPesoInterviews(status);
      setRows(res.success && res.data ? res.data.interviews : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load(filter);
  }, [filter, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(filter);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Interviews</Text>
      <Text style={styles.sub}>Helper–employer interviews across the platform.</Text>

      <View style={styles.tabs}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.tabOn]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.tabTxt, filter === f && styles.tabTxtOn]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.color.peso} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.interview_id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          contentContainerStyle={rows.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={theme.color.subtle} />
              <Text style={styles.emptyTitle}>No interviews found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeadRow}>
                <Text style={styles.jobTitle} numberOfLines={1}>{item.job_title}</Text>
                <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[item.status] ?? theme.color.muted) + '1A' }]}>
                  <Text style={[styles.statusPillText, { color: STATUS_COLOR[item.status] ?? theme.color.muted }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.line}>Helper: {item.helper_name}</Text>
              <Text style={styles.line}>Employer: {item.employer_name}</Text>
              <Text style={styles.meta}>
                {new Date(item.interview_date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} • {item.interview_type}
              </Text>
              {item.location_or_link ? (
                <Text style={styles.meta} numberOfLines={1}>{item.location_or_link}</Text>
              ) : null}
              <Text style={styles.code}>{item.code}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: theme.color.canvasPeso },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "800", color: theme.color.ink, marginBottom: 6 },
  sub: { fontSize: 14, color: theme.color.muted, marginBottom: 14, lineHeight: 20 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  tab: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: theme.color.line, backgroundColor: "#fff" },
  tabOn: { backgroundColor: theme.color.peso, borderColor: theme.color.peso },
  tabTxt: { fontSize: 13, fontWeight: "700", color: theme.color.muted },
  tabTxtOn: { color: "#fff" },
  emptyList: { flexGrow: 1 },
  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyTitle: { fontSize: 16, color: theme.color.muted },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.color.line },
  cardHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  jobTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: theme.color.ink },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  line: { fontSize: 14, color: theme.color.ink, marginBottom: 3 },
  meta: { fontSize: 12, color: theme.color.muted, marginTop: 3 },
  code: { fontSize: 11, color: theme.color.subtle, marginTop: 8 },
});
