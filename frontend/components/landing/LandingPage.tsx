// components/landing/LandingPage.tsx
// PHP: none (public marketing page)
// Mobile: original dark-gradient design with HeroBanner + FeatureSection
// Web (desktop ≥1024): RN-based layout — fast Expo Router navigation, no iframe

import Vector from "@/assets/landing/Vector.svg";
import Logo from "@/components/branding/Logo";
import FrameComponent1 from "@/components/landing/FeatureSection";
import HeroBanner from "@/components/landing/HeroBanner";
import RadialGradient from "@/components/landing/RadialGradient";
import { Color, FontFamily, Height, Padding } from "@/constants/GlobalStyles";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";

// ─── Root ─────────────────────────────────────────────────────────────────────

const LandingPage = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  if (isDesktop) return <WebLanding />;

  // ── Original mobile design ─────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#140a07" }}>

      {/* 1. Base Linear Gradient */}
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={["#7a5b37", "#140a07"]}
        locations={[0, 1]}
      />

      {/* 2. Radial Glow */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <RadialGradient
          style={{ opacity: 0.5 }}
          colors={["rgba(217, 138, 58, 0.5)", "rgba(217, 138, 58, 0)"]}
          cx="50%"
          cy="0%"
          rx="50%"
          ry="50%"
        />
      </View>

      {/* 3. Main Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.landingPageScrollViewContent}
      >
        {/* Header */}
        <View style={[styles.landingPageInner, styles.logoParentLayout]}>
          <View style={styles.frameParent}>
            <View style={[styles.logoParent, styles.logoParentFlexBox]}>
              <Logo />
              <View style={styles.carelinkWrapper}>
                <Text style={styles.carelink}>
                  <Text style={styles.care}>Care</Text>
                  <Text style={styles.link}>Link</Text>
                </Text>
              </View>
            </View>
            <View style={[styles.vectorWrapper, styles.logoParentFlexBox]}>
              <Vector style={styles.vectorIcon} width={25} height={25} />
            </View>
          </View>
        </View>

        {/* Hero Section & Features */}
        <View style={styles.frameGroup}>
          <HeroBanner />
          <FrameComponent1 />
        </View>
      </ScrollView>
    </View>
  );
};

export default LandingPage;

// ─── Web (Desktop) Layout ─────────────────────────────────────────────────────

const BG      = "#0F172A";
const BG_CARD = "rgba(255,255,255,0.05)";
const BORDER  = "rgba(255,255,255,0.1)";
const TXT     = "#F8FAFC";
const TXT_MID = "#CBD5E1";
const TXT_DIM = "#94A3B8";
const ACCENT  = "#F97316";
const PRIMARY = "#2563EB";
const SUCCESS = "#10B981";

function WebLanding() {
  const router  = useRouter();
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={w.page}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={w.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── NAV ── */}
        <SafeAreaView>
          <View style={w.nav}>
            <View style={w.container}>
              <View style={w.navInner}>
                <View style={w.navBrand}>
                  <CareLinkLogoMark size={32} />
                  <Text style={w.navLogo}>CareLink</Text>
                </View>
                <View style={w.navActions}>
                  <Pressable
                    style={w.navLoginBtn}
                    onPress={() => router.push("/(auth)/login")}
                  >
                    <Text style={w.navLoginTxt}>Log in</Text>
                  </Pressable>
                  <Pressable
                    style={w.navSignupBtn}
                    onPress={() => router.push("/(auth)/role-selection")}
                  >
                    <Text style={w.navSignupTxt}>Get started</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* ── HERO ── */}
        <View style={w.heroWrap}>
          <View style={[w.blob, { top: -120, left: "20%", backgroundColor: "rgba(37,99,235,0.18)" }]} />
          <View style={[w.blob, { bottom: -80, right: "15%", backgroundColor: "rgba(249,115,22,0.14)" }]} />

          <View style={w.container}>
            <Animated.View
              style={[w.heroInner, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}
            >
              {/* Left: headline + CTA */}
              <View style={w.heroLeft}>
                <View style={w.badge}>
                  <View style={w.badgeDot} />
                  <Text style={w.badgeTxt}>PESO-verified platform</Text>
                </View>

                <Text style={w.heroTitle}>
                  Fair Work.{"\n"}
                  <Text style={{ color: ACCENT }}>Trusted Help.</Text>
                </Text>

                <Text style={w.heroSub}>
                  CareLink connects Filipino families with verified domestic helpers through
                  PESO oversight, DOLE-ready contracts, and smart document management.
                </Text>

                <View style={w.heroCta}>
                  <Pressable
                    style={({ pressed, hovered }: any) => [
                      w.ctaPrimary,
                      hovered && { opacity: 0.9 },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => router.push("/(auth)/role-selection")}
                  >
                    <Text style={w.ctaPrimaryTxt}>Get started — it's free</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </Pressable>

                  <Pressable
                    style={({ pressed, hovered }: any) => [
                      w.ctaSecondary,
                      hovered && { borderColor: "rgba(255,255,255,0.3)" },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => router.push("/(auth)/login")}
                  >
                    <Text style={w.ctaSecondaryTxt}>Log in</Text>
                  </Pressable>
                </View>
              </View>

              {/* Right: role cards */}
              <View style={w.heroRight}>
                <WebRoleCard
                  icon="people"
                  color={PRIMARY}
                  title="I'm a parent"
                  desc="Post jobs, browse PESO-verified helpers, and manage placements with confidence."
                  onPress={() => router.push({ pathname: "/(auth)/signup", params: { role: "parent" } })}
                />
                <WebRoleCard
                  icon="briefcase"
                  color={SUCCESS}
                  title="I'm a helper"
                  desc="Build your profile, upload clearances, and apply to trusted employers near you."
                  onPress={() => router.push({ pathname: "/(auth)/signup", params: { role: "helper" } })}
                />
              </View>
            </Animated.View>
          </View>
        </View>

        {/* ── TRUST STRIP ── */}
        <View style={w.sectionDivider}>
          <View style={w.container}>
            <View style={w.trustRow}>
              <WebTrustPill icon="shield-checkmark" color={SUCCESS}  label="PESO verified"    sub="Government-backed clearances" />
              <WebTrustPill icon="document-text"    color={PRIMARY}  label="DOLE contracts"   sub="Auto-generated, RA 10361" />
              <WebTrustPill icon="lock-closed"      color={ACCENT}   label="Secure documents" sub="Encrypted file handling" />
              <WebTrustPill icon="star"             color="#F59E0B"  label="Smart matching"   sub="Filters by skill & location" />
            </View>
          </View>
        </View>

        {/* ── HOW IT WORKS ── */}
        <View style={[w.section, w.container]}>
          <Text style={w.sectionEyebrow}>How it works</Text>
          <Text style={w.sectionTitle}>Three steps to get started</Text>
          <View style={w.stepsRow}>
            <WebStep n="1" icon="person-add"       color={PRIMARY}  title="Create your account"   body="Choose parent or helper, register with basic details, and verify your contact info." />
            <WebStep n="2" icon="cloud-upload"     color={SUCCESS}  title="Upload your documents"  body="Submit IDs and clearances for PESO review. Files are encrypted and confidential." />
            <WebStep n="3" icon="checkmark-circle" color={ACCENT}   title="Connect and manage"     body="Once approved, post jobs, apply, schedule interviews, and manage placements in one place." />
          </View>
        </View>

        {/* ── BOTTOM CTA ── */}
        <View style={[w.section, w.container]}>
          <LinearGradient
            colors={["#1E3A5F", "#0F172A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={w.bottomCta}
          >
            <View style={[w.blob, { top: -60, right: "10%", width: 160, height: 160, backgroundColor: "rgba(37,99,235,0.15)" }]} />
            <Text style={w.ctaCardTitle}>Ready to find your match?</Text>
            <Text style={w.ctaCardSub}>
              Join Filipino families and kasambahays who trust CareLink for safe, verified connections.
            </Text>
            <Pressable
              style={({ pressed, hovered }: any) => [
                w.ctaCardBtn,
                hovered && { opacity: 0.9 },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => router.push("/(auth)/role-selection")}
            >
              <Text style={w.ctaCardBtnTxt}>Sign up — it's free</Text>
              <Ionicons name="arrow-forward" size={16} color={PRIMARY} />
            </Pressable>
          </LinearGradient>
        </View>

        {/* ── FOOTER ── */}
        <View style={w.footer}>
          <View style={w.container}>
            <View style={w.footerInner}>
              <View style={w.navBrand}>
                <CareLinkLogoMark size={24} />
                <Text style={w.footerBrand}>CareLink</Text>
              </View>
              <Text style={w.footerTxt}>Philippines · 2026 · PESO-aligned capstone platform</Text>
              <Pressable onPress={() => router.push("/(auth)/login")}>
                <Text style={w.footerLink}>Log in →</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Web sub-components ───────────────────────────────────────────────────────

function WebRoleCard({
  icon, color, title, desc, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed, hovered }: any) => [
        w.roleCard,
        hovered && { borderColor: color, transform: [{ translateY: -4 }] },
        pressed && { opacity: 0.9 },
      ]}
      onPress={onPress}
    >
      <View style={[w.roleIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[w.roleTitle, { color }]}>{title}</Text>
      <Text style={w.roleDesc}>{desc}</Text>
      <View style={[w.roleArrow, { backgroundColor: color }]}>
        <Ionicons name="arrow-forward" size={14} color="#fff" />
      </View>
    </Pressable>
  );
}

function WebTrustPill({
  icon, color, label, sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  sub: string;
}) {
  return (
    <View style={w.trustPill}>
      <View style={[w.trustIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={w.trustLabel}>{label}</Text>
        <Text style={w.trustSub}>{sub}</Text>
      </View>
    </View>
  );
}

function WebStep({
  n, icon, color, title, body,
}: {
  n: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  body: string;
}) {
  return (
    <View style={w.stepCard}>
      <View style={[w.stepIconWrap, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[w.stepNum, { color }]}>Step {n}</Text>
      <Text style={w.stepTitle}>{title}</Text>
      <Text style={w.stepBody}>{body}</Text>
    </View>
  );
}

// ─── Mobile styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  landingPageScrollViewContent: {
    flexDirection: "column",
    paddingHorizontal: 15,
    paddingTop: 38,
    paddingBottom: 10,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 10,
    flexGrow: 1,
  },
  logoParentLayout: {
    height: Height.height_50,
    flexDirection: "row",
  },
  logoParentFlexBox: {
    zIndex: 3,
    alignItems: "center",
  },
  landingPageInner: {
    width: "100%",
    paddingLeft: 11,
    alignItems: "flex-start",
    flexDirection: "row",
    height: Height.height_50,
  },
  frameParent: {
    width: "100%",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  logoParent: {
    gap: 10,
    flexDirection: "row",
    height: Height.height_50,
  },
  carelinkWrapper: {
    paddingTop: Padding.padding_9,
    alignItems: "flex-start",
  },
  carelink: {
    fontSize: 25,
    textAlign: "center",
    zIndex: 3,
    fontFamily: FontFamily.fredokaSemiBold,
  },
  care: {
    color: Color.colorWhite,
  },
  link: {
    color: Color.colorChocolate100,
  },
  vectorWrapper: {
    justifyContent: "flex-end",
    paddingBottom: 12,
    width: 25,
  },
  vectorIcon: {
    color: Color.colorSilver,
    width: 25,
    zIndex: 3,
  },
  frameGroup: {
    width: "100%",
    zIndex: 3,
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
});

// ─── Web styles ───────────────────────────────────────────────────────────────

const CONTAINER_MAX = 1100;

const w = StyleSheet.create({
  page:   { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingBottom: 0 },

  container: {
    width: "100%",
    maxWidth: CONTAINER_MAX,
    alignSelf: "center",
    paddingHorizontal: 32,
  },

  nav: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    paddingVertical: 14,
  },
  navInner:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBrand:    { flexDirection: "row", alignItems: "center", gap: 10 },
  navLogo:     { fontSize: 20, fontWeight: "800", color: TXT, letterSpacing: -0.4 },
  navActions:  { flexDirection: "row", alignItems: "center", gap: 12 },
  navLoginBtn: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 999, borderWidth: 1, borderColor: BORDER,
  },
  navLoginTxt:  { fontSize: 14, fontWeight: "700", color: TXT },
  navSignupBtn: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 999, backgroundColor: ACCENT,
  },
  navSignupTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },

  heroWrap:  { paddingVertical: 80, overflow: "hidden" },
  heroInner: { flexDirection: "row", gap: 56, alignItems: "center" },
  heroLeft:  { flex: 1 },
  heroRight: { width: 360, gap: 16 },

  blob: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    pointerEvents: "none",
  } as any,

  badge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(16,185,129,0.12)",
    borderWidth: 1, borderColor: "rgba(16,185,129,0.25)",
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: "flex-start", marginBottom: 20,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: SUCCESS },
  badgeTxt: { fontSize: 12, fontWeight: "700", color: SUCCESS },

  heroTitle: {
    fontSize: 52, fontWeight: "800", color: TXT,
    lineHeight: 62, letterSpacing: -1.5, marginBottom: 18,
  },
  heroSub: {
    fontSize: 16, color: TXT_MID, lineHeight: 26,
    marginBottom: 32, maxWidth: 480,
  },

  heroCta:       { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  ctaPrimary:    {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: ACCENT, borderRadius: 12,
    paddingHorizontal: 22, paddingVertical: 14,
  },
  ctaPrimaryTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },
  ctaSecondary:  {
    paddingHorizontal: 22, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
  },
  ctaSecondaryTxt: { fontSize: 15, fontWeight: "700", color: TXT },

  roleCard: {
    backgroundColor: BG_CARD,
    borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    padding: 20, gap: 8,
    transitionDuration: "200ms",
  } as any,
  roleIcon:  {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  roleTitle: { fontSize: 16, fontWeight: "800" },
  roleDesc:  { fontSize: 13, color: TXT_DIM, lineHeight: 20, flex: 1 },
  roleArrow: {
    width: 30, height: 30, borderRadius: 999,
    alignItems: "center", justifyContent: "center", alignSelf: "flex-end",
  },

  sectionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER, paddingVertical: 28,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  trustRow:  { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  trustPill: {
    flex: 1, minWidth: 200,
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: BG_CARD, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  trustIcon:  { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  trustLabel: { fontSize: 13, fontWeight: "700", color: TXT, marginBottom: 2 },
  trustSub:   { fontSize: 12, color: TXT_DIM },

  section:        { paddingVertical: 60 },
  sectionEyebrow: {
    fontSize: 11, fontWeight: "800", color: ACCENT,
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 32, fontWeight: "800", color: TXT,
    letterSpacing: -0.8, marginBottom: 36,
  },
  stepsRow: { flexDirection: "row", gap: 24, flexWrap: "wrap" },
  stepCard: {
    flex: 1, minWidth: 220,
    backgroundColor: BG_CARD, borderRadius: 18,
    padding: 24, borderWidth: 1, borderColor: BORDER, gap: 8,
  },
  stepIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  stepNum:   { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  stepTitle: { fontSize: 16, fontWeight: "700", color: TXT },
  stepBody:  { fontSize: 13, color: TXT_DIM, lineHeight: 21 },

  bottomCta: {
    borderRadius: 24, padding: 48,
    overflow: "hidden", gap: 12,
  },
  ctaCardTitle: { fontSize: 28, fontWeight: "800", color: TXT, letterSpacing: -0.5 },
  ctaCardSub:   { fontSize: 15, color: TXT_MID, lineHeight: 24, maxWidth: 520, marginBottom: 8 },
  ctaCardBtn:   {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 22, paddingVertical: 14, alignSelf: "flex-start",
  },
  ctaCardBtnTxt: { fontSize: 15, fontWeight: "800", color: PRIMARY },

  footer: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
    paddingVertical: 24,
  },
  footerInner: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", flexWrap: "wrap", gap: 12,
  },
  footerBrand: { fontSize: 16, fontWeight: "800", color: TXT_MID },
  footerTxt:   { fontSize: 12, color: TXT_DIM },
  footerLink:  { fontSize: 13, fontWeight: "700", color: ACCENT },
});
