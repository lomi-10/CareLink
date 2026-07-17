// app/(auth)/forgot-password.tsx
// PHP: auth/request_password_reset.php, auth/reset_password.php
//
// Two steps in one screen: ask for the email, then take the code + new password.
// Replaces the old dead-end that told users to "contact your administrator".

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedLogo } from "@/components/branding/AnimatedLogo";
import { NotificationModal } from "@/components/shared/NotificationModal";
import API_URL from "@/constants/api";
import { v } from "./verify-email.styles";

const RESEND_COOLDOWN = 60;

/** Mirrors the server rules in auth/reset_password.php. */
const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notif, setNotif] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({
    visible: false, message: "", type: "info",
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const pwOk = RULES.every((r) => r.test(password));

  const requestCode = async () => {
    if (!email.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/auth/request_password_reset.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("reset");
        setCooldown(RESEND_COOLDOWN);
        setNotif({ visible: true, message: data.message, type: "info" });
      } else {
        setNotif({ visible: true, message: data.message || "Something went wrong.", type: "error" });
      }
    } catch {
      setNotif({ visible: true, message: "Unable to reach the server.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    if (busy) return;
    if (code.trim().length !== 6) {
      setNotif({ visible: true, message: "Enter the 6-digit code from your email.", type: "error" });
      return;
    }
    if (!pwOk) {
      setNotif({ visible: true, message: "Please meet all the password requirements.", type: "error" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset_password.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        setNotif({ visible: true, message: data.message || "Password updated.", type: "success" });
        setTimeout(() => router.replace("/login"), 1500);
      } else {
        setNotif({ visible: true, message: data.message || "Couldn't reset your password.", type: "error" });
      }
    } catch {
      setNotif({ visible: true, message: "Unable to reach the server.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={v.page}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[v.scroll, isDesktop && v.scrollDesktop]} keyboardShouldPersistTaps="handled">
          <View style={[v.card, isDesktop && v.cardDesktop]}>
            <View style={v.logoWrap}>
              <AnimatedLogo size={64} rings={false} glow float beat boxScale={1.3} entrance />
            </View>

            {step === "email" ? (
              <>
                <Text style={v.title}>Forgot your password?</Text>
                <Text style={v.subtitle}>
                  Enter the email you signed up with and we&apos;ll send you a 6-digit reset code.
                </Text>

                <Text style={v.fieldLabel}>Email address</Text>
                <TextInput
                  style={v.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#B8956A"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={requestCode}
                />

                <Pressable
                  onPress={requestCode}
                  disabled={!email.trim() || busy}
                  style={({ hovered }: any) => [
                    v.btn,
                    (!email.trim() || busy) && { opacity: 0.5 },
                    hovered && email.trim() && !busy && { transform: [{ translateY: -2 }] },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="mail" size={18} color="#fff" />
                      <Text style={v.btnText}>Send reset code</Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={v.title}>Choose a new password</Text>
                <Text style={v.subtitle}>
                  Enter the code we sent to{"\n"}
                  <Text style={v.emailText}>{email}</Text>
                </Text>

                <Text style={v.fieldLabel}>6-digit code</Text>
                <TextInput
                  style={v.input}
                  placeholder="123456"
                  placeholderTextColor="#B8956A"
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                />

                <Text style={v.fieldLabel}>New password</Text>
                <View style={v.pwRow}>
                  <TextInput
                    style={v.pwInput}
                    placeholder="Enter a new password"
                    placeholderTextColor="#B8956A"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPw}
                    onSubmitEditing={submitReset}
                  />
                  <TouchableOpacity onPress={() => setShowPw(!showPw)} hitSlop={8}>
                    <Ionicons name={showPw ? "eye-off" : "eye"} size={20} color="#9A7B5A" />
                  </TouchableOpacity>
                </View>

                <View style={v.rulesWrap}>
                  {RULES.map((r) => {
                    const ok = r.test(password);
                    return (
                      <View key={r.label} style={v.ruleRow}>
                        <Ionicons
                          name={ok ? "checkmark-circle" : "ellipse-outline"}
                          size={14}
                          color={ok ? "#059669" : "#C4A882"}
                        />
                        <Text style={[v.ruleText, ok && v.ruleOk]}>{r.label}</Text>
                      </View>
                    );
                  })}
                </View>

                <Pressable
                  onPress={submitReset}
                  disabled={busy || !pwOk || code.length !== 6}
                  style={({ hovered }: any) => [
                    v.btn,
                    (busy || !pwOk || code.length !== 6) && { opacity: 0.5 },
                    hovered && pwOk && code.length === 6 && !busy && { transform: [{ translateY: -2 }] },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={18} color="#fff" />
                      <Text style={v.btnText}>Reset password</Text>
                    </>
                  )}
                </Pressable>

                <View style={v.resendRow}>
                  <Text style={v.resendLabel}>Didn&apos;t get it? </Text>
                  <Pressable onPress={requestCode} disabled={cooldown > 0 || busy}>
                    <Text style={[v.resendLink, (cooldown > 0 || busy) && { color: "#B8956A" }]}>
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </Text>
                  </Pressable>
                </View>

                <Text style={v.hint}>The code expires in 15 minutes. Check your spam folder too.</Text>
              </>
            )}

            <Pressable
              onPress={() => (step === "reset" ? setStep("email") : router.replace("/login"))}
              style={({ hovered }: any) => [v.backRow, hovered && { opacity: 0.7 }]}
            >
              <Ionicons name="arrow-back" size={16} color="#5C3A1A" />
              <Text style={v.backText}>{step === "reset" ? "Use a different email" : "Back to sign in"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <NotificationModal
        visible={notif.visible}
        message={notif.message}
        type={notif.type}
        onClose={() => setNotif((n) => ({ ...n, visible: false }))}
        autoClose={notif.type !== "error"}
      />
    </View>
  );
}
