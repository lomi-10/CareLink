// app/(PESO)/home.tsx
// PESO Dashboard Home - Shows statistics and quick actions
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import API_URL from "../../constants/api";
import { theme } from "../../constants/theme";

export default function PESODashboard() {
  const router = useRouter();

  // ADDED: pending_jobs and total_jobs to the state
  const [stats, setStats] = useState({
    total_helpers: 0,
    pending_helpers: 0,
    verified_helpers: 0,
    total_parents: 0,
    pending_documents: 0,
    verified_documents: 0,
    pending_jobs: 0,
    total_jobs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/peso/get_dashboard_stats.php`);
      const text = await response.text();
      const data = JSON.parse(text);
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardStats();
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.pageSubtitle}>PESO Admin Overview</Text>
        </View>
        <View style={styles.dateChip}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.dateText}>{new Date().toLocaleDateString()}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.color.peso} />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      ) : (
        <>
          {/* Quick Stats */}
          <Text style={styles.sectionLabel}>HELPER VERIFICATION</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIconBg, { backgroundColor: '#FFF4E5' }]}>
                  <Ionicons name="people" size={28} color="#FF9500" />
                </View>
                <Ionicons name="trending-up" size={20} color="#34C759" />
              </View>
              <Text style={styles.statNumber}>{stats.total_helpers}</Text>
              <Text style={styles.statLabel}>Total Helpers</Text>
            </View>

            <TouchableOpacity 
              style={[styles.statCard, styles.statCardAction]}
              onPress={() => router.push("/(peso)/user_verification")}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconBg, { backgroundColor: '#FFF4E5' }]}>
                  <Ionicons name="time" size={28} color="#FF9500" />
                </View>
                {stats.pending_helpers > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{stats.pending_helpers}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.statNumber}>{stats.pending_helpers}</Text>
              <Text style={styles.statLabel}>Pending Verification</Text>
              <View style={styles.actionArrow}>
                <Ionicons name="arrow-forward" size={16} color="#FF9500" />
              </View>
            </TouchableOpacity>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.statIconBg, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                </View>
              </View>
              <Text style={styles.statNumber}>{stats.verified_helpers}</Text>
              <Text style={styles.statLabel}>Verified Helpers</Text>
            </View>
          </View>

          {/* NEW: Job Posts Stats */}
          <Text style={styles.sectionLabel}>JOB POSTS REVIEW</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity 
              style={[styles.statCard, styles.statCardAction]}
              onPress={() => router.push("/(peso)/job_verification")}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconBg, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="briefcase" size={28} color="#0284C7" />
                </View>
                {stats.pending_jobs > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#0284C7' }]}>
                    <Text style={styles.badgeText}>{stats.pending_jobs}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.statNumber}>{stats.pending_jobs}</Text>
              <Text style={styles.statLabel}>Pending Jobs</Text>
              <View style={styles.actionArrow}>
                <Ionicons name="arrow-forward" size={16} color="#0284C7" />
              </View>
            </TouchableOpacity>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.statIconBg, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="checkmark-done" size={28} color="#34C759" />
                </View>
              </View>
              <Text style={styles.statNumber}>{stats.total_jobs}</Text>
              <Text style={styles.statLabel}>Total Active Jobs</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push("/(peso)/user_verification")}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FFF4E5' }]}>
                <Ionicons name="people" size={24} color="#FF9500" />
              </View>
              <Text style={styles.actionTitle}>Review Users</Text>
              <Text style={styles.actionSubtitle}>Verify helper profiles</Text>
            </TouchableOpacity>

            {/* NEW: Quick Action for Job Verification */}
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push("/(peso)/job_verification")}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="briefcase" size={24} color="#0284C7" />
              </View>
              <Text style={styles.actionTitle}>Review Jobs</Text>
              <Text style={styles.actionSubtitle}>Verify parent posts</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push("/(peso)/create_peso_user")}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="person-add" size={24} color="#34C759" />
              </View>
              <Text style={styles.actionTitle}>Create Account</Text>
              <Text style={styles.actionSubtitle}>Add PESO user</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push("/(peso)/reports")}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="bar-chart" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.actionTitle}>View Reports</Text>
              <Text style={styles.actionSubtitle}>Analytics & stats</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Activity Placeholder */}
          <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
          <View style={styles.activityCard}>
            <View style={styles.placeholderBox}>
              <Ionicons name="time-outline" size={48} color="#ccc" />
              <Text style={styles.placeholderText}>Recent verification activity will appear here</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: "800", color: theme.color.ink, marginBottom: 4, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 15, color: theme.color.muted, fontWeight: "500" },
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.color.subtle,
    marginBottom: 16,
    marginTop: 8,
    letterSpacing: 1.4,
  },
  statsGrid: { flexDirection: "row", gap: 16, flexWrap: "wrap", marginBottom: 32 },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: theme.color.surfaceElevated,
    padding: 20,
    borderRadius: theme.radius.lg,
    ...theme.shadow.card,
    position: "relative",
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  statCardPrimary: { borderLeftWidth: 4, borderLeftColor: theme.color.peso },
  statCardAction: { borderWidth: 1, borderColor: theme.color.pesoSoft },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  statIconBg: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 24, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statNumber: { fontSize: 32, fontWeight: "800", color: theme.color.ink, marginBottom: 4 },
  statLabel: { fontSize: 14, color: theme.color.muted, fontWeight: "600" },
  actionArrow: { position: 'absolute', bottom: 16, right: 16 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 },
  actionCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: theme.color.surfaceElevated,
    padding: 20,
    borderRadius: theme.radius.lg,
    ...theme.shadow.card,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  actionIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionTitle: { fontSize: 15, fontWeight: "800", color: theme.color.ink, marginBottom: 4, textAlign: "center" },
  actionSubtitle: { fontSize: 12, color: theme.color.muted, textAlign: "center" },
  activityCard: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: 24,
    ...theme.shadow.card,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  placeholderBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  placeholderText: { color: '#999', fontSize: 14, marginTop: 12 },
});