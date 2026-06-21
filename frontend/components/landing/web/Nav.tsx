// components/landing/web/Nav.tsx
// Transparent nav that floats over the Hero's full-bleed photo.
import { Ionicons } from "@expo/vector-icons";
import type { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { FontFamily } from "@/constants/GlobalStyles";
import { ORANGE, TEXT_LIGHT, TEXT_LIGHT_MUTED, layout, type SectionKey } from "./theme";

export function Nav({
  router,
  onNavigate,
}: {
  router: ReturnType<typeof useRouter>;
  onNavigate: (key: SectionKey) => void;
}) {
  return (
    <View style={s.nav}>
      <View style={layout.container}>
        <View style={s.navInner}>
          <View style={s.navBrand}>
            <CareLinkLogoMark size={34} />
            <Text style={s.navLogo}>
              Care<Text style={{ color: ORANGE }}>Link</Text>
            </Text>
          </View>

          <View style={s.navLinks}>
            <NavLink label="For Parents" onPress={() => onNavigate("howItWorks")} />
            <NavLink label="For Helpers" onPress={() => onNavigate("howItWorks")} />
            <NavLink label="How It Works" onPress={() => onNavigate("howItWorks")} chevron={false} />
            <NavLink label="Resources" onPress={() => onNavigate("management")} />
            <NavLink label="About Us" onPress={() => onNavigate("trust")} />
          </View>

          <View style={s.navActions}>
            <Pressable style={s.navLoginBtn} onPress={() => router.push("/(auth)/login")}>
              <Text style={s.navLoginTxt}>Log in</Text>
            </Pressable>
            <Pressable style={s.navAdminBtn} onPress={() => router.push("/admin/adminlogin" as never)}>
              <Ionicons name="shield-outline" size={13} color={TEXT_LIGHT_MUTED} />
              <Text style={s.navAdminTxt}>Admin Login</Text>
            </Pressable>
            <Pressable style={s.navGetStartedBtn} onPress={() => router.push("/(auth)/role-selection")}>
              <Text style={s.navGetStartedTxt}>Get started</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function NavLink({ label, onPress, chevron = true }: { label: string; onPress: () => void; chevron?: boolean }) {
  return (
    <Pressable style={s.navLink} onPress={onPress}>
      <Text style={s.navLinkTxt}>{label}</Text>
      {chevron && <Ionicons name="chevron-down" size={13} color={TEXT_LIGHT_MUTED} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  nav: { backgroundColor: "transparent", paddingVertical: 18 },
  navInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 9 },
  navLogo: { fontSize: 21, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT, letterSpacing: -0.3 },
  navLinks: { flexDirection: "row", alignItems: "center", gap: 22 },
  navLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  navLinkTxt: { fontSize: 14, fontFamily: FontFamily.fredokaRegular, color: TEXT_LIGHT },
  navActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  navLoginBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  navLoginTxt: { fontSize: 14, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT },
  navAdminBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  navAdminTxt: { fontSize: 13, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT_MUTED },
  navGetStartedBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: ORANGE },
  navGetStartedTxt: { fontSize: 14, fontFamily: FontFamily.fredokaSemiBold, color: "#fff" },
});
