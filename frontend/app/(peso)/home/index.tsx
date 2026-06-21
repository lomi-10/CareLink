// app/(peso)/home/index.tsx — PESO Dashboard
// PHP: peso/get_dashboard_overview.php
// Widgets live in components/peso/dashboard/ — this file fetches data via
// usePesoDashboard() and lays them out.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { MonthlyOverviewChart } from "@/components/peso/dashboard/MonthlyOverviewChart";
import { RecentActivity } from "@/components/peso/dashboard/RecentActivity";
import { StatsRow } from "@/components/peso/dashboard/StatsRow";
import { TopCategoriesChart } from "@/components/peso/dashboard/TopCategoriesChart";
import { VerificationQueue } from "@/components/peso/dashboard/VerificationQueue";
import { usePesoDashboard } from "@/hooks/peso";
import { theme } from "@/constants/theme";

export default function PESODashboard() {
  const router = useRouter();
  const { data, loading, error, refresh } = usePesoDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const today = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>PESO Dashboard</Text>
          <Text style={styles.pageSubtitle}>PESO Ormoc City — Operations Overview</Text>
        </View>
        <View style={styles.dateChip}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.dateText}>{today}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.color.peso} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : error || !data ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.color.danger} />
          <Text style={styles.errorTitle}>Could not load dashboard</Text>
          <Text style={styles.errorBody}>{error || 'Unknown error.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void refresh()} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <StatsRow stats={data.stats} router={router} />

          <View style={styles.gridRow}>
            <VerificationQueue queue={data.verification_queue} router={router} />
            <RecentActivity activities={data.recent_activities} router={router} />
          </View>

          <View style={styles.gridRow}>
            <MonthlyOverviewChart
              points={data.monthly_overview}
              placements={data.stats.placements_this_month}
              applications={data.stats.applications_this_month}
              interviews={data.stats.interviews_this_month}
            />
            <TopCategoriesChart categories={data.top_categories} router={router} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  pageTitle: { fontSize: 26, fontWeight: "800", color: theme.color.ink, marginBottom: 4, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: theme.color.muted, fontWeight: "500" },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.nav,
  },
  dateText: { fontSize: 13, color: theme.color.muted, fontWeight: "600" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  loadingText: { marginTop: 12, color: theme.color.muted, fontSize: 14 },

  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 16 },

  errorCard: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.color.line,
    marginBottom: 24,
  },
  errorTitle: { fontSize: 17, fontWeight: "800", color: theme.color.ink, marginTop: 12, marginBottom: 8 },
  errorBody: { fontSize: 14, color: theme.color.muted, textAlign: "center", marginBottom: 16, lineHeight: 20 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.color.peso,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  retryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
