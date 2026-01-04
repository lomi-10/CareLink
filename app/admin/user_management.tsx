import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../../constants/api"; // Adjust path if needed: ../../constants/api

export default function UserManagementScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all' or 'pending'
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, [filter]); // Re-fetch when filter changes

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // If filter is 'pending', add query param. Otherwise get all.
      const endpoint = filter === 'pending' 
        ? `${API_URL}/admin_get_users.php?status=pending`
        : `${API_URL}/admin_get_users.php`;

      const response = await fetch(endpoint);
      const data = await response.json();
      
      console.log("Users Data:", data);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (targetUserId: number, newStatus: string) => {
    try {
      const adminToken = await AsyncStorage.getItem("user_token"); // Assuming this stores Admin ID
      if (!adminToken) return;

      const response = await fetch(`${API_URL}/admin_update_status.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: targetUserId,
          new_status: newStatus,
          admin_id: adminToken, // Log who did it
        }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert("Success", result.message);
        fetchUsers(); // Refresh list
      } else {
        Alert.alert("Failed", result.message);
      }
    } catch (error) {
      Alert.alert("Error", "Could not update status.");
    }
  };

  // Filter locally by search query
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{item.user_type.toUpperCase()}</Text>
          </View>
        </View>
        
        {/* Status Badge */}
        <View style={[
          styles.statusBadge, 
          item.status === 'approved' ? styles.statusApproved : 
          item.status === 'pending' ? styles.statusPending : styles.statusSuspended
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'approved' ? styles.textApproved : 
            item.status === 'pending' ? styles.textPending : styles.textSuspended
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {item.status !== 'approved' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.btnApprove]}
            onPress={() => handleStatusUpdate(item.user_id, 'approved')}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
        )}

        {item.status !== 'suspended' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.btnSuspend]}
            onPress={() => handleStatusUpdate(item.user_id, 'suspended')}
          >
            <Ionicons name="ban" size={16} color="#fff" />
            <Text style={styles.btnText}>Suspend</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity onPress={fetchUsers} style={styles.iconBtn}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, filter === 'all' && styles.activeTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.activeTabText]}>All Users</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, filter === 'pending' && styles.activeTab]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.tabText, filter === 'pending' && styles.activeTabText]}>Pending Approval</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput 
          placeholder="Search name or email..." 
          style={styles.searchInput} 
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.user_id.toString()}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No users found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  iconBtn: { padding: 5 },
  
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    justifyContent: "space-around",
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  activeTab: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  tabText: { color: "#666", fontWeight: "600" },
  activeTabText: { color: "#fff" },

  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 15,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },

  listContent: { paddingHorizontal: 15, paddingBottom: 20 },
  
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  userName: { fontSize: 16, fontWeight: "bold", color: "#000" },
  userEmail: { fontSize: 14, color: "#666", marginVertical: 2 },
  
  roleBadge: {
    backgroundColor: "#E5E5EA",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  roleText: { fontSize: 10, fontWeight: "bold", color: "#555" },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusApproved: { backgroundColor: "#E0F8E7" },
  statusPending: { backgroundColor: "#FFF4E5" },
  statusSuspended: { backgroundColor: "#FFE5E5" },
  
  statusText: { fontSize: 12, fontWeight: "bold" },
  textApproved: { color: "#34C759" },
  textPending: { color: "#FF9500" },
  textSuspended: { color: "#FF3B30" },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnApprove: { backgroundColor: "#34C759" },
  btnSuspend: { backgroundColor: "#FF3B30" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 12, marginLeft: 4 },

  emptyText: { textAlign: "center", marginTop: 50, color: "#999" },
});