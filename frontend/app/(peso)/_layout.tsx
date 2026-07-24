// app/(PESO)/_layout.tsx
// Shared layout with a persistent, theme-aware sidebar for the PESO portal.
// Wrapped in PesoThemeProvider so every screen + the chrome share one light/dark
// palette. Presentation lives in components/peso/layout/.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Slot, usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal, SafeAreaView, StatusBar, Text, TouchableOpacity, useWindowDimensions, View,
} from "react-native";
import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { MobileDrawer } from "@/components/peso/layout/MobileDrawer";
import { Sidebar } from "@/components/peso/layout/Sidebar";
import type { BadgeKey } from "@/components/peso/layout/navConfig";
import { useNotifications } from "@/hooks/shared";
import { fetchPesoComplaints } from "@/lib/complaintsApi";
import { PesoThemeProvider, usePesoTheme, font, radius } from "@/contexts/PesoThemeContext";

export default function PESOLayout() {
  return (
    <PesoThemeProvider>
      <PesoLayoutInner />
    </PesoThemeProvider>
  );
}

function PesoLayoutInner() {
  const { c, dark } = usePesoTheme();
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
  const badges: Record<BadgeKey, number> = { notifications: unreadNotifications, complaints: openComplaints };

  useEffect(() => { void loadUser(); }, []);
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
    fetchPesoComplaints(pesoUserId).then((res) => setOpenComplaints(res.complaints?.length ?? 0)).catch(() => {});
  }, [pesoUserId]);

  const confirmLogout = async () => { await AsyncStorage.clear(); setLogoutModalVisible(false); router.replace("/"); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />

      {!isWideScreen && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <CareLinkLogoMark size={34} />
            <View>
              <Text style={{ fontFamily: font.display, fontSize: 17, color: c.ink }}>CareLink</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 11, color: c.subtle }}>PESO Portal</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setMobileMenuOpen(true)} style={{ padding: 6 }} accessibilityLabel="Open menu">
            <Ionicons name="menu" size={26} color={c.ink} />
          </TouchableOpacity>
        </View>
      )}

      <MobileDrawer visible={mobileMenuOpen} router={router} badges={badges} onClose={() => setMobileMenuOpen(false)} onLogout={() => setLogoutModalVisible(true)} />

      <View style={{ flex: 1, flexDirection: "row", minHeight: 0 }}>
        {isWideScreen && (
          <Sidebar router={router} pathname={pathname ?? ''} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((v) => !v)} userName={userName} badges={badges} onLogout={() => setLogoutModalVisible(true)} />
        )}
        <View style={{ flex: 1, minWidth: 0, backgroundColor: c.canvas }}>
          <Slot />
        </View>
      </View>

      <Modal animationType="fade" transparent visible={logoutModalVisible}>
        <View style={{ flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: "100%", maxWidth: 360, backgroundColor: c.surface, borderRadius: radius.xl, padding: 24, alignItems: "center", borderWidth: 1, borderColor: c.line }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.badSoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="log-out" size={28} color={c.bad} />
            </View>
            <Text style={{ fontFamily: font.display, fontSize: 18, color: c.ink, marginTop: 12 }}>Confirm Logout</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: c.muted, marginTop: 6, textAlign: "center" }}>Are you sure you want to log out?</Text>
            <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch", marginTop: 20 }}>
              <TouchableOpacity onPress={() => setLogoutModalVisible(false)} style={{ flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1, borderColor: c.lineStrong, alignItems: "center" }}>
                <Text style={{ fontFamily: font.semibold, color: c.ink }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void confirmLogout()} style={{ flex: 1, paddingVertical: 13, borderRadius: radius.md, backgroundColor: c.bad, alignItems: "center" }}>
                <Text style={{ fontFamily: font.semibold, color: "#fff" }}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
