// app/(PESO)/job_verification.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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

// IMPORT YOUR NEW MODAL!
import { JobVerificationModal } from "../../components/peso/JobVerificationModal";

export interface VerificationJob {
  job_post_id: number;
  parent_name: string;
  title: string;
  category_name: string;
  custom_category: string;
  salary_offered: string;
  salary_period: string;
  status: string;
  posted_at: string;
}

export default function JobVerification() {
  const [jobs, setJobs] = useState<VerificationJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<VerificationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Pending"); 

  // NEW MODAL STATE
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [searchQuery, filterStatus, jobs]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/peso/get_jobs_for_verification.php`);
      const data = await response.json();
      if (data.success) setJobs(data.data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = jobs;
    if (filterStatus !== "All") filtered = filtered.filter((job) => job.status === filterStatus);
    if (searchQuery) {
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.parent_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredJobs(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const renderJobCard = ({ item }: { item: VerificationJob }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => setSelectedJobId(item.job_post_id)} // OPEN MODAL INSTEAD OF ROUTING
    >
      <View style={styles.cardLeft}>
        <View style={styles.jobIconPlaceholder}>
          <Ionicons name="briefcase" size={28} color="#0284C7" />
        </View>
      </View>

      <View style={styles.cardCenter}>
        <Text style={styles.jobTitle} numberOfLines={1}>{item.title || 'Untitled Job'}</Text>
        <Text style={styles.categoryText}>{item.custom_category || item.category_name}</Text>
        
        <View style={styles.jobMeta}>
          <Ionicons name="person" size={14} color="#666" />
          <Text style={styles.metaText}>{item.parent_name}</Text>
        </View>
        <View style={styles.jobMeta}>
          <Ionicons name="cash" size={14} color="#059669" />
          <Text style={[styles.metaText, {color: '#059669', fontWeight: '600'}]}>
            ₱{Number(item.salary_offered).toLocaleString()} / {item.salary_period}
          </Text>
        </View>
      </View>

      <View style={styles.cardRight}>
        <View
          style={[
            styles.statusBadge,
            item.status === "Open" && styles.statusVerified,
            item.status === "Pending" && styles.statusPending,
            item.status === "Rejected" && styles.statusRejected,
          ]}
        >
          <Ionicons
            name={
              item.status === "Open" ? "checkmark-circle"
                : item.status === "Pending" ? "time"
                : "close-circle"
            }
            size={16}
            color="#fff"
          />
          <Text style={styles.statusText}>{item.status === "Open" ? "Approved" : item.status}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Job Verification</Text>
          <Text style={styles.pageSubtitle}>
            {filteredJobs.length} Job Post{filteredJobs.length !== 1 ? "s" : ""} found
          </Text>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by job title or employer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          {["All", "Pending", "Open", "Rejected", "Closed"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                {status === "Open" ? "Approved" : status}
              </Text>
              {status !== "All" && (
                <View style={[styles.filterCount, filterStatus === status && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, filterStatus === status && styles.filterCountTextActive]}>
                    {jobs.filter((j) => j.status === status).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Loading job posts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.job_post_id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* RENDER MODAL HERE */}
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
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { padding: 24, paddingBottom: 16, backgroundColor: "#fff" },
  pageTitle: { fontSize: 28, fontWeight: "bold", color: "#1A1C1E", marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: "#666" },
  searchSection: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FA", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: "#1A1C1E" },
  filterChips: { flexDirection: "row" },
  filterChip: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#F0F0F0", marginRight: 8, gap: 6 },
  filterChipActive: { backgroundColor: "#0284C7" },
  filterChipText: { fontSize: 14, fontWeight: "600", color: "#666" },
  filterChipTextActive: { color: "#fff" },
  filterCount: { backgroundColor: "#fff", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: "center" },
  filterCountActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  filterCountText: { fontSize: 12, fontWeight: "700", color: "#666" },
  filterCountTextActive: { color: "#fff" },
  listContent: { padding: 16, paddingBottom: 40 },
  jobCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, alignItems: "center" },
  cardLeft: { marginRight: 16 },
  jobIconPlaceholder: { width: 56, height: 56, borderRadius: 14, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" },
  cardCenter: { flex: 1 },
  jobTitle: { fontSize: 16, fontWeight: "700", color: "#1A1C1E", marginBottom: 2 },
  categoryText: { fontSize: 13, color: "#0284C7", fontWeight: "600", marginBottom: 6 },
  jobMeta: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 6 },
  metaText: { fontSize: 13, color: "#666" },
  cardRight: { alignItems: "flex-end", justifyContent: 'space-between', height: '100%' },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, gap: 4 },
  statusPending: { backgroundColor: "#FF9500" },
  statusVerified: { backgroundColor: "#34C759" },
  statusRejected: { backgroundColor: "#FF3B30" },
  statusText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  loadingText: { marginTop: 12, color: "#666", fontSize: 14 }
});