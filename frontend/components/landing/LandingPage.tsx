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
import React, { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LandingThemeProvider, useLandingTheme } from "./web/landingTheme";
import { Team } from "./web/Team";

const HERO_BG = require("@/assets/images/landing-bg-mobile.png");

// ─── Root ─────────────────────────────────────────────────────────────────────

const LandingPage = () => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isDesktop = width >= 1024;

  if (isDesktop) return <WebLandingRedesign />;

  return (
    <LandingThemeProvider>
      <MobileLanding router={router} />
    </LandingThemeProvider>
  );
};

function MobileLanding({ router }: { router: ReturnType<typeof useRouter> }) {
  const { c, mode, toggle } = useLandingTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef({ howItWorks: 0, team: 0 });
  const [menuVisible, setMenuVisible] = useState(false);

  const navigateTo = (key: "howItWorks" | "team") => {
    setMenuVisible(false);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: sectionY.current[key], animated: true });
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {/* Base dark-brown gradient + glow (unchanged) */}
      <LinearGradient 
        style={StyleSheet.absoluteFillObject} 
        colors={mode === "dark" ? ["#7a5b37", "#140a07"] : [c.bg, c.bg]}
        locations={[0, 1]} 
      />
      {mode === "dark" ? <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <RadialGradient
          style={styles.radialStretch}
          colors={["rgba(217, 138, 58, 0.5)", "rgba(217, 138, 58, 0)"]}
          cx="50%" 
          cy="0%" 
          rx="50%" 
          ry="50%"
        />
      </View> : null}

      {/* Scrolling fast past the end used to flash a white bar: the scroll view
          has no background of its own, so overscrolling exposed the window
          behind it. Painting it the same dark colour as the page and disabling
          the bounce/stretch removes it on both platforms. */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 6 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Logo />
            <Text style={styles.brand}>
              <Text style={{ color: c.text }}>Care</Text>
              <Text style={styles.brandLink}>Link</Text>
            </Text>
          </View>
          <Pressable
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open landing page menu"
            hitSlop={10}
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={26} color={c.text} />
          </Pressable>
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
                <Feature icon="people" title="Free for Helpers" desc="Helpers are never charged, at any stage." />
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

        <View onLayout={(event) => { sectionY.current.howItWorks = event.nativeEvent.layout.y; }}>
          <HowItWorks />
        </View>

        <View onLayout={(event) => { sectionY.current.team = event.nativeEvent.layout.y; }}>
          <Team />
        </View>

        <PrivacyPolicyCallout onPress={() => router.push("/privacy-policy")} />
        <View style={[styles.partnership, mode === "light" && styles.partnershipLight]}>
          <FrameComponent1 />
        </View>
      </ScrollView>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.menuBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} accessibilityLabel="Close menu" />
          <View style={[styles.menuPanel, { backgroundColor: c.card, borderColor: c.cardBorder, marginTop: insets.top + 54 }]}>
            <View style={styles.menuHeading}>
              <Text style={[styles.menuTitle, { color: c.text }]}>Explore CareLink</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)} accessibilityRole="button" accessibilityLabel="Close menu" hitSlop={10}>
                <Ionicons name="close" size={23} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <MenuAction icon="list-outline" label="How it works" onPress={() => navigateTo("howItWorks")} color={c} />
            <MenuAction icon="people-outline" label="Meet the team" onPress={() => navigateTo("team")} color={c} />
            <MenuAction
              icon={mode === "dark" ? "sunny-outline" : "moon-outline"}
              label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onPress={toggle}
              color={c}
            />
            <MenuAction icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => {
              setMenuVisible(false);
              router.push("/privacy-policy");
            }} color={c} />
            <View style={[styles.menuDivider, { backgroundColor: c.cardBorder }]} />
            <MenuAction icon="log-in-outline" label="Log in" onPress={() => {
              setMenuVisible(false);
              router.push("/(auth)/login");
            }} color={c} />
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                router.push("/(auth)/role-selection");
              }}
              style={[styles.menuGetStarted, { backgroundColor: c.accent }]}
            >
              <Text style={styles.menuGetStartedText}>Get started</Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MenuAction({ icon, label, onPress, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: ReturnType<typeof useLandingTheme>["c"];
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuAction} accessibilityRole="button">
      <Ionicons name={icon} size={19} color={color.accent} />
      <Text style={[styles.menuActionText, { color: color.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={color.textSubtle} />
    </Pressable>
  );
}

function HowItWorks() {
  const { c } = useLandingTheme();
  const steps = [
    { icon: "people-outline" as const, title: "Choose your role", text: "Households post a job; helpers create a profile and apply for work." },
    { icon: "chatbubbles-outline" as const, title: "Connect and interview", text: "Review applications, message each other, and arrange an interview in CareLink." },
    { icon: "document-text-outline" as const, title: "Agree and get started", text: "When both sides agree, review and sign an employment contract for the placement." },
  ];
  return (
    <View style={[styles.infoSection, { backgroundColor: c.bg }]}>
      <Text style={[styles.infoEyebrow, { color: c.accent }]}>A CLEAR PATH TO A GOOD MATCH</Text>
      <Text style={[styles.infoHeading, { color: c.text }]}>How it works</Text>
      <Text style={[styles.infoIntro, { color: c.textMuted }]}>A straightforward process for households and helpers, from the first step to a signed agreement.</Text>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <View key={step.title} style={[styles.stepCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={[styles.stepIcon, { backgroundColor: c.accentSoft }]}>
              <Ionicons name={step.icon} size={22} color={c.accent} />
            </View>
            <Text style={[styles.stepNumber, { color: c.accent }]}>STEP 0{index + 1}</Text>
            <Text style={[styles.stepTitle, { color: c.text }]}>{step.title}</Text>
            <Text style={[styles.stepText, { color: c.textMuted }]}>{step.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PrivacyPolicyCallout({ onPress }: { onPress: () => void }) {
  const { c } = useLandingTheme();
  return (
    <View style={[styles.privacyCard, { backgroundColor: c.card, borderColor: c.accent }]}>
      <View style={[styles.privacyIcon, { backgroundColor: c.accentSoft }]}>
        <Ionicons name="shield-checkmark-outline" size={22} color={c.accent} />
      </View>
      <View style={styles.privacyCopy}>
        <Text style={[styles.privacyTitle, { color: c.text }]}>Your privacy matters</Text>
        <Text style={[styles.privacyText, { color: c.textMuted }]}>Learn what information CareLink collects, how it is used, and the rights you have.</Text>
      </View>
      <Pressable onPress={onPress} style={[styles.privacyButton, { backgroundColor: c.accent }]} accessibilityRole="link">
        <Text style={styles.privacyButtonText}>Read policy</Text>
        <Ionicons name="arrow-forward" size={15} color="#fff" />
      </Pressable>
    </View>
  );
}

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
  radialStretch: {
    width: '100%',  // Forces the radial shape to stretch horizontally
    height: '100%', // Forces the radial shape to stretch vertically
    opacity: 0.5,
  },

  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  menuButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brand: { fontSize: 24, fontFamily: FontFamily.fredokaSemiBold },
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
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,8,4,0.58)",
    alignItems: "flex-end",
    paddingHorizontal: 16,
  },
  menuPanel: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 5,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  menuHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  menuTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19 },
  menuAction: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  menuActionText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 15 },
  menuDivider: { height: StyleSheet.hairlineWidth, marginVertical: 5 },
  menuGetStarted: {
    minHeight: 46,
    marginTop: 7,
    paddingHorizontal: 15,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuGetStartedText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: "#fff" },
  infoSection: { paddingVertical: 54, paddingHorizontal: 4, gap: 12 },
  infoEyebrow: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, letterSpacing: 1.2, textAlign: "center" },
  infoHeading: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 29, textAlign: "center" },
  infoIntro: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 10 },
  steps: { gap: 11 },
  stepCard: { borderWidth: 1, borderRadius: 18, padding: 17 },
  stepIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  stepNumber: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, letterSpacing: 1, marginBottom: 5 },
  stepTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, marginBottom: 5 },
  stepText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, lineHeight: 19 },
  privacyCard: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    marginVertical: 20,
  },
  privacyIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  privacyCopy: { flex: 1, minWidth: 150, gap: 3 },
  privacyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15 },
  privacyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, lineHeight: 17 },
  privacyButton: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12, borderRadius: 11 },
  privacyButtonText: { fontFamily: FontFamily.fredokaSemiBold, color: "#fff", fontSize: 12 },
  partnership: { borderRadius: 18, overflow: "hidden" },
  partnershipLight: { backgroundColor: "#3C250D" },
});
