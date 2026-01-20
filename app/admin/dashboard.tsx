import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Modal,
  ScrollView,
  Platform,
  useWindowDimensions,
  StatusBar
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

export default function AdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768; // Breakpoint for Tablet/Web

  const [adminName, setAdminName] = useState("Admin");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await AsyncStorage.getItem("user_data");
      if (userData) {
        const user = JSON.parse(userData);
        setAdminName(user.name || "Admin");
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    await AsyncStorage.clear();
    setLogoutModalVisible(false);
    router.replace("/welcome");
  };

  // --- REUSABLE COMPONENTS ---
  
  const SidebarItem = ({ icon, label, onPress, isActive = false }: any) => (
    <TouchableOpacity 
      style={[styles.sidebarItem, isActive && styles.sidebarItemActive]} 
      onPress={onPress}
    >
      <Ionicons 
        name={icon} 
        size={22} 
        color={isActive ? "#007AFF" : "#666"} 
        style={{ marginRight: 12 }}
      />
      <Text style={[styles.sidebarText, isActive && styles.sidebarTextActive]}>
        {label}
      </Text>
      {/* Chevron only for mobile layout flow usually, but we can hide it in sidebar */}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={[styles.container, isWideScreen ? styles.containerRow : styles.containerCol]}>
        
        {/* 1. LEFT SIDEBAR NAVIGATION */}
        <View style={[styles.sidebar, isWideScreen ? styles.sidebarWide : styles.sidebarMobile]}>
          <View style={styles.sidebarHeader}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={28} color="#fff" />
            </View>
            <Text style={styles.logoText}>AdminPanel</Text>
          </View>

          <ScrollView style={styles.navItems}>
            <Text style={styles.navLabel}>MENU</Text>
            <SidebarItem 
              icon="grid" 
              label="Dashboard" 
              isActive={true} 
              onPress={() => {}} 
            />
            <SidebarItem 
              icon="people" 
              label="Manage Users" 
              onPress={() => router.push("/admin/user_management")} 
            />
            <SidebarItem 
              icon="list" 
              label="Audit Logs" 
              onPress={() => router.push("/admin/logs")} 
            />
          </ScrollView>

          {/* Logout at bottom of sidebar */}
          <TouchableOpacity style={styles.sidebarLogout} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
            <Text style={styles.logoutTextSide}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* 2. MAIN CONTENT AREA (Right Side) */}
        <View style={styles.mainContent}>
          
          {/* Top Header inside content */}
          <View style={styles.contentHeader}>
            <View>
              <Text style={styles.pageTitle}>Overview</Text>
              <Text style={styles.pageSubtitle}>Welcome back, {adminName}</Text>
            </View>
            <View style={styles.profilePill}>
              <Ionicons name="person-circle" size={32} color="#ccc" />
            </View>
          </View>

          <ScrollView contentContainerStyle={{paddingBottom: 50}}>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="people" size={24} color="#007AFF" />
                </View>
                <View>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Total Users</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#FFF4E5' }]}>
                  <Ionicons name="time" size={24} color="#FF9500" />
                </View>
                <View>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                </View>
                <View>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Approved</Text>
                </View>
              </View>
            </View>

            {/* Recent Activity Placeholder (Visual only) */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>System Overview</Text>
              <View style={styles.placeholderBox}>
                <Text style={{color: '#999'}}>Chart or Activity Graph would go here</Text>
              </View>
            </View>

          </ScrollView>
        </View>
      </View>

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.logoutButton]} 
                onPress={confirmLogout}
              >
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
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#004080",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#004080",
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