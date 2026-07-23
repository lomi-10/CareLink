import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { NotificationModal } from "@/components/shared/NotificationModal";
import API_URL from "../../constants/api"; // Adjust path if needed: ../../constants/api

export default function UserManagementScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all' or 'pending'
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserType, setCurrentUserType] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "error" | "warning" | "info";
    message: string;
    title?: string;
  }>({ visible: false, type: "info", message: "" });

  useEffect(() => {
    loadUserType();
    fetchUsers();
  }, [filter]); // Re-fetch when filter changes

  const loadUserType = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserType(user.user_type);
    }
  };

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
      setToast({ visible: true, type: "error", message: "Failed to fetch users.", title: "Error" });
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
        setToast({ visible: true, type: "success", message: result.message, title: "Success" });
        fetchUsers(); // Refresh list
      } else {
        setToast({ visible: true, type: "error", message: result.message, title: "Failed" });
      }
    } catch (error) {
      setToast({ visible: true, type: "error", message: "Could not update status.", title: "Error" });
    }
  };

  // Filter locally by search query and PESO restriction
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // PESO Restriction: Show only pending users with documents
    if (currentUserType === 'peso' && filter === 'pending') {
      return matchesSearch && u.status === 'pending' && u.doc_count > 0;
    }

    return matchesSearch;
  });

  const renderUserCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {item.user_type === 'admin' ? 'SUPER ADMIN' : 
               item.user_type === 'peso' ? 'PESO OFFICER' : 
               item.user_type.toUpperCase()}
            </Text>
          </View>
          {item.doc_count > 0 && (
            <View style={[styles.docBadge, { marginLeft: 8 }]}>
              <Ionicons name="document-attach" size={10} color="#059669" />
              <Text style={styles.docBadgeText}>{item.doc_count} Documents</Text>
            </View>
          )}
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
          <Ionicons name="refresh" size={24} color="#0F7B54" />
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
        <ActivityIndicator size="large" color="#0F7B54" style={{ marginTop: 50 }} />
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

      <NotificationModal
        visible={toast.visible}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
        autoClose={toast.type === "success"}
        duration={2200}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF7F1" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EFE4D5",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  iconBtn: { padding: 5 },
  
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    // Was justifyContent:"space-around" with no width cap, which flung the two
    // tabs to opposite edges of a wide monitor. Group them together instead.
    justifyContent: "flex-start",
    gap: 10,
    width: "100%",
    maxWidth: 1400,
    alignSelf: "center",
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFE4D5",
  },
  activeTab: {
    backgroundColor: "#0F7B54",
    borderColor: "#0F7B54",
  },
  tabText: { color: "#7C6047", fontWeight: "600" },
  activeTabText: { color: "#fff" },

  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    // Keep the search field in line with the capped list below it.
    width: "100%",
    maxWidth: 1400,
    alignSelf: "center",
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

  listContent: { paddingHorizontal: 15, paddingBottom: 20, width: "100%", maxWidth: 1400, alignSelf: "center" },
  
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
  userEmail: { fontSize: 14, color: "#7C6047", marginVertical: 2 },
  
  roleBadge: {
    backgroundColor: "#EFE4D5",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  roleText: { fontSize: 10, fontWeight: "bold", color: "#555" },

  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    gap: 4,
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusApproved: { backgroundColor: "#ECFDF5" },
  statusPending: { backgroundColor: "#FBEFD3" },
  statusSuspended: { backgroundColor: "#FCE8E8" },
  
  statusText: { fontSize: 12, fontWeight: "bold" },
  textApproved: { color: "#059669" },
  textPending: { color: "#C97A0E" },
  textSuspended: { color: "#DC2626" },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#FAF7F1",
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnApprove: { backgroundColor: "#059669" },
  btnSuspend: { backgroundColor: "#DC2626" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 12, marginLeft: 4 },

  emptyText: { textAlign: "center", marginTop: 50, color: "#999" },
});