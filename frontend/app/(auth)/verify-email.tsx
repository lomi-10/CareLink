// app/(auth)/verify-email.tsx
// PHP: auth/verify_email.php, auth/resend_verification.php
//
// Reached right after signup (and from login when an unverified user tries to
// sign in). Six single-character boxes that auto-advance, paste-aware, with a
// 60s resend cooldown that mirrors the server's.

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedLogo } from "@/components/branding/AnimatedLogo";
import { NotificationModal } from "@/components/shared/NotificationModal";
import API_URL from "@/constants/api";
import { v } from "./verify-email.styles";

const RESEND_COOLDOWN = 60; // matches CARELINK_CODE_COOLDOWN_SEC on the server

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; user_id?: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const email = (params.email ?? "").toString();
  const userId = params.user_id ? Number(params.user_id) : undefined;

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notif, setNotif] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({
    visible: false, message: "", type: "info",
  });
  const [done, setDone] = useState(false);

  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const code = digits.join("");

  const setDigit = (i: number, val: string) => {
    // Handle paste of a full code into one box.
    const clean = val.replace(/\D/g, "");
    if (clean.length > 1) {
      const next = clean.slice(0, 6).split("");
      const filled = [...digits];
      for (let k = 0; k < 6; k++) filled[k] = next[k] ?? "";
      setDigits(filled);
      inputs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) inputs.current[i + 1]?.focus();
  };

  const onKeyPress = (i: number, key: string) => {
    if (key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const submit = async (auto?: string) => {
    const value = auto ?? code;
    if (value.length !== 6 || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify_email.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value, email, user_id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setNotif({ visible: true, message: data.message || "Email verified!", type: "success" });
        setTimeout(() => router.replace("/login"), 1500);
      } else {
        setNotif({ visible: true, message: data.message || "That code didn't work.", type: "error" });
        setDigits(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
      }
    } catch {
      setNotif({ visible: true, message: "Unable to reach the server. Check your connection.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  // Auto-submit once the sixth digit lands — saves a tap.
  useEffect(() => {
    if (code.length === 6 && !busy && !done) void submit(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await fetch(`${API_URL}/auth/resend_verification.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, user_id: userId }),
      });
      const data = await res.json();
      setNotif({
        visible: true,
        message: data.message || (data.success ? "Code sent." : "Couldn't send the code."),
        type: data.success ? "success" : "error",
      });
      if (data.success) setCooldown(RESEND_COOLDOWN);
    } catch {
      setNotif({ visible: true, message: "Unable to reach the server.", type: "error" });
    } finally {
      setResending(false);
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

            <Text style={v.title}>Check your email</Text>
            <Text style={v.subtitle}>
              We sent a 6-digit code to{"\n"}
              <Text style={v.emailText}>{email || "your email address"}</Text>
            </Text>

            <View style={v.codeRow}>
              {digits.map((dgt, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { inputs.current[i] = r; }}
                  style={[v.codeBox, dgt !== "" && v.codeBoxFilled]}
                  value={dgt}
                  onChangeText={(t) => setDigit(i, t)}
                  onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={Platform.OS === "web" ? 6 : 1}
                  autoFocus={i === 0}
                  editable={!busy && !done}
                  textAlign="center"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                />
              ))}
            </View>

            <Pressable
              onPress={() => submit()}
              disabled={code.length !== 6 || busy || done}
              style={({ hovered }: any) => [
                v.btn,
                (code.length !== 6 || busy || done) && { opacity: 0.5 },
                hovered && code.length === 6 && !busy && { transform: [{ translateY: -2 }] },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="#fff" />
                  <Text style={v.btnText}>{done ? "Verified" : "Verify email"}</Text>
                </>
              )}
            </Pressable>

            <View style={v.resendRow}>
              <Text style={v.resendLabel}>Didn&apos;t get it? </Text>
              <Pressable onPress={resend} disabled={cooldown > 0 || resending}>
                <Text style={[v.resendLink, (cooldown > 0 || resending) && { color: "#B8956A" }]}>
                  {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </Text>
              </Pressable>
            </View>

            <Text style={v.hint}>
              The code expires in 15 minutes. Check your spam folder if it hasn&apos;t arrived.
            </Text>

            <Pressable
              onPress={() => router.replace("/login")}
              style={({ hovered }: any) => [v.backRow, hovered && { opacity: 0.7 }]}
            >
              <Ionicons name="arrow-back" size={16} color="#5C3A1A" />
              <Text style={v.backText}>Back to sign in</Text>
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
