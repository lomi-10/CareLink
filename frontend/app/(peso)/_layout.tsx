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
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { theme } from "@/constants/theme";
import { RoleScreenBackground } from "@/components/shared";

import { styles } from "@/constants/pesoLayout.styles";

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
