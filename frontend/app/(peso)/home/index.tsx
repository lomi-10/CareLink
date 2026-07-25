// app/(peso)/home/index.tsx — PESO Dashboard
// PHP: peso/get_dashboard_overview.php
// Widgets live in components/peso/dashboard/ — this file fetches data via
// usePesoDashboard() and lays them out on the shared PESO design system
// (theme-aware light/dark, animated, branded backdrop showing through).
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { MonthlyOverviewChart } from "@/components/peso/dashboard/MonthlyOverviewChart";
import { RecentActivity } from "@/components/peso/dashboard/RecentActivity";
import { StatsRow } from "@/components/peso/dashboard/StatsRow";
import { TopCategoriesChart } from "@/components/peso/dashboard/TopCategoriesChart";
import { VerificationQueue } from "@/components/peso/dashboard/VerificationQueue";
import { PButton, ScreenHeader } from "@/components/peso/ui";
import { usePesoTheme, font, radius, space, type PesoColors } from "@/contexts/PesoThemeContext";
import { usePesoDashboard } from "@/hooks/peso";

export default function PESODashboard() {
  const router = useRouter();
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
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
      style={{ flex: 1, backgroundColor: "transparent" }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.accent} />}
    >
      <ScreenHeader eyebrow="PESO Ormoc City · Operations" title="PESO Dashboard"
        subtitle="Today's queues, activity and placement performance at a glance."
        right={
          <View style={s.dateChip}>
            <Ionicons name="calendar" size={15} color={c.accent} />
            <Text style={s.dateText}>{today}</Text>
          </View>
        } />

      <View style={{ paddingHorizontal: space.xl, paddingTop: space.lg }}>
        {loading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={c.accent} />
            <Text style={s.loadingText}>Loading dashboard…</Text>
          </View>
        ) : error || !data ? (
          <View style={s.errorCard}>
            <Ionicons name="alert-circle-outline" size={40} color={c.bad} />
            <Text style={s.errorTitle}>Could not load dashboard</Text>
            <Text style={s.errorBody}>{error || "Unknown error."}</Text>
            <PButton label="Retry" icon="refresh" onPress={() => void refresh()} style={{ marginTop: 4 }} />
          </View>
        ) : (
          <>
            <StatsRow stats={data.stats} router={router} />

            <View style={s.gridRow}>
              <VerificationQueue queue={data.verification_queue} router={router} />
              <RecentActivity activities={data.recent_activities} router={router} />
            </View>

            <View style={s.gridRow}>
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
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  dateChip: {
    flexDirection: "row", alignItems: "center", backgroundColor: c.surface,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, gap: 6,
    borderWidth: 1, borderColor: c.line,
  },
  dateText: { fontSize: 13, color: c.muted, fontFamily: font.semibold },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  loadingText: { marginTop: 12, color: c.muted, fontSize: 14, fontFamily: font.regular },
  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 16 },
  errorCard: {
    backgroundColor: c.surface, borderRadius: radius.lg, padding: 28, alignItems: "center",
    borderWidth: 1, borderColor: c.line, marginBottom: 24, gap: 4,
  },
  errorTitle: { fontSize: 17, fontFamily: font.display, color: c.ink, marginTop: 12, marginBottom: 4 },
  errorBody: { fontSize: 14, color: c.muted, textAlign: "center", marginBottom: 12, lineHeight: 20, fontFamily: font.regular },
});
