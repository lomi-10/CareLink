// app/admin/adminlogin.tsx
// WEB-ONLY Admin Login — desktop split-screen (InfoPanel + LoginCard), shows
// a "desktop only" warning on phones/narrow tablets. Auth + lockout logic
// lives here; presentational pieces are under components/admin/login/.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { AlertModal } from "@/components/admin/login/AlertModal";
import { InfoPanel } from "@/components/admin/login/InfoPanel";
import { LoginCard } from "@/components/admin/login/LoginCard";
import { MobileWarning } from "@/components/admin/login/MobileWarning";
import { BG_DARK_2, TEXT_LIGHT_SUBTLE } from "@/components/landing/web/theme";
import { FontFamily } from "@/constants/GlobalStyles";
import API_URL from "../../constants/api";

export default function AdminLoginScreen() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const { width } = Dimensions.get("window");
    setIsMobile(Platform.OS !== "web" || width < 768);
  }, []);

  const handleLockout = () => {
    setIsLocked(true);
    setModalTitle("Too Many Attempts");
    setModalMessage("Account locked for 1 minute.");
    setModalVisible(true);

    setTimeout(() => {
      setIsLocked(false);
      setAttemptsLeft(5);
    }, 60000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      setEmail("");
      setPassword("");

      if (newAttempts <= 0) {
        handleLockout();
      } else {
        setModalTitle("Login Failed");
        setModalMessage(`Please enter correct credentials.\nYou have ${newAttempts} attempts left.`);
        setModalVisible(true);
      }
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.success) {
        // SECURITY CHECK: Only admin and peso allowed
        if (data.user_type === "admin" || data.user_type === "peso") {
          setAttemptsLeft(5);

          await AsyncStorage.setItem("user_token", data.user.user_id.toString());
          await AsyncStorage.setItem("user_data", JSON.stringify(data.user));

          setModalTitle(data.user_type === "admin" ? "Welcome Super Admin" : "Welcome PESO Admin");
          setModalMessage("Access Granted.");
          setModalVisible(true);

          setTimeout(() => {
            setModalVisible(false);
            router.replace(data.user_type === "admin" ? "/admin/dashboard" : "/(peso)/home");
          }, 1500);
        } else {
          // Regular users trying to login here
          const newAttempts = attemptsLeft - 1;
          setAttemptsLeft(newAttempts);

          if (newAttempts <= 0) {
            handleLockout();
          } else {
            setModalTitle("Access Denied");
            setModalMessage("This portal is for administrators only.\n\nUse the regular login for user access.");
            setModalVisible(true);
          }
        }
      } else {
        const newAttempts = attemptsLeft - 1;
        setAttemptsLeft(newAttempts);
        setEmail("");
        setPassword("");

        if (newAttempts <= 0) {
          handleLockout();
        } else {
          setModalTitle("Login Failed");
          setModalMessage(`Please enter correct credentials.\nYou have ${newAttempts} attempts left.`);
          setModalVisible(true);
        }
      }
    } catch {
      setModalTitle("System Error");
      setModalMessage("Unable to connect to the server.");
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  if (isMobile) {
    return <MobileWarning router={router} />;
  }

  return (
    <View style={s.root}>
      <View style={s.row}>
        <InfoPanel />
        <View style={s.cardSide}>
          <ScrollView contentContainerStyle={s.cardScroll} showsVerticalScrollIndicator={false}>
            <LoginCard
              email={email}
              password={password}
              showPassword={showPassword}
              loading={loading}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
              onSubmit={() => void handleLogin()}
              onForgotPassword={() => {
                setModalTitle("Forgot Password");
                setModalMessage("Please contact your system administrator to reset your password.");
                setModalVisible(true);
              }}
            />
          </ScrollView>
        </View>
      </View>

      <View style={s.footer}>
        <Text style={s.footerTxt}>© 2026 CareLink. All rights reserved.</Text>
        <View style={s.footerRight}>
          <Ionicons name="lock-closed" size={12} color={TEXT_LIGHT_SUBTLE} />
          <Text style={s.footerTxt}>Secure System</Text>
        </View>
      </View>

      <AlertModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, width: "100%", height: "100%", backgroundColor: BG_DARK_2 },
  row: { flex: 1, flexDirection: "row", minHeight: 0 },
  cardSide: {
    width: "36%", minWidth: 380, maxWidth: 460,
    backgroundColor: BG_DARK_2,
  },
  cardScroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 32, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.1)",
  },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerTxt: { fontSize: 12, fontFamily: FontFamily.fredokaRegular, color: TEXT_LIGHT_SUBTLE },
});
