// components/admin/login/LoginCard.tsx
// Floating white login form. Role (admin vs. peso) is resolved server-side
// from the credentials in app/admin/adminlogin.tsx — there is no client-side
// access-level picker, since the account's role isn't something a user gets
// to choose.
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { DARK, ORANGE } from "@/components/landing/web/theme";
import { FontFamily } from "@/constants/GlobalStyles";

type Props = {
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
  onForgotPassword: () => void;
};

export function LoginCard({
  email, password, showPassword, loading,
  onEmailChange, onPasswordChange, onTogglePassword, onSubmit, onForgotPassword,
}: Props) {
  return (
    <View style={s.card}>
      <View style={s.headerIconWrap}>
        <CareLinkLogoMark size={44} />
      </View>
      <Text style={s.brand}>
        Care<Text style={{ color: ORANGE }}>Link</Text>
      </Text>
      <Text style={s.portalLabel}>ADMINISTRATION PORTAL</Text>
      <View style={s.divider} />
      <Text style={s.subtitle}>Secure access for authorized administrators only.</Text>

      <Text style={s.label}>Email Address</Text>
      <View style={s.inputWrap}>
        <Ionicons name="mail-outline" size={18} color="#A8927A" />
        <TextInput
          style={s.input}
          placeholder="Enter your email address"
          placeholderTextColor="#A8927A"
          value={email}
          onChangeText={onEmailChange}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <Text style={s.label}>Password</Text>
      <View style={s.inputWrap}>
        <Ionicons name="lock-closed-outline" size={18} color="#A8927A" />
        <TextInput
          style={s.input}
          placeholder="Enter your password"
          placeholderTextColor="#A8927A"
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry={!showPassword}
        />
        <Pressable onPress={onTogglePassword} hitSlop={8}>
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#A8927A" />
        </Pressable>
      </View>

      <Pressable style={s.submitBtn} onPress={onSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="lock-closed" size={16} color="#fff" />
            <Text style={s.submitTxt}>Sign In Securely</Text>
          </>
        )}
      </Pressable>

      <Pressable onPress={onForgotPassword} style={{ alignSelf: "center", marginTop: 16 }}>
        <Text style={s.forgotTxt}>Forgot your password?</Text>
      </Pressable>

      <Text style={s.contactTxt}>
        Don't have administrator access? Contact your system administrator.
      </Text>

      <View style={s.noticeBox}>
        <View style={s.noticeIconWrap}>
          <Ionicons name="shield-checkmark" size={18} color={ORANGE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.noticeTitle}>Protected Administrative Environment</Text>
          <Text style={s.noticeBody}>
            All administrator actions are logged, audited, and monitored for security and
            compliance.
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: "100%", maxWidth: 380, backgroundColor: "#FFFDFA", borderRadius: 20, padding: 28,
    shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.22, shadowRadius: 32, elevation: 12,
  },
  headerIconWrap: {
    alignSelf: "center", width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#FBEFD3", alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  brand: { fontSize: 22, fontFamily: FontFamily.fredokaSemiBold, color: DARK, textAlign: "center" },
  portalLabel: { fontSize: 11, fontFamily: FontFamily.fredokaSemiBold, color: "#7C6047", textAlign: "center", letterSpacing: 1.2, marginTop: 3 },
  divider: { width: 36, height: 2, backgroundColor: ORANGE, alignSelf: "center", marginTop: 12, marginBottom: 12, borderRadius: 1 },
  subtitle: { fontSize: 12, fontFamily: FontFamily.fredokaRegular, color: "#7C6047", textAlign: "center", marginBottom: 28 },

  label: { fontSize: 11, fontFamily: FontFamily.fredokaSemiBold, color: "#2B1608", marginBottom: 5 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#EFE4D5", borderRadius: 10, paddingHorizontal: 12, height: 44,
    marginBottom: 16, backgroundColor: "#fff",
  },
  input: { flex: 1, fontSize: 13, fontFamily: FontFamily.fredokaRegular, color: DARK },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: ORANGE, borderRadius: 10, height: 46, marginTop: 6,
  },
  submitTxt: { fontSize: 13, fontFamily: FontFamily.fredokaSemiBold, color: "#fff" },
  forgotTxt: { fontSize: 12, fontFamily: FontFamily.fredokaSemiBold, color: ORANGE, textDecorationLine: "underline" },
  contactTxt: {
    fontSize: 11, fontFamily: FontFamily.fredokaRegular, color: "#A8927A",
    textAlign: "center", marginTop: 8,
  },

  noticeBox: {
    flexDirection: "row", gap: 10, marginTop: 22, padding: 14,
    backgroundColor: "#FBEFD3", borderRadius: 12,
  },
  noticeIconWrap: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  noticeTitle: { fontSize: 11, fontFamily: FontFamily.fredokaSemiBold, color: DARK, marginBottom: 2 },
  noticeBody: { fontSize: 10, fontFamily: FontFamily.fredokaRegular, color: "#7C6047", lineHeight: 14 },
});
