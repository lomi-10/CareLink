// components/landing/LandingPage.tsx
// PHP: none (public marketing page)
// Mobile: dark-brown page + header + a hero CARD + partnership footer.
//   The hero card's background is now ONE whole image (landing-bg-mobile.png) —
//   the handshake scene, plant, chair, frames and emblem are baked into it, so
//   nothing is composited from separate layers anymore. Text + the trust card
//   are overlaid on top. Everything outside the card (dark bg, header, footer)
//   is kept from the original design.
// Web (desktop ≥1024): WebLandingRedesign — dark cinematic brand redesign.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Logo from "@/components/branding/Logo";
import FrameComponent1 from "@/components/landing/FeatureSection";
import RadialGradient from "@/components/landing/RadialGradient";
import { WebLandingRedesign } from "@/components/landing/WebLandingRedesign";
import { FontFamily } from "@/constants/GlobalStyles";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HERO_BG = require("@/assets/images/landing-bg-mobile.png");

// ─── Root ─────────────────────────────────────────────────────────────────────

const LandingPage = () => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDesktop = width >= 1024;

  if (isDesktop) return <WebLandingRedesign />;

  // ── Mobile design ───────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Base dark-brown gradient + glow (unchanged) */}
      <LinearGradient style={StyleSheet.absoluteFill} colors={["#7a5b37", "#140a07"]} locations={[0, 1]} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <RadialGradient
          style={{ opacity: 0.5 }}
          colors={["rgba(217, 138, 58, 0.5)", "rgba(217, 138, 58, 0)"]}
          cx="50%" cy="0%" rx="50%" ry="50%"
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 6 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Logo />
            <Text style={styles.brand}>
              <Text style={styles.brandCare}>Care</Text>
              <Text style={styles.brandLink}>Link</Text>
            </Text>
          </View>
          <Ionicons name="menu" size={28} color="#F6E7D2" />
        </View>

        {/* ── HERO CARD — the "yellow box", now backed by the one image ── */}
        <View style={styles.hero}>
          <Image source={HERO_BG} style={styles.heroBg} contentFit="cover" />

          <View style={styles.heroContent}>
            <View style={styles.pesoPill}>
              <Ionicons name="shield-checkmark" size={13} color="#E86019" />
              <Text style={styles.pesoPillText}>PESO-VERIFIED</Text>
            </View>

            <Text style={styles.headline}>
              Trusted{"\n"}Connections,{"\n"}
              <Text style={styles.headlineAccent}>Better Lives</Text>
            </Text>

            <Text style={styles.subtitle}>
              CareLink connects families with verified helpers — safely, quickly, and with peace of mind.
            </Text>

            {/* Keeps the scene in the background visible between the copy and the card. */}
            <View style={{ flex: 1, minHeight: 130 }} />

            {/* Inner trust card + CTA */}
            <View style={styles.card}>
              <View style={styles.features}>
                <Feature icon="shield-checkmark" title="Verified Helpers" desc="All helpers are PESO-verified and DOLE-ready." />
                <View style={styles.featureDivider} />
                <Feature icon="people" title="Trusted by Families" desc="Thousands of families hire with confidence." />
                <View style={styles.featureDivider} />
                <Feature icon="time" title="Fast & Easy" desc="Simple steps to find the right match." />
              </View>

              <Pressable
                onPress={() => router.push("/(auth)/role-selection")}
                style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.ctaTitle}>Start Now</Text>
                  <Text style={styles.ctaSub}>Find or hire the right match today.</Text>
                </View>
                <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Partnership footer (unchanged) */}
        <FrameComponent1 />
      </ScrollView>
    </View>
  );
};

function Feature({ icon, title, desc }: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color="#C2703A" />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  );
}

export default LandingPage;

// ─── Mobile styles ────────────────────────────────────────────────────────────

const CARD_BG = "#FBEEDA";
const INK = "#2A1608";
const ORANGE = "#E86019";
const MUTED = "#8A6A47";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#140a07" },
  scroll: { flexGrow: 1, paddingHorizontal: 16 },

  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brand: { fontSize: 24, fontFamily: FontFamily.fredokaSemiBold },
  brandCare: { color: "#FFFFFF" },
  brandLink: { color: "#E86019" },

  // hero card (the yellow box)
  hero: {
    flex: 1,
    minHeight: 540,
    borderRadius: 28,
    overflow: "hidden",
    ...({ boxShadow: "0 18px 44px rgba(0,0,0,0.4)" } as any),
  },
  heroBg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroContent: { flex: 1, padding: 20 },

  pesoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: "rgba(232,96,25,0.4)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: 14,
  },
  pesoPillText: { fontSize: 11, fontFamily: FontFamily.fredokaSemiBold, color: "#B4531A", letterSpacing: 0.5 },
  headline: { fontSize: 38, lineHeight: 43, color: INK, fontFamily: FontFamily.fredokaSemiBold, letterSpacing: -0.5 },
  headlineAccent: { color: ORANGE },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6E4E2E",
    fontFamily: FontFamily.fredokaRegular,
    marginTop: 14,
    maxWidth: 240,
  },

  // inner trust card
  card: { backgroundColor: CARD_BG, borderRadius: 22, padding: 16 },
  features: { flexDirection: "row", alignItems: "flex-start" },
  feature: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  featureDivider: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(138,106,71,0.22)", marginVertical: 4 },
  featureIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#F4DFC0",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  featureTitle: { fontSize: 13, fontFamily: FontFamily.fredokaSemiBold, color: INK, textAlign: "center", marginBottom: 4 },
  featureDesc: { fontSize: 10.5, lineHeight: 14, fontFamily: FontFamily.fredokaRegular, color: MUTED, textAlign: "center" },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ORANGE,
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 14,
  },
  ctaTitle: { fontSize: 17, color: "#FFFFFF", fontFamily: FontFamily.fredokaSemiBold },
  ctaSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", fontFamily: FontFamily.fredokaRegular, marginTop: 1 },
});
