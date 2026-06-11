// app/(auth)/login.tsx
// PHP: auth/login.php (via useLoginForm hook)
// Mobile: warm cream background with layered decorative elements
// Web:    dark gradient centered layout  (desktop ≥ 1024)

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { NotificationModal } from "@/components/shared/NotificationModal";
import { useLoginForm } from "@/hooks/auth/useLoginForm";
import { m, d } from "./login.styles";

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [forgotModal, setForgotModal] = useState(false);

  const {
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    loading, isLocked,
    notification, closeNotification,
    handleLogin, router,
  } = useLoginForm();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // ── Desktop ────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
        <LinearGradient
          colors={["#422919", "#2A1608", "#1A0D04"]}
          style={StyleSheet.absoluteFill}
        />

        {/* ============================================
            📸  WEB BACKGROUND IMAGE
            Full-screen illustration or photo behind the card.
            ============================================
        <Image
          source={require("../../assets/login/web-bg.png")}
          style={d.webBgIllustration}
          contentFit="cover"
          pointerEvents="none"
        />
        */}

        {/* ============================================
            🌿  WEB DECORATIVE: LEFT PANEL ILLUSTRATION
            Large illustration anchored to the left side.
            ============================================
        <Image
          source={require("../../assets/login/web-decor-left.png")}
          style={d.webDecorLeft}
          contentFit="contain"
          pointerEvents="none"
        />
        */}

        {/* ============================================
            🛋️  WEB DECORATIVE: RIGHT PANEL ILLUSTRATION
            Scene / lifestyle image on the right.
            ============================================
        <Image
          source={require("../../assets/login/web-decor-right.png")}
          style={d.webDecorRight}
          contentFit="contain"
          pointerEvents="none"
        />
        */}

        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={d.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={d.container}>

                {/* Brand */}
                <View style={d.brandRow}>
                  <CareLinkLogoMark size={52} />
                  <Text style={d.brandName}>
                    <Text style={d.brandCare}>Care</Text>
                    <Text style={d.brandLink}>Link</Text>
                  </Text>
                </View>

                <Text style={d.title}>Welcome back!</Text>
                <Text style={d.subtitle}>
                  Sign in to continue. Parents and helpers use this app.
                </Text>

                {/* Card */}
                <View style={d.card}>
                  <FieldBlock
                    icon="mail"
                    label="Email address"
                    styles={d}
                  >
                    <TextInput
                      style={d.input}
                      placeholder="Enter your email"
                      placeholderTextColor="#B8956A"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </FieldBlock>

                  <FieldBlock icon="lock-closed" label="Password" styles={d}>
                    <View style={d.pwRow}>
                      <TextInput
                        style={d.pwInput}
                        placeholder="Enter your password"
                        placeholderTextColor="#B8956A"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off" : "eye"}
                          size={20}
                          color="#9A7B5A"
                        />
                      </TouchableOpacity>
                    </View>
                  </FieldBlock>

                  <TouchableOpacity
                    style={d.forgotRow}
                    onPress={() => setForgotModal(true)}
                  >
                    <Text style={d.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[d.signInBtn, isLocked && { opacity: 0.5 }]}
                    onPress={handleLogin}
                    disabled={isLocked || loading}
                    activeOpacity={0.88}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={18} color="#fff" />
                        <Text style={d.signInTxt}>
                          {isLocked ? "Temporarily locked" : "Sign in"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={d.orRow}>
                    <View style={d.orLine} />
                    <Text style={d.orText}>OR</Text>
                    <View style={d.orLine} />
                  </View>

                  {/* Staff login — web only */}
                  <TouchableOpacity
                    style={d.staffBtn}
                    onPress={() => router.push("/admin/adminlogin")}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="person" size={17} color="#2A1608" />
                    <Text style={d.staffTxt}>Staff login (Admin / PESO)</Text>
                    <Ionicons name="chevron-forward" size={15} color="#9A7B5A" />
                  </TouchableOpacity>

                  <View style={d.signupRow}>
                    <Text style={d.signupText}>Don't have an account? </Text>
                    <Pressable onPress={() => router.push("/(auth)/role-selection")}>
                      <Text style={d.signupLink}>Sign up</Text>
                    </Pressable>
                  </View>
                </View>

                <TouchableOpacity
                  style={d.backRow}
                  onPress={() => router.push("/")}
                >
                  <Ionicons name="home" size={16} color="#E86019" />
                  <Text style={d.backText}>Back to home</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

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
      </View>
    );
  }

  // ── Mobile ─────────────────────────────────────────────────────────────────
  return (
    <View style={m.page}>

      {/* ============================================
          🎨  BASE BACKGROUND
          Warm cream — always the base layer.
          ============================================ */}

      {/* ============================================
          📸  BACKGROUND PHOTO
          Full-screen room/interior photo.
          Low opacity or blurred version works best.
          ============================================
      <Image
        source={require("../../assets/login/bg-room.png")}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        pointerEvents="none"
      />
      */}

      {/* ============================================
          🌿  DECORATIVE: PLANT — BOTTOM LEFT
          Large plant illustration anchored to bottom-left.
          Adjust m.plantLeft in login.styles.ts for sizing.
          ============================================
      <Image
        source={require("../../assets/login/plant-left.png")}
        style={m.plantLeft}
        contentFit="contain"
        pointerEvents="none"
      />
      */}

      {/* ============================================
          🛋️  DECORATIVE: ROOM SCENE — BOTTOM RIGHT
          Shelf / photo frames / armchair scene.
          Adjust m.roomRight in login.styles.ts for sizing.
          ============================================
      <Image
        source={require("../../assets/login/room-right.png")}
        style={m.roomRight}
        contentFit="contain"
        pointerEvents="none"
      />
      */}

      {/* ============================================
          ✨  FLOATING ACCENTS
          Small hearts, house icons, dots, etc.
          Adjust m.heartAccent / m.houseAccent in login.styles.ts.
          ============================================
      <Image
        source={require("../../assets/login/heart-accent.png")}
        style={m.heartAccent}
        pointerEvents="none"
      />
      <Image
        source={require("../../assets/login/house-accent.png")}
        style={m.houseAccent}
        pointerEvents="none"
      />
      */}

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={m.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand header */}
            <View style={m.brandRow}>
              <CareLinkLogoMark size={64} />
              <Text style={m.brandName}>
                <Text style={m.brandCare}>Care</Text>
                <Text style={m.brandLink}>Link</Text>
              </Text>
            </View>

            <Text style={m.title}>Welcome back!</Text>
            <Text style={m.subtitle}>
              Sign in to continue. Parents and helpers use this app; staff use
              the portal link.
            </Text>

            {/* White card */}
            <View style={m.card}>
              <FieldBlock icon="mail" label="Email address" styles={m}>
                <TextInput
                  style={m.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#B8956A"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </FieldBlock>

              <FieldBlock icon="lock-closed" label="Password" styles={m}>
                <View style={m.pwRow}>
                  <TextInput
                    style={m.pwInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#B8956A"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#9A7B5A"
                    />
                  </TouchableOpacity>
                </View>
              </FieldBlock>

              <TouchableOpacity
                style={m.forgotRow}
                onPress={() => setForgotModal(true)}
              >
                <Text style={m.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[m.signInBtn, isLocked && { opacity: 0.5 }]}
                onPress={handleLogin}
                disabled={isLocked || loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color="#fff" />
                    <Text style={m.signInTxt}>
                      {isLocked ? "Temporarily locked" : "Sign in"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={m.orRow}>
                <View style={m.orLine} />
                <Text style={m.orText}>OR</Text>
                <View style={m.orLine} />
              </View>

              {/* Sign up — replaces staff login on mobile */}
              <TouchableOpacity
                style={m.signUpBtn}
                onPress={() => router.push("/(auth)/role-selection")}
                activeOpacity={0.88}
              >
                <Ionicons name="person-add-outline" size={18} color="#2A1608" />
                <Text style={m.signUpTxt}>Sign up</Text>
                <Ionicons name="chevron-forward" size={16} color="#9A7B5A" />
              </TouchableOpacity>
            </View>

            {/* Back to home */}
            <TouchableOpacity
              style={m.backRow}
              onPress={() => router.push("/")}
            >
              <Ionicons name="home" size={18} color="#E86019" />
              <Text style={m.backText}>Back to home</Text>
            </TouchableOpacity>

            {/* Trust badges */}
            <View style={m.trustRow}>
              <TrustBadge icon="shield-checkmark" label="PESO-verified" />
              <TrustBadge icon="star"             label="DOLE-ready" />
              <TrustBadge icon="heart"            label="Built for you" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

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
    </View>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function FieldBlock({
  icon, label, styles: st, children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  styles: { fieldBlock: object; fieldLabel: object; iconCircle: object; fieldLabelText: object };
  children: React.ReactNode;
}) {
  return (
    <View style={st.fieldBlock}>
      <View style={st.fieldLabel}>
        <View style={st.iconCircle}>
          <Ionicons name={icon} size={15} color="#2A1608" />
        </View>
        <Text style={st.fieldLabelText}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

function TrustBadge({
  icon, label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={m.trustBadge}>
      <Ionicons name={icon} size={14} color="#7A4E2A" />
      <Text style={m.trustText}>{label}</Text>
    </View>
  );
}
