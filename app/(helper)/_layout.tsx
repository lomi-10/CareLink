// app/(helper)/_layout.tsx
// FIXED: Refreshes user status from API to show correct banner

import { useRouter, Slot } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API_URL from "../../constants/api";
import { RoleScreenBackground } from "@/components/shared";
import { theme } from "@/constants/theme";
import { HelperWorkModeProvider } from "@/contexts/HelperWorkModeContext";

export default function HelperLayout() {
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem("user_data");
      if (!userData) {
        router.replace("/login");
        return;
      }

      const user = JSON.parse(userData);
      const userId = user.user_id;

      // ================================================================
      // IMPORTANT: Fetch fresh status from API (not from AsyncStorage)
      // ================================================================
      const response = await fetch(`${API_URL}/shared/get_user_status.php?user_id=${userId}`);
      const data = await response.json();

      if (data.success) {
        const currentStatus = data.status; // Fresh from database
        setUserStatus(currentStatus);

        // Update AsyncStorage with fresh status
        const updatedUser = { ...user, status: currentStatus };
        await AsyncStorage.setItem("user_data", JSON.stringify(updatedUser));

        console.log("Current helper status:", currentStatus);
      } else {
        // Fallback to AsyncStorage if API fails
        setUserStatus(user.status || "pending");
      }
    } catch (error) {
      console.error("Error checking user status:", error);
      // Fallback to AsyncStorage
      const userData = await AsyncStorage.getItem("user_data");
      if (userData) {
        const user = JSON.parse(userData);
        setUserStatus(user.status || "pending");
      } else {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.color.helper} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show different content based on status
  if (userStatus === "pending") {
    return (
      <RoleScreenBackground role="helper">
      <View style={styles.container}>
        {/* Pending Status Banner */}
        <View style={styles.pendingBanner}>
          <Ionicons name="time-outline" size={20} color={theme.color.warning} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Account pending verification</Text>
            <Text style={styles.bannerSubtitle}>
              Complete your profile, upload documents, and wait for PESO to approve your account.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bannerCta}
            onPress={() => router.push("/(helper)/profile")}
            activeOpacity={0.85}
          >
            <Text style={styles.bannerCtaText}>Complete profile</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.color.warning} />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
      </RoleScreenBackground>
    );
  } else if (userStatus === "approved") {
    // Approved users - no banner, full access
    return (
      <RoleScreenBackground role="helper">
        <HelperWorkModeProvider>
          <Slot />
        </HelperWorkModeProvider>
      </RoleScreenBackground>
    );
  } else if (userStatus === "suspended") {
    return <SuspendedScreen />;
  } else {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Account Status Unknown</Text>
        <Text style={styles.errorMessage}>Status: {userStatus}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.errorButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// Suspended Screen Component
function SuspendedScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace("/");
  };

  return (
    <ScrollView contentContainerStyle={styles.suspendedContainer}>
      <View style={styles.suspendedCard}>
        <View style={styles.suspendedIcon}>
          <Ionicons name="lock-closed" size={64} color="#FF3B30" />
        </View>

        <Text style={styles.suspendedTitle}>Account Suspended</Text>
        <Text style={styles.suspendedMessage}>
          Your account has been temporarily suspended.
        </Text>

        <View style={styles.contactBox}>
          <Ionicons name="information-circle" size={24} color="#007AFF" />
          <View style={styles.contactText}>
            <Text style={styles.contactTitle}>Need Help?</Text>
            <Text style={styles.contactInfo}>
              Contact PESO Office Ormoc:{"\n"}
              📞 Phone: (053) XXX-XXXX{"\n"}
              📧 Email: peso.ormoc@gov.ph
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  content: { flex: 1 },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.warningSoft,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
    gap: 12,
    flexWrap: "wrap",
  },
  bannerCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.color.warning + "55",
  },
  bannerCtaText: { fontSize: 13, fontWeight: "800", color: theme.color.warning },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: "700", color: theme.color.ink, marginBottom: 2 },
  bannerSubtitle: { fontSize: 12, color: theme.color.muted, lineHeight: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#666" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#F8F9FA" },
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#1A1C1E", marginTop: 16, marginBottom: 8 },
  errorMessage: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  errorButton: { backgroundColor: "#007AFF", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 },
  errorButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  suspendedContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#F8F9FA" },
  suspendedCard: { backgroundColor: "#fff", borderRadius: 16, padding: 32, maxWidth: 500, width: "100%", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, alignItems: "center" },
  suspendedIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#FFEBEE", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  suspendedTitle: { fontSize: 24, fontWeight: "700", color: "#FF3B30", marginBottom: 12 },
  suspendedMessage: { fontSize: 15, color: "#666", textAlign: "center", marginBottom: 20, lineHeight: 22 },
  contactBox: { flexDirection: "row", backgroundColor: "#E3F2FD", borderRadius: 12, padding: 16, marginBottom: 24, gap: 12, width: "100%" },
  contactText: { flex: 1 },
  contactTitle: { fontSize: 15, fontWeight: "700", color: "#007AFF", marginBottom: 6 },
  contactInfo: { fontSize: 13, color: "#0056b3", lineHeight: 20 },
  logoutButton: { flexDirection: "row", backgroundColor: "#FF3B30", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10, gap: 8, alignItems: "center" },
  logoutButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
