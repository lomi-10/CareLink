// app/(parent)/_layout.tsx
// Status-Based Navigation Wrapper for Parents
// FIXED: Fetches fresh status from API

import { useRouter, Slot, usePathname } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API_URL from "../../constants/api";
import { RoleScreenBackground } from "@/components/shared";
import { ParentThemeProvider } from "@/contexts/ParentThemeContext";
import { styles } from "@/constants/parentLayout.styles";

export default function ParentLayout() {
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

      // Fetch fresh status from API
      const response = await fetch(`${API_URL}/shared/get_user_status.php?user_id=${userId}`);
      const data = await response.json();

      if (data.success) {
        const currentStatus = data.status;
        setUserStatus(currentStatus);

        // Update AsyncStorage with fresh status
        const updatedUser = { ...user, status: currentStatus };
        await AsyncStorage.setItem("user_data", JSON.stringify(updatedUser));

        console.log("Current parent status:", currentStatus);
      } else {
        setUserStatus(user.status || "pending");
      }
    } catch (error) {
      console.error("Error checking user status:", error);
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
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show different content based on status
  if (userStatus === "pending") {
    return (
      <ParentThemeProvider>
        <RoleScreenBackground role="parent">
          <View style={styles.container}>
            <View style={styles.pendingBanner}>
              <Ionicons name="time-outline" size={20} color="#007AFF" />
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>Account pending verification</Text>
                <Text style={styles.bannerSubtitle}>
                  Complete your profile, upload documents, and wait for PESO to approve your account.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.bannerCta}
                onPress={() => router.push("/(parent)/profile" as never)}
                activeOpacity={0.85}
              >
                <Text style={styles.bannerCtaText}>Complete profile</Text>
                <Ionicons name="chevron-forward" size={16} color="#1D4ED8" />
              </TouchableOpacity>
            </View>
            <View style={styles.content}>
              <Slot />
            </View>
          </View>
        </RoleScreenBackground>
      </ParentThemeProvider>
    );
  } else if (userStatus === "approved") {
    return (
      <ParentThemeProvider>
        <RoleScreenBackground role="parent">
          <Slot />
        </RoleScreenBackground>
      </ParentThemeProvider>
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
