// app/(PESO)/_layout.tsx
// Shared Layout with Persistent Sidebar for PESO Admin
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Slot, usePathname, useRouter } from "expo-router";
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
} from "react-native";
import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { theme } from "@/constants/theme";
import { RoleScreenBackground } from "@/components/shared";

const NAV_LINKS = [
  { icon: "grid" as const, label: "Dashboard", path: "/(peso)/home" },
  { icon: "notifications" as const, label: "Notifications", path: "/(peso)/notifications" },
  { icon: "people" as const, label: "User verification", path: "/(peso)/user_verification" },
  { icon: "briefcase" as const, label: "Job verification", path: "/(peso)/job_verification" },
  { icon: "document-text" as const, label: "Signed contracts", path: "/(peso)/signed_contracts" },
  { icon: "analytics" as const, label: "Analytics", path: "/(peso)/analytics" },
  { icon: "person-add" as const, label: "Create PESO user", path: "/(peso)/create_peso_user" },
  { icon: "bar-chart" as const, label: "Reports", path: "/(peso)/reports" },
];

export default function PESOLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  const [userName, setUserName] = useState("PESO Officer");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    router.replace("/");
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
        color={isActive(path) ? theme.color.peso : "#666"} 
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

      {!isWideScreen && (
        <View style={styles.mobileTopBar}>
          <View style={styles.mobileBrand}>
            <CareLinkLogoMark size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileLogo}>CareLink</Text>
              <Text style={styles.mobileSub}>PESO Portal</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setMobileMenuOpen(true)}
            style={styles.mobileMenuBtn}
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={26} color="#1A1C1E" />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={mobileMenuOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setMobileMenuOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerSheet}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Navigate</Text>
              <TouchableOpacity onPress={() => setMobileMenuOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={28} color="#334155" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.drawerScroll}>
              {NAV_LINKS.map((item) => (
                <TouchableOpacity
                  key={item.path}
                  style={styles.drawerItem}
                  onPress={() => {
                    setMobileMenuOpen(false);
                    router.push(item.path as never);
                  }}
                >
                  <Ionicons name={item.icon} size={22} color="#EA580C" />
                  <Text style={styles.drawerItemText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.drawerLogout}
                onPress={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
              >
                <Ionicons name="log-out-outline" size={22} color="#DC2626" />
                <Text style={styles.drawerLogoutText}>Log out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.container}>
        {isWideScreen && (
        <View style={[
          styles.sidebar, 
          sidebarCollapsed ? styles.sidebarCollapsed : styles.sidebarWide
        ]}>
          
          {/* Header */}
          <View style={styles.sidebarHeader}>
            <CareLinkLogoMark size={40} containerStyle={{ marginRight: 12 }} />
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
            {NAV_LINKS.map((item) => (
              <SidebarItem key={item.path} icon={item.icon} label={item.label} path={item.path} />
            ))}
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
        )}

        {/* MAIN CONTENT AREA */}
        <View style={styles.mainContent}>
          <RoleScreenBackground role="peso">
            <Slot />
          </RoleScreenBackground>
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
    backgroundColor: theme.color.canvasPeso,
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
  mobileTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  mobileBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 8,
  },
  mobileLogo: { fontSize: 18, fontWeight: "800", color: "#1A1C1E" },
  mobileSub: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  mobileMenuBtn: { padding: 8 },
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  drawerSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: 24,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  drawerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  drawerScroll: { paddingHorizontal: 8 },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  drawerItemText: { fontSize: 16, fontWeight: "600", color: "#1A1C1E" },
  drawerLogout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  drawerLogoutText: { fontSize: 16, fontWeight: "700", color: "#DC2626" },
  sidebarHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 30, 
    paddingHorizontal: 10 
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
