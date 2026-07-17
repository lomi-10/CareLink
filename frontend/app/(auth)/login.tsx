// app/(auth)/login.tsx
// PHP: auth/login.php (via useLoginForm hook)
//
// Desktop (≥1024): split layout over the full-bleed room photo —
//   left  = brand (the ONE logo) + hero copy, right = form card.
//   The card carries NO logo on purpose: the mark is already on the left, and
//   repeating it inside the card reads as a template.
// Mobile: warm cream page, logo above the card. NO staff portal — Admin/PESO are
//   web-first, so offering it on a phone would dead-end those users.

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedLogo } from "@/components/branding/AnimatedLogo";
import { NotificationModal } from "@/components/shared/NotificationModal";
import { useLoginForm } from "@/hooks/auth/useLoginForm";
import { m, d } from "./login.styles";

const WEB_BG = require("../../assets/images/login-bg-web.png");
const TRANS = { transitionDuration: "160ms", transitionProperty: "all", transitionTimingFunction: "ease" } as any;

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
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

  const modals = (
    <NotificationModal
      visible={notification.visible}
      message={notification.message}
      type={notification.type}
      onClose={closeNotification}
      autoClose={notification.type === "success" || notification.type === "info"}
    />
  );

  // ── Desktop ────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={d.page}>
        <Image source={WEB_BG} style={d.bgImage} resizeMode="cover" />
        {/* Scrim: the photo's lamp glow sits right under the hero copy, so a soft
            left-to-right darkening keeps the white text readable without dulling
            the house/family scene. */}
        <LinearGradient
          colors={["rgba(20,10,4,0.72)", "rgba(20,10,4,0.30)", "rgba(20,10,4,0.55)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

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
              <View style={d.shell}>

                {/* ── LEFT: brand + hero ── */}
                <View style={d.leftPanel}>
                  <View style={d.brandRow}>
                    <AnimatedLogo size={58} rings={false} glow float beat boxScale={1.3} entrance />
                    <View>
                      <Text style={d.brandName}>
                        <Text style={d.brandCare}>Care</Text>
                        <Text style={d.brandLink}>Link</Text>
                      </Text>
                      <Text style={d.brandTag}>Connecting homes with trusted help.</Text>
                    </View>
                  </View>

                  <Text style={d.heroTitle}>
                    Find the right help.{"\n"}
                    Build a <Text style={d.heroAccent}>better home.</Text>
                  </Text>
                  <Text style={d.heroBody}>
                    CareLink connects families with verified and reliable helpers for a safer,
                    easier, and more trusted recruitment experience.
                  </Text>

                  <Pressable
                    onPress={() => router.push("/")}
                    style={({ hovered }: any) => [d.backRow, TRANS, hovered && { opacity: 0.7 }]}
                  >
                    <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.72)" />
                    <Text style={d.backText}>Back to home</Text>
                  </Pressable>
                </View>

                {/* ── RIGHT: form card (no logo by design) ── */}
                <View style={d.card}>
                  <Text style={d.title}>Welcome back!</Text>
                  <Text style={d.subtitle}>
                    Sign in to continue. Parents and helpers use this app.
                  </Text>

                  <FieldBlock icon="mail" label="Email or mobile number" styles={d}>
                    <TextInput
                      style={d.input}
                      placeholder="you@email.com or 0917 123 4567"
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
                        onSubmitEditing={handleLogin}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                        <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9A7B5A" />
                      </TouchableOpacity>
                    </View>
                  </FieldBlock>

                  <Pressable
                    onPress={() => router.push("/(auth)/forgot-password")}
                    style={({ hovered }: any) => [d.forgotRow, TRANS, hovered && { opacity: 0.7 }]}
                  >
                    <Text style={d.forgotText}>Forgot password?</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleLogin}
                    disabled={isLocked || loading}
                    style={({ hovered, pressed }: any) => [
                      d.signInBtn,
                      TRANS,
                      isLocked && { opacity: 0.5 },
                      hovered && !isLocked && !loading && { transform: [{ translateY: -2 }], boxShadow: "0 10px 24px rgba(27,43,75,0.45)" },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={18} color="#fff" />
                        <Text style={d.signInTxt}>{isLocked ? "Temporarily locked" : "Sign in"}</Text>
                      </>
                    )}
                  </Pressable>

                  <View style={d.orRow}>
                    <View style={d.orLine} />
                    <Text style={d.orText}>OR</Text>
                    <View style={d.orLine} />
                  </View>

                  {/* Staff login — web only. Admin/PESO portals are desktop-first. */}
                  <Pressable
                    onPress={() => router.push("/admin/adminlogin")}
                    style={({ hovered }: any) => [
                      d.staffBtn,
                      TRANS,
                      hovered && { borderColor: "#E86019", backgroundColor: "#FFF9F2" },
                    ]}
                  >
                    <View style={d.staffIcon}>
                      <Ionicons name="person" size={17} color="#2A1608" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={d.staffTxt}>Continue as Staff</Text>
                      <Text style={d.staffSub}>Admin / PESO Portal</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9A7B5A" />
                  </Pressable>

                  <View style={d.signupRow}>
                    <Text style={d.signupText}>Don&apos;t have an account? </Text>
                    <Pressable
                      onPress={() => router.push("/(auth)/role-selection")}
                      style={({ hovered }: any) => [TRANS, hovered && { opacity: 0.7 }]}
                    >
                      <Text style={d.signupLink}>Sign up</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Bottom trust bar */}
            <View style={d.trustBar}>
              <TrustItem icon="shield-checkmark" title="PESO Verified" sub="Verified by PESO offices" />
              <View style={d.trustDivider} />
              <TrustItem icon="star" title="DOLE Ready" sub="Compliant with DOLE standards" />
              <View style={d.trustDivider} />
              <TrustItem icon="heart" title="Built for You" sub="Designed for Filipino families" />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {modals}
      </View>
    );
  }

  // ── Mobile ─────────────────────────────────────────────────────────────────
  return (
    <View style={m.page}>
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
            {/* Brand — the one logo */}
            <View style={m.brandRow}>
              <AnimatedLogo size={72} rings={false} glow float beat boxScale={1.3} entrance />
              <Text style={m.brandName}>
                <Text style={m.brandCare}>Care</Text>
                <Text style={m.brandLink}>Link</Text>
              </Text>
            </View>

            <Text style={m.title}>Welcome back!</Text>
            <Text style={m.subtitle}>
              Sign in to continue. Parents and helpers use this app.
            </Text>

            {/* White card */}
            <View style={m.card}>
              <FieldBlock icon="mail" label="Email or mobile number" styles={m}>
                <TextInput
                  style={m.input}
                  placeholder="you@email.com or 0917 123 4567"
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
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9A7B5A" />
                  </TouchableOpacity>
                </View>
              </FieldBlock>

              <TouchableOpacity style={m.forgotRow} onPress={() => router.push("/(auth)/forgot-password")}>
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
                    <Text style={m.signInTxt}>{isLocked ? "Temporarily locked" : "Sign in"}</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={m.orRow}>
                <View style={m.orLine} />
                <Text style={m.orText}>OR</Text>
                <View style={m.orLine} />
              </View>

              {/* Create account — mobile has no staff portal (Admin/PESO are web-first). */}
              <TouchableOpacity
                style={m.signUpBtn}
                onPress={() => router.push("/(auth)/role-selection")}
                activeOpacity={0.88}
              >
                <Ionicons name="person-add-outline" size={18} color="#2A1608" />
                <Text style={m.signUpTxt}>Create Account</Text>
                <Ionicons name="chevron-forward" size={16} color="#9A7B5A" />
              </TouchableOpacity>
            </View>

            {/* Back to home */}
            <TouchableOpacity style={m.backRow} onPress={() => router.push("/")}>
              <Ionicons name="home" size={18} color="#E86019" />
              <Text style={m.backText}>Back to Home</Text>
            </TouchableOpacity>

            {/* Trust badges */}
            <View style={m.trustRow}>
              <TrustBadge icon="shield-checkmark" label="PESO Verified" />
              <TrustBadge icon="star" label="DOLE Ready" />
              <TrustBadge icon="heart" label="Built for You" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {modals}
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

/** Desktop bottom bar item. */
function TrustItem({
  icon, title, sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
}) {
  return (
    <View style={d.trustItem}>
      <View style={d.trustIcon}>
        <Ionicons name={icon} size={18} color="#7A4E2A" />
      </View>
      <View>
        <Text style={d.trustTitle}>{title}</Text>
        <Text style={d.trustSub}>{sub}</Text>
      </View>
    </View>
  );
}

/** Mobile chip. */
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
