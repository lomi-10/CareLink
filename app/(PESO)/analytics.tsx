// app/(PESO)/analytics.tsx
// Analytics & Insights - Job trends, skills demand, demographics
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import API_URL from "../../constants/api";
import { withPesoStaffQuery } from "@/lib/pesoStaffQuery";

function safePct(part: number, whole: number): number {
  const w = Number(whole);
  if (!Number.isFinite(w) || w <= 0) return 0;
  const p = Number(part);
  if (!Number.isFinite(p)) return 0;
  return Math.min(100, Math.round((p / w) * 100));
}

function EmptyHint({ message }: { message: string }) {
  return (
    <View style={{ paddingVertical: 28, alignItems: "center", paddingHorizontal: 16 }}>
      <Ionicons name="folder-open-outline" size={36} color="#999" />
      <Text style={{ marginTop: 10, color: "#666", fontSize: 14, textAlign: "center" }}>{message}</Text>
    </View>
  );
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"jobs" | "skills" | "demographics">("jobs");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const url = await withPesoStaffQuery(`${API_URL}/peso/get_analytics.php`);
      const response = await fetch(url);
      const text = await response.text();
      let data: { success?: boolean; data?: any; message?: string };
      try {
        data = JSON.parse(text);
      } catch {
        setFetchError("Invalid response from server.");
        setAnalytics(null);
        return;
      }

      if (data.success && data.data) {
        setAnalytics(data.data);
      } else {
        setAnalytics(null);
        setFetchError(data.message || "Could not load analytics.");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setFetchError("Network error while loading analytics.");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const maxCategoryHelpers = Math.max(
    0,
    ...((analytics?.top_categories as any[]) ?? []).map((c: any) => Number(c?.helper_count ?? 0)),
  );
  const categoryBarDen = Math.max(maxCategoryHelpers, 1);

  const totalHelpersDemo = Math.max(Number(analytics?.total_helpers ?? 0), 1);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Analytics & Insights</Text>
            <Text style={styles.pageSubtitle}>Market trends and statistics</Text>
          </View>
        </View>
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={44} color="#FF3B30" />
          <Text style={styles.errorTitle}>Could not load analytics</Text>
          <Text style={styles.errorBody}>{fetchError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void fetchAnalytics()} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Analytics & Insights</Text>
          <Text style={styles.pageSubtitle}>Market trends and statistics</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "jobs" && styles.tabActive]}
          onPress={() => setSelectedTab("jobs")}
        >
          <Ionicons
            name="briefcase"
            size={20}
            color={selectedTab === "jobs" ? "#FF9500" : "#666"}
          />
          <Text style={[styles.tabText, selectedTab === "jobs" && styles.tabTextActive]}>
            Jobs & Categories
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "skills" && styles.tabActive]}
          onPress={() => setSelectedTab("skills")}
        >
          <Ionicons
            name="star"
            size={20}
            color={selectedTab === "skills" ? "#FF9500" : "#666"}
          />
          <Text style={[styles.tabText, selectedTab === "skills" && styles.tabTextActive]}>
            Skills Demand
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "demographics" && styles.tabActive]}
          onPress={() => setSelectedTab("demographics")}
        >
          <Ionicons
            name="people"
            size={20}
            color={selectedTab === "demographics" ? "#FF9500" : "#666"}
          />
          <Text
            style={[styles.tabText, selectedTab === "demographics" && styles.tabTextActive]}
          >
            Demographics
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {selectedTab === "jobs" && (
          <>
            {/* Popular Job Categories */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trending-up" size={22} color="#FF9500" />
                <Text style={styles.sectionTitle}>Most Popular Job Categories</Text>
              </View>
              {analytics?.top_categories?.length ? (
              analytics.top_categories.map((category: any, index: number) => (
                <View key={category.category_id} style={styles.rankItem}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankName}>{category.category_name}</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${safePct(Number(category.helper_count ?? 0), categoryBarDen)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.rankCount}>
                    <Text style={styles.rankCountNumber}>{category.helper_count}</Text>
                    <Text style={styles.rankCountLabel}>helpers</Text>
                  </View>
                </View>
              ))
              ) : (
                <EmptyHint message="No helper category data yet." />
              )}
            </View>

            {/* Specific Jobs */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={22} color="#007AFF" />
                <Text style={styles.sectionTitle}>Most In-Demand Jobs</Text>
              </View>
              {analytics?.top_jobs?.length ? (
              analytics.top_jobs.map((job: any, index: number) => (
                <View key={job.job_id} style={styles.jobItem}>
                  <View style={styles.jobLeft}>
                    <Text style={styles.jobRank}>{index + 1}</Text>
                    <View>
                      <Text style={styles.jobTitle}>{job.job_title}</Text>
                      <Text style={styles.jobCategory}>{job.category_name}</Text>
                    </View>
                  </View>
                  <View style={styles.jobRight}>
                    <Text style={styles.jobCount}>{job.helper_count}</Text>
                    <Ionicons name="briefcase-outline" size={16} color="#999" />
                  </View>
                </View>
              ))
              ) : (
                <EmptyHint message="No open job postings to rank yet." />
              )}
            </View>
          </>
        )}

        {selectedTab === "skills" && (
          <>
            {/* Top Skills */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="star" size={22} color="#FFC107" />
                <Text style={styles.sectionTitle}>Most Common Skills</Text>
              </View>
              {analytics?.top_skills?.length ? (
              analytics.top_skills.map((skill: any, index: number) => (
                <View key={skill.skill_id} style={styles.skillItem}>
                  <View style={styles.skillLeft}>
                    <View
                      style={[
                        styles.skillBadge,
                        { backgroundColor: index < 3 ? "#FFF4E5" : "#F8F9FA" },
                      ]}
                    >
                      <Ionicons
                        name={index < 3 ? "star" : "star-outline"}
                        size={20}
                        color={index < 3 ? "#FF9500" : "#999"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.skillName}>{skill.skill_name}</Text>
                      <Text style={styles.skillJob}>{skill.job_title}</Text>
                    </View>
                  </View>
                  <View style={styles.skillRight}>
                    <Text style={styles.skillCount}>{skill.helper_count}</Text>
                    <Text style={styles.skillLabel}>helpers</Text>
                  </View>
                </View>
              ))
              ) : (
                <EmptyHint message="No skills data recorded yet." />
              )}
            </View>

            {/* Skills Gap Analysis */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="analytics" size={22} color="#9C27B0" />
                <Text style={styles.sectionTitle}>Skills Coverage</Text>
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {analytics?.skills_stats?.avg_skills_per_helper || 0}
                  </Text>
                  <Text style={styles.statLabel}>Avg Skills per Helper</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {analytics?.skills_stats?.total_unique_skills || 0}
                  </Text>
                  <Text style={styles.statLabel}>Total Skills Available</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {selectedTab === "demographics" && (
          <>
            {/* Employment Type Preferences */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="home" size={22} color="#34C759" />
                <Text style={styles.sectionTitle}>Employment Type Preferences</Text>
              </View>
              {analytics?.employment_types?.length ? (
              analytics.employment_types.map((type: any) => (
                <View key={type.employment_type} style={styles.demoItem}>
                  <View style={styles.demoInfo}>
                    <Text style={styles.demoLabel}>{type.employment_type}</Text>
                    <View style={styles.demoBar}>
                      <View
                        style={[
                          styles.demoBarFill,
                          {
                            width: `${safePct(Number(type.count ?? 0), totalHelpersDemo)}%`,
                            backgroundColor: "#34C759",
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.demoCount}>
                    <Text style={styles.demoNumber}>{type.count}</Text>
                    <Text style={styles.demoPercent}>
                      {safePct(Number(type.count ?? 0), totalHelpersDemo)}%
                    </Text>
                  </View>
                </View>
              ))
              ) : (
                <EmptyHint message="No employment-type breakdown yet." />
              )}
            </View>

            {/* Work Schedule */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={22} color="#007AFF" />
                <Text style={styles.sectionTitle}>Work Schedule Preferences</Text>
              </View>
              {analytics?.work_schedules?.length ? (
              analytics.work_schedules.map((schedule: any) => (
                <View key={schedule.work_schedule} style={styles.demoItem}>
                  <View style={styles.demoInfo}>
                    <Text style={styles.demoLabel}>{schedule.work_schedule}</Text>
                    <View style={styles.demoBar}>
                      <View
                        style={[
                          styles.demoBarFill,
                          {
                            width: `${safePct(Number(schedule.count ?? 0), totalHelpersDemo)}%`,
                            backgroundColor: "#007AFF",
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.demoCount}>
                    <Text style={styles.demoNumber}>{schedule.count}</Text>
                    <Text style={styles.demoPercent}>
                      {safePct(Number(schedule.count ?? 0), totalHelpersDemo)}%
                    </Text>
                  </View>
                </View>
              ))
              ) : (
                <EmptyHint message="No work-schedule breakdown yet." />
              )}
            </View>

            {/* Experience Distribution */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={22} color="#FF9500" />
                <Text style={styles.sectionTitle}>Experience Levels</Text>
              </View>
              <View style={styles.experienceGrid}>
                {(analytics?.experience_ranges ?? []).map((range: any) => (
                  <View key={range.range} style={styles.experienceCard}>
                    <Text style={styles.experienceRange}>{range.range}</Text>
                    <Text style={styles.experienceCount}>{range.count}</Text>
                    <Text style={styles.experienceLabel}>helpers</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Geographic Distribution */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location" size={22} color="#FF3B30" />
                <Text style={styles.sectionTitle}>Top Locations</Text>
              </View>
              {analytics?.top_locations?.length ? (
              analytics.top_locations.map((location: any, index: number) => (
                <View key={`${location.municipality}-${location.province}-${index}`} style={styles.locationItem}>
                  <View style={styles.locationLeft}>
                    <Text style={styles.locationRank}>{index + 1}</Text>
                    <View>
                      <Text style={styles.locationName}>{location.municipality}</Text>
                      <Text style={styles.locationProvince}>{location.province}</Text>
                    </View>
                  </View>
                  <Text style={styles.locationCount}>{location.helper_count}</Text>
                </View>
              ))
              ) : (
                <EmptyHint message="No location data for helpers yet." />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1C1E",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#666",
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#FF9500",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#FF9500",
    fontWeight: "700",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1C1E",
  },

  // Rankings
  rankItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
    gap: 16,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF4E5",
    alignItems: "center",
    justifyContent: "center",
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF9500",
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1C1E",
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF9500",
    borderRadius: 3,
  },
  rankCount: {
    alignItems: "flex-end",
  },
  rankCountNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1C1E",
  },
  rankCountLabel: {
    fontSize: 12,
    color: "#999",
  },

  // Jobs
  jobItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
  },
  jobLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  jobRank: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
    width: 24,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1C1E",
  },
  jobCategory: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  jobRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  jobCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },

  // Skills
  skillItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
  },
  skillLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  skillBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  skillName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1C1E",
  },
  skillJob: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  skillRight: {
    alignItems: "flex-end",
  },
  skillCount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1C1E",
  },
  skillLabel: {
    fontSize: 11,
    color: "#999",
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1C1E",
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },

  // Demographics
  demoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
    gap: 16,
  },
  demoInfo: {
    flex: 1,
  },
  demoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1C1E",
    marginBottom: 8,
  },
  demoBar: {
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  demoBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  demoCount: {
    alignItems: "flex-end",
    minWidth: 60,
  },
  demoNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1C1E",
  },
  demoPercent: {
    fontSize: 12,
    color: "#999",
  },

  // Experience
  experienceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  experienceCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  experienceRange: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1C1E",
    marginBottom: 8,
  },
  experienceCount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF9500",
    marginBottom: 4,
  },
  experienceLabel: {
    fontSize: 11,
    color: "#999",
  },

  // Locations
  locationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
  },
  locationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  locationRank: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF3B30",
    width: 24,
  },
  locationName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1C1E",
  },
  locationProvince: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  locationCount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  errorWrap: {
    marginHorizontal: 24,
    marginTop: 24,
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  errorTitle: { fontSize: 17, fontWeight: "800", color: "#1A1C1E", marginTop: 12, marginBottom: 8 },
  errorBody: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 16, lineHeight: 20 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FF9500",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  retryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
