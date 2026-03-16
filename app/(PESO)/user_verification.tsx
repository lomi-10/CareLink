// app/(PESO)/user_verification.tsx
// User Verification Screen - Shows list of helpers pending verification
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API_URL from "../../constants/api";

// 1. ADD THIS INTERFACE to tell TypeScript what a user object looks like
export interface VerificationUser {
  user_id: number;
  name: string;
  email: string;
  user_type: string;
  contact_number?: string;
  profile_image?: string;
  verification_status: string;
}

export default function UserVerification() {
  const router = useRouter();

  // 2. ADD <VerificationUser[]> to your state
  const [users, setUsers] = useState<VerificationUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<VerificationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Pending"); // Pending, Verified, Rejected, All

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, filterStatus, users]);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/peso/get_pending_users.php`);
      const text = await response.text();
      console.log("Response:", text);
      const data = JSON.parse(text);

      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by status
    if (filterStatus !== "All") {
      filtered = filtered.filter(
        (user) => user.verification_status === filterStatus
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPendingUsers();
    setRefreshing(false);
  };

  // 3. Optional but good practice: Add type to item
  const renderUserCard = ({ item }: { item: VerificationUser }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() =>
        router.push({
          pathname: "/(PESO)/view_user_profile",
          params: { user_id: item.user_id, user_type: item.user_type },
        })
      }
    >
      {/* Profile Image */}
      <View style={styles.cardLeft}>
        {item.profile_image ? (
          <Image source={{ uri: item.profile_image }} style={styles.profileImage} />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Ionicons name="person" size={32} color="#ccc" />
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={styles.cardCenter}>
        <Text style={styles.userName}>{item.name}</Text>
        <View style={styles.userMeta}>
          <Ionicons name="mail" size={14} color="#666" />
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View style={styles.userMeta}>
          <Ionicons name="briefcase" size={14} color="#666" />
          <Text style={styles.userType}>
            {item.user_type === "helper" ? "Domestic Helper" : "Parent/Service Seeker"}
          </Text>
        </View>
        {item.contact_number && (
          <View style={styles.userMeta}>
            <Ionicons name="call" size={14} color="#666" />
            <Text style={styles.userContact}>{item.contact_number}</Text>
          </View>
        )}
      </View>

      {/* Status Badge */}
      <View style={styles.cardRight}>
        <View
          style={[
            styles.statusBadge,
            item.verification_status === "Verified" && styles.statusVerified,
            item.verification_status === "Pending" && styles.statusPending,
            item.verification_status === "Rejected" && styles.statusRejected,
          ]}
        >
          <Ionicons
            name={
              item.verification_status === "Verified"
                ? "checkmark-circle"
                : item.verification_status === "Pending"
                ? "time"
                : "close-circle"
            }
            size={16}
            color="#fff"
          />
          <Text style={styles.statusText}>{item.verification_status}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>User Verification</Text>
          <Text style={styles.pageSubtitle}>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found
          </Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          {["All", "Pending", "Verified", "Rejected"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterStatus === status && styles.filterChipTextActive,
                ]}
              >
                {status}
              </Text>
              {status !== "All" && (
                <View
                  style={[
                    styles.filterCount,
                    filterStatus === status && styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      filterStatus === status && styles.filterCountTextActive,
                    ]}
                  >
                    {users.filter((u) => u.verification_status === status).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* User List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? "Try a different search term"
              : "No users waiting for verification"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.user_id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
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

  searchSection: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1A1C1E",
  },

  filterChips: {
    flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: "#FF9500",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  filterCount: {
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  filterCountActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },
  filterCountTextActive: {
    color: "#fff",
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  userCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
  },
  cardLeft: {
    marginRight: 16,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  cardCenter: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1C1E",
    marginBottom: 6,
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  userEmail: {
    fontSize: 13,
    color: "#666",
  },
  userType: {
    fontSize: 13,
    color: "#666",
  },
  userContact: {
    fontSize: 13,
    color: "#666",
  },
  cardRight: {
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  statusPending: {
    backgroundColor: "#FF9500",
  },
  statusVerified: {
    backgroundColor: "#34C759",
  },
  statusRejected: {
    backgroundColor: "#FF3B30",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
});
