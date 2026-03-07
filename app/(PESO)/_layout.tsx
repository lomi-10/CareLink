// app/(PESO)/_layout.tsx
// Shared Layout with Persistent Sidebar for PESO Admin
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, usePathname, Slot } from "expo-router";
import React, { useState, useEffect } from "react";
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
} from "react-native";

export default function PESOLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  const [userName, setUserName] = useState("PESO Officer");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setUserName(`${user.first_name} ${user.last_name}` || "PESO Officer");
    }
  };

  const handleLogout = () => setLogoutModalVisible(true);

  const confirmLogout = async () => {
    await AsyncStorage.clear();
    setLogoutModalVisible(false);
    router.replace("/welcome");
  };

  const isActive = (path: string) => pathname === path;

  const SidebarItem = ({ icon, label, path }: any) => (
    <TouchableOpacity 
      style={[styles.sidebarItem, isActive(path) && styles.sidebarItemActive]} 
      onPress={() => router.push(path)}
    >
      <Ionicons 
        name={icon} 
        size={22} 
        color={isActive(path) ? "#FF9500" : "#666"} 
        style={{ marginRight: sidebarCollapsed ? 0 : 12 }}
      />
      {!sidebarCollapsed && (
        <Text style={[styles.sidebarText, isActive(path) && styles.sidebarTextActive]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.container}>
        
        {/* PERSISTENT SIDEBAR */}
        <View style={[
          styles.sidebar, 
          isWideScreen ? (sidebarCollapsed ? styles.sidebarCollapsed : styles.sidebarWide) : styles.sidebarMobile
        ]}>
          
          {/* Header */}
          <View style={styles.sidebarHeader}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark-sharp" size={28} color="#fff" />
            </View>
            {!sidebarCollapsed && (
              <View>
                <Text style={styles.logoText}>CareLink</Text>
                <Text style={styles.logoSubtext}>PESO Portal</Text>
              </View>
            )}
          </View>

          {/* Toggle Button (Desktop only) */}
          {isWideScreen && (
            <TouchableOpacity 
              style={styles.toggleBtn}
              onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Ionicons 
                name={sidebarCollapsed ? "chevron-forward" : "chevron-back"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          )}

          {/* Navigation */}
          <ScrollView style={styles.navItems}>
            {!sidebarCollapsed && <Text style={styles.navLabel}>MENU</Text>}
            
            <SidebarItem 
              icon="grid" 
              label="Dashboard" 
              path="/(PESO)/home" 
            />
            <SidebarItem 
              icon="people" 
              label="User Verification" 
              path="/(PESO)/user_verification" 
            />
            <SidebarItem 
              icon="document-text" 
              label="Document Review" 
              path="/(PESO)/document_review" 
            />
            <SidebarItem 
              icon="person-add" 
              label="Create PESO User" 
              path="/(PESO)/create_peso_user" 
            />
            <SidebarItem 
              icon="bar-chart" 
              label="Reports" 
              path="/(PESO)/reports" 
            />
          </ScrollView>

          {/* User Profile & Logout */}
          <View style={styles.sidebarFooter}>
            {!sidebarCollapsed && (
              <View style={styles.userInfo}>
                <Ionicons name="person-circle" size={40} color="#ccc" />
                <View style={styles.userText}>
                  <Text style={styles.userNameText} numberOfLines={1}>{userName}</Text>
                  <Text style={styles.userRoleText}>PESO Admin</Text>
                </View>
              </View>
            )}
            
            <TouchableOpacity style={styles.sidebarLogout} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
              {!sidebarCollapsed && <Text style={styles.logoutTextSide}>Log Out</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* MAIN CONTENT AREA */}
        <View style={styles.mainContent}>
          <Slot />
        </View>
      </View>

      {/* Logout Modal */}
      <Modal animationType="fade" transparent={true} visible={logoutModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Ionicons name="log-out" size={48} color="#FF3B30" />
            <Text style={styles.modalTitle}>Confirm Logout</Text>
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
    backgroundColor: "#F8F9FA" 
  },
  container: { 
    flex: 1, 
    flexDirection: "row" 
  },
  
  // Sidebar
  sidebar: {
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#E5E5EA",
    paddingVertical: 20,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  sidebarWide: { 
    width: 260,
    paddingHorizontal: 15,
  },
  sidebarCollapsed: { 
    width: 80,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  sidebarMobile: { 
    display: 'none' // Hide on mobile for now
  },
  sidebarHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 30, 
    paddingHorizontal: 10 
  },
  logoCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 10, 
    backgroundColor: "#FF9500",
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: 12,
  },
  logoText: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#1A1C1E" 
  },
  logoSubtext: { 
    fontSize: 11, 
    color: "#666", 
    fontWeight: "600", 
    letterSpacing: 0.5 
  },
  
  toggleBtn: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 10,
    marginRight: 5,
  },
  
  navLabel: { 
    fontSize: 11, 
    fontWeight: "700", 
    color: "#999", 
    marginBottom: 12, 
    marginLeft: 10, 
    letterSpacing: 1.2 
  },
  navItems: { 
    flex: 1 
  },
  sidebarItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 14, 
    paddingHorizontal: 15, 
    borderRadius: 10, 
    marginBottom: 6,
    transition: 'all 0.2s',
  },
  sidebarItemActive: { 
    backgroundColor: "#FFF4E5" 
  },
  sidebarText: { 
    fontSize: 15, 
    fontWeight: "500", 
    color: "#444" 
  },
  sidebarTextActive: { 
    color: "#FF9500", 
    fontWeight: "700" 
  },
  
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: 10,
  },
  userText: {
    flex: 1,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  userRoleText: {
    fontSize: 12,
    color: '#999',
  },
  sidebarLogout: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    gap: 8,
  },
  logoutTextSide: { 
    color: '#FF3B30', 
    fontWeight: '700',
    fontSize: 15,
  },
  
  mainContent: { 
    flex: 1, 
    backgroundColor: "#F8F9FA",
  },
  
  // Modal
  modalOverlay: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "rgba(0,0,0,0.6)" 
  },
  modalContainer: { 
    backgroundColor: "#fff", 
    padding: 30, 
    borderRadius: 16, 
    width: "85%", 
    maxWidth: 350, 
    alignItems: "center", 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 8 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginTop: 16,
    marginBottom: 8, 
    color: "#1A1C1E" 
  },
  modalMessage: { 
    fontSize: 15, 
    textAlign: "center", 
    marginBottom: 24, 
    color: "#666",
    lineHeight: 22,
  },
  modalButtons: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    width: "100%", 
    gap: 12 
  },
  modalButton: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 10, 
    alignItems: "center" 
  },
  cancelButton: { 
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  logoutButton: { 
    backgroundColor: "#FF3B30" 
  },
  cancelButtonText: { 
    color: "#333", 
    fontWeight: "600", 
    fontSize: 15 
  },
  logoutButtonText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 15 
  },
});
