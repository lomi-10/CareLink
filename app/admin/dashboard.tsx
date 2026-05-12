import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
    ActivityIndicator,
} from "react-native";
import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import API_URL from "../../constants/api";
import { fetchAdminComplaints } from "@/lib/complaintsApi";

export default function AdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  const [adminName, setAdminName] = useState("Super Admin");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, logs: 0, complaints: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
    fetchStats();
  }, []);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setAdminName(user.first_name || "Super Admin");
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch users count
      const userResponse = await fetch(`${API_URL}/admin_get_users.php`);
      const users = await userResponse.json();
      if (Array.isArray(users)) {
        setStats(prev => ({ 
          ...prev, 
          total: users.length, 
          pending: users.filter(u => u.status === 'pending').length 
        }));
      }
      
      // Fetch logs count
      const logResponse = await fetch(`${API_URL}/admin_get_logs.php`);
      const logs = await logResponse.json();
      if (Array.isArray(logs)) {
        setStats(prev => ({ ...prev, logs: logs.length }));
      }

      const userRaw = await AsyncStorage.getItem("user_data");
      const adminUid = userRaw ? Number(JSON.parse(userRaw).user_id) : 0;
      if (adminUid) {
        const cRes = await fetchAdminComplaints(adminUid);
        const list = cRes.success && cRes.complaints ? cRes.complaints : [];
        const open = list.filter((c) => c.status === "Pending").length;
        setStats((prev) => ({ ...prev, complaints: open }));
      }
      
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => setLogoutModalVisible(true);

  const confirmLogout = async () => {
    await AsyncStorage.clear();
    setLogoutModalVisible(false);
    router.replace("/welcome");
  };

  const SidebarItem = ({ icon, label, onPress, isActive = false }: any) => (
    <TouchableOpacity 
      style={[styles.sidebarItem, isActive && styles.sidebarItemActive]} 
      onPress={onPress}
    >
      <Ionicons 
        name={icon} 
        size={22} 
        color={isActive ? "#5856D6" : "#666"} 
        style={{ marginRight: 12 }}
      />
      <Text style={[styles.sidebarText, isActive && styles.sidebarTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={[styles.container, isWideScreen ? styles.containerRow : styles.containerCol]}>
        
        {/* SIDEBAR */}
        <View style={[styles.sidebar, isWideScreen ? styles.sidebarWide : styles.sidebarMobile]}>
          <View style={styles.sidebarHeader}>
            <CareLinkLogoMark size={36} containerStyle={{ marginRight: 10 }} />
            <View>
              <Text style={styles.logoText}>CareLink</Text>
              <Text style={styles.logoSubtext}>Super Admin Portal</Text>
            </View>
          </View>

          <ScrollView style={styles.navItems}>
            <Text style={styles.navLabel}>SYSTEM</Text>
            <SidebarItem icon="grid" label="Dashboard" isActive={true} onPress={() => {}} />
            <SidebarItem icon="list" label="Log Trail" onPress={() => router.push("/admin/logs")} />
            <SidebarItem icon="warning" label="Complaints" onPress={() => router.push("/admin/complaints")} />
            
            <Text style={[styles.navLabel, { marginTop: 20 }]}>MANAGEMENT</Text>
            <SidebarItem 
              icon="people" 
              label="User Verification" 
              onPress={() => router.push("/admin/user_management")} 
            />
            <SidebarItem 
              icon="person-add" 
              label="Create Admin/PESO" 
              onPress={() => router.push("/admin/create_admin_user")} 
            />
          </ScrollView>

          <TouchableOpacity style={styles.sidebarLogout} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
            <Text style={styles.logoutTextSide}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* MAIN CONTENT */}
        <View style={styles.mainContent}>
          <View style={styles.contentHeader}>
            <View>
              <Text style={styles.pageTitle}>Admin Dashboard</Text>
              <Text style={styles.pageSubtitle}>System Administrator: {adminName}</Text>
            </View>
            <View style={styles.profilePill}>
              <Ionicons name="person-circle" size={32} color="#ccc" />
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#5856D6" style={{ marginTop: 50 }} />
          ) : (
            <ScrollView contentContainerStyle={{paddingBottom: 50}}>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#EBEBF5' }]}>
                    <Ionicons name="list" size={24} color="#5856D6" />
                  </View>
                  <View>
                    <Text style={styles.statNumber}>{stats.logs}</Text>
                    <Text style={styles.statLabel}>Audit Logs</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => router.push("/admin/complaints")}
                  activeOpacity={0.85}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#FFD6D6' }]}>
                    <Ionicons name="warning" size={24} color="#FF3B30" />
                  </View>
                  <View>
                    <Text style={styles.statNumber}>{stats.complaints}</Text>
                    <Text style={styles.statLabel}>Open Complaints</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="people" size={24} color="#34C759" />
                  </View>
                  <View>
                    <Text style={styles.statNumber}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>Recent System Activity</Text>
                <View style={styles.placeholderBox}>
                  <Text style={{color: '#999'}}>System logs and audit trails will appear here</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      {/* Logout Modal */}
      <Modal animationType="fade" transparent={true} visible={logoutModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.logoutButton]} onPress={confirmLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA", // Light background
  },
  // Layout Containers
  container: {
    flex: 1,
  },
  containerRow: {
    flexDirection: "row", // Side by Side for Web/Tablet
  },
  containerCol: {
    flexDirection: "column", // Stacked for Mobile
  },

  // --- SIDEBAR ---
  sidebar: {
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#E5E5EA",
    paddingVertical: 20,
    paddingHorizontal: 15,
    justifyContent: "space-between",
  },
  sidebarWide: {
    width: 260, // Fixed width for sidebar
    height: "100%",
  },
  sidebarMobile: {
    width: "100%",
    height: "auto",
    paddingBottom: 10,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#004080",
  },
  logoSubtext: {
    fontSize: 10,
    color: "#666",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginBottom: 10,
    marginLeft: 10,
    letterSpacing: 1,
  },
  navItems: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  sidebarItemActive: {
    backgroundColor: "#F0F7FF",
  },
  sidebarText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#444",
  },
  sidebarTextActive: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  sidebarLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  logoutTextSide: {
    marginLeft: 10,
    color: '#FF3B30',
    fontWeight: '600',
  },

  // --- MAIN CONTENT ---
  mainContent: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 20,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Stats
  statsGrid: {
    flexDirection: "row",
    gap: 15,
    flexWrap: "wrap", // Allows wrapping on mobile
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    minWidth: 140, // Ensure cards don't get too small
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },

  // Sections
  sectionBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  placeholderBox: {
    height: 150,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 12,
    width: "85%",
    maxWidth: 350,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  modalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: { 
    backgroundColor: "#E5E5EA" 
  },
  logoutButton: { 
    backgroundColor: "#FF3B30" 
  },
  cancelButtonText: { 
    color: "#333", 
    fontWeight: "600", 
    fontSize: 16 
  },
  logoutButtonText: { 
    color: "#fff", 
    fontWeight: "600", 
    fontSize: 16 
  },
});