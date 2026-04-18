// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { NotificationModal } from "@/components/shared/NotificationModal";
import { theme } from "@/constants/theme";
import { useLoginForm } from "@/hooks/auth/useLoginForm";
import { styles } from "./login.styles";

const ph = theme.color.subtle;

export default function LoginScreen() {
  const [forgotModal, setForgotModal] = useState(false);

  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    loading,
    isLocked,
    notification,
    closeNotification,
    handleLogin,
    router,
  } = useLoginForm();

  const backgroundImage = Platform.select({
    web: require("../../assets/images/CareLink.BackGround.Web.png"),
    default: require("../../assets/images/CareLink.BackGround.Mobile.png"),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surface }} edges={["top"]}>
      <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <CareLinkLogoMark size={72} />
          </View>
          <Text style={styles.kicker}>CareLink</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in with your email. Parents and helpers use this app; staff use the portal link below.
          </Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={ph}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.inputPassword}
                placeholder="Password"
                placeholderTextColor={ph}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color={theme.color.muted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setForgotModal(true)}>
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, isLocked && { opacity: 0.5 }]}
              onPress={handleLogin}
              disabled={isLocked || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isLocked ? "Temporarily locked" : "Sign in"}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/")}>
              <Text style={styles.back}>← Back to home</Text>
            </TouchableOpacity>

            {Platform.OS === "web" && (
              <TouchableOpacity
                onPress={() => router.push("/admin/adminlogin")}
                style={{ marginTop: theme.space.lg, alignItems: "center" }}
              >
                <Text style={{ color: theme.color.muted, fontSize: 13, fontWeight: "600" }}>
                  Staff login (Admin / PESO)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>

      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={closeNotification}
        autoClose={notification.type === "success" || notification.type === "info"}
      />

      <NotificationModal
        visible={forgotModal}
        title="Reset password"
        message="Contact your administrator or PESO office for assistance resetting your password."
        type="info"
        onClose={() => setForgotModal(false)}
        autoClose={false}
      />
    </SafeAreaView>
  );
}
