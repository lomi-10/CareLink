// components/landing/web/Hero.tsx
// Full-bleed hero photo with a dark left-to-right scrim so the transparent
// nav + headline stay readable. Swap assets/landing/hero-photo.png to restyle.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FontFamily } from "@/constants/GlobalStyles";
import { Nav } from "./Nav";
import {
  BG_DARK, GOLDEN, HERO_OVERLAY, ORANGE, PHOTO_BG, TEXT_LIGHT, TEXT_LIGHT_MUTED,
  layout, type SectionKey,
} from "./theme";

export function Hero({
  router,
  onNavigate,
}: {
  router: ReturnType<typeof useRouter>;
  onNavigate: (key: SectionKey) => void;
}) {
  return (
    <View style={s.heroWrap}>
      <Image source={require("@/assets/landing/hero-photo.png")} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={HERO_OVERLAY} start={{ x: 10, y: 10 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />

      <SafeAreaView edges={["top"]}>
        <Nav router={router} onNavigate={onNavigate} />
      </SafeAreaView>

      <View style={[layout.container, s.heroContent]}>
        <View style={s.badge}>
          <Ionicons name="shield-checkmark" size={13} color={GOLDEN} />
          <Text style={s.badgeTxt}>PESO-VERIFIED PLATFORM</Text>
        </View>

        <Text style={s.heroTitle}>
          Trusted Connections,{"\n"}
          <Text style={{ color: ORANGE }}>Better Lives.</Text>
        </Text>

        <Text style={s.heroSub}>
          CareLink connects Filipino families with verified domestic helpers through PESO
          oversight, DOLE-ready contracts, and smart employment management.
        </Text>

        <View style={s.heroCtas}>
          <Pressable
            style={s.ctaPrimary}
            onPress={() => router.push({ pathname: "/(auth)/signup", params: { role: "parent" } })}
          >
            <Ionicons name="people" size={17} color="#fff" />
            <Text style={s.ctaPrimaryTxt}>Find Helpers</Text>
          </Pressable>
          <Pressable
            style={s.ctaSecondary}
            onPress={() => router.push({ pathname: "/(auth)/signup", params: { role: "helper" } })}
          >
            <Ionicons name="briefcase-outline" size={17} color={TEXT_LIGHT} />
            <Text style={s.ctaSecondaryTxt}>Join as Helper</Text>
          </Pressable>
        </View>

        <View style={s.trustRow}>
          <View style={s.avatarStack}>
            {[
              require("@/assets/landing/parentprofile.png"),
              require("@/assets/landing/helperprofile.png"),
              require("@/assets/landing/parentprofile2.png"),
              require("@/assets/landing/helperprofile2.png"),
            ].map((src, i) => (
              <View key={i} style={[s.avatarDot, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}>
                <Image source={src} style={s.avatarImg} contentFit="cover" />
              </View>
            ))}
          </View>
          <Text style={s.trustRowTxt}>Thousands of families and helpers trust CareLink</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  heroWrap: { position: "relative", overflow: "hidden", backgroundColor: PHOTO_BG, paddingBottom: 64 },
  heroContent: { maxWidth: 620, paddingTop: 48, paddingBottom: 96 },

  badge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "rgba(246,196,83,0.15)", borderWidth: 1, borderColor: "rgba(246,196,83,0.4)",
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: "flex-start", marginBottom: 18,
  },
  badgeTxt: { fontSize: 11, fontFamily: FontFamily.fredokaSemiBold, color: GOLDEN, letterSpacing: 0.6 },

  heroTitle: { fontSize: 46, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT, lineHeight: 54, letterSpacing: -1, marginBottom: 18 },
  heroSub: { fontSize: 16, fontFamily: FontFamily.fredokaRegular, color: TEXT_LIGHT_MUTED, lineHeight: 25, marginBottom: 30, maxWidth: 480 },

  heroCtas: { flexDirection: "row", gap: 14, marginBottom: 28, flexWrap: "wrap" },
  ctaPrimary: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: ORANGE, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 14,
  },
  ctaPrimaryTxt: { fontSize: 15, fontFamily: FontFamily.fredokaSemiBold, color: "#fff" },
  ctaSecondary: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 14, paddingHorizontal: 22, paddingVertical: 14,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)",
  },
  ctaSecondaryTxt: { fontSize: 15, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT },

  trustRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarStack: { flexDirection: "row" },
  avatarDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: BG_DARK, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  trustRowTxt: { fontSize: 13, fontFamily: FontFamily.fredokaRegular, color: TEXT_LIGHT_MUTED },
});
