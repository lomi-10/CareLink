// app/(PESO)/_layout.tsx
// Shared layout with persistent sidebar for the PESO admin portal.
// Sidebar/drawer presentation lives in components/peso/layout/ — this file
// just owns the shared state (collapse, badges, logout) and renders them.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Slot, usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { MobileDrawer } from "@/components/peso/layout/MobileDrawer";
import { Sidebar } from "@/components/peso/layout/Sidebar";
import type { BadgeKey } from "@/components/peso/layout/navConfig";
import { RoleScreenBackground } from "@/components/shared";
import { useNotifications } from "@/hooks/shared";
import { fetchPesoComplaints } from "@/lib/complaintsApi";

import { styles } from "@/constants/pesoLayout.styles";

export default function PESOLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  const [userName, setUserName] = useState("PESO Officer");
  const [pesoUserId, setPesoUserId] = useState<number | null>(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openComplaints, setOpenComplaints] = useState(0);

  const { unreadCount: unreadNotifications } = useNotifications('peso');

  const badges: Record<BadgeKey, number> = {
    notifications: unreadNotifications,
    complaints: openComplaints,
  };

  useEffect(() => {
    void loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const user = JSON.parse(userData);
      setUserName(`${user.first_name} ${user.last_name}` || "PESO Officer");
      const id = Number(user.user_id);
      if (id) setPesoUserId(id);
    }
  };

  useEffect(() => {
    if (!pesoUserId) return;
    fetchPesoComplaints(pesoUserId)
      .then((res) => setOpenComplaints(res.complaints?.length ?? 0))
      .catch(() => {});
  }, [pesoUserId]);

  const handleLogout = () => setLogoutModalVisible(true);

  const confirmLogout = async () => {
    await AsyncStorage.clear();
    setLogoutModalVisible(false);
    router.replace("/");
  };

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

      <MobileDrawer
        visible={mobileMenuOpen}
        router={router}
        badges={badges}
        onClose={() => setMobileMenuOpen(false)}
        onLogout={handleLogout}
      />

      <View style={styles.container}>
        {isWideScreen && (
          <Sidebar
            router={router}
            pathname={pathname ?? ''}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            userName={userName}
            badges={badges}
            onLogout={handleLogout}
          />
        )}

        <View style={styles.mainContent}>
          <RoleScreenBackground role="peso">
            <Slot />
          </RoleScreenBackground>
        </View>
      </View>

      <Modal animationType="fade" transparent visible={logoutModalVisible}>
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
                onPress={() => void confirmLogout()}
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
