/**
 * CareLink Landing Screen — mobile-native redesign
 * Web: iframe to /landing.html (unchanged)
 * Native: warm-light design with role picker, trust pills, steps
 */
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { theme } from "@/constants/theme";

const {
  parent,
  helper,
  parentSoft,
  helperSoft,
  ink,
  inkMuted,
  muted,
  surface,
  surfaceElevated,
  line,
} = theme.color;

const PARENT_COLOR = parent;
const HELPER_COLOR = helper;
const ACCENT_WARM = "#F97316";
const BG_CREAM = "#FAFAF8";
const BG_HERO = "#F0F4FF";

export function LandingScreen() {
  const router = useRouter();
  const { width: W } = useWindowDimensions();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={styles.webShell}>
        {React.createElement("iframe", {
          src: "/landing.html",
          title: "CareLink",
          style: { border: "none" as const, width: "100%", height: "100vh", display: "block" },
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BG_CREAM} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── NAV ── */}
        <View style={styles.nav}>
          <View style={styles.navBrand}>
            <CareLinkLogoMark size={32} />
            <Text style={styles.navLogo}>CareLink</Text>
          </View>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.navLogin} accessibilityRole="button">
              <Text style={styles.navLoginText}>Log in</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* ── HERO ── */}
        <Animated.View
          style={[
            styles.hero,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
          ]}
        >
          <View style={styles.heroBg}>
            <View style={styles.blobTL} />
            <View style={styles.blobBR} />
          </View>

          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>PESO-verified platform</Text>
          </View>

          <Text style={styles.heroTitle}>
            Trusted helpers.{"\n"}
            <Text style={styles.heroTitleAccent}>Supported families.</Text>
          </Text>

          <Text style={styles.heroSub}>
            Connect with PESO-verified domestic helpers. Automated DOLE contracts.
            Full protection for both parties.
          </Text>

          {/* ── ROLE CARDS ── */}
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleCard, styles.roleCardParent]}
              onPress={() =>
                router.push({ pathname: "/(auth)/signup", params: { role: "parent" } })
              }
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Sign up as a parent"
            >
              <View style={[styles.roleIconWrap, { backgroundColor: PARENT_COLOR + "22" }]}>
                <Ionicons name="people" size={26} color={PARENT_COLOR} />
              </View>
              <Text style={[styles.roleCardTitle, { color: PARENT_COLOR }]}>I'm a parent</Text>
              <Text style={styles.roleCardSub}>Hire trusted help</Text>
              <View style={[styles.roleArrow, { backgroundColor: PARENT_COLOR }]}>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, styles.roleCardHelper]}
              onPress={() =>
                router.push({ pathname: "/(auth)/signup", params: { role: "helper" } })
              }
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Sign up as a helper"
            >
              <View style={[styles.roleIconWrap, { backgroundColor: HELPER_COLOR + "22" }]}>
                <Ionicons name="briefcase" size={26} color={HELPER_COLOR} />
              </View>
              <Text style={[styles.roleCardTitle, { color: HELPER_COLOR }]}>I'm a helper</Text>
              <Text style={styles.roleCardSub}>Find fair work</Text>
              <View style={[styles.roleArrow, { backgroundColor: HELPER_COLOR }]}>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <Link href="/(auth)/role-selection" asChild>
            <TouchableOpacity style={styles.compareBtn} accessibilityRole="button">
              <Text style={styles.compareBtnText}>Compare roles and sign up →</Text>
            </TouchableOpacity>
          </Link>
        </Animated.View>

        {/* ── TRUST PILLS ── */}
        <View style={styles.trustSection}>
          <TrustPill
            icon="shield-checkmark"
            color={PARENT_COLOR}
            label="PESO verified"
            sub="Government-backed checks"
          />
          <TrustPill
            icon="document-text"
            color={HELPER_COLOR}
            label="DOLE contracts"
            sub="Auto-generated, RA 10361"
          />
          <TrustPill
            icon="lock-closed"
            color={ACCENT_WARM}
            label="Secure documents"
            sub="Encrypted file handling"
          />
        </View>

        {/* ── HOW IT WORKS ── */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionLabel}>How it works</Text>
          <Text style={styles.sectionTitle}>Three steps to get started</Text>

          <StepCard
            n="1"
            icon="person-add"
            color={PARENT_COLOR}
            title="Create your account"
            body="Choose your role — parent or helper — and register with basic details."
          />
          <StepCard
            n="2"
            icon="cloud-upload"
            color={HELPER_COLOR}
            title="Upload your documents"
            body="Submit required IDs and clearances for PESO review. Secure and confidential."
          />
          <StepCard
            n="3"
            icon="checkmark-circle"
            color={ACCENT_WARM}
            title="Get approved and connect"
            body="Once PESO approves, use the full app — post jobs, apply, hire, and manage."
          />
        </View>

        {/* ── BOTTOM CTA ── */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaCard}>
            <View style={styles.ctaBlobA} />
            <Text style={styles.ctaTitle}>Ready to find your match?</Text>
            <Text style={styles.ctaSub}>
              Join Filipino families and kasambahays who trust CareLink for safe, verified
              connections.
            </Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push("/(auth)/role-selection")}
              activeOpacity={0.88}
              accessibilityRole="button"
            >
              <Text style={styles.ctaBtnText}>Get started — it's free</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>CareLink · Philippines · 2026</Text>
          <Text style={styles.footerSub}>Capstone / startup demo · PESO-aligned</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TrustPill({
  icon,
  color,
  label,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  sub: string;
}) {
  return (
    <View style={styles.trustPill}>
      <View style={[styles.trustIconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.trustLabel}>{label}</Text>
        <Text style={styles.trustSub}>{sub}</Text>
      </View>
    </View>
  );
}

function StepCard({
  n,
  icon,
  color,
  title,
  body,
}: {
  n: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepLeft}>
        <View style={[styles.stepIconWrap, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={[styles.stepLine, { backgroundColor: color + "30" }]} />
      </View>
      <View style={styles.stepRight}>
        <View style={styles.stepNumRow}>
          <Text style={[styles.stepNum, { color }]}>Step {n}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webShell: { flex: 1, backgroundColor: "#0F172A" },
  safe: { flex: 1, backgroundColor: BG_CREAM },
  scroll: { paddingBottom: 40, flexGrow: 1, backgroundColor: BG_CREAM },

  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: BG_CREAM,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.07)",
  },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 9 },
  navLogo: { fontSize: 20, fontWeight: "800", color: PARENT_COLOR, letterSpacing: -0.4 },
  navLogin: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    minHeight: 40,
    justifyContent: "center",
  },
  navLoginText: { fontSize: 14, fontWeight: "700", color: "#1E293B" },

  hero: {
    margin: 16,
    borderRadius: 24,
    backgroundColor: BG_HERO,
    padding: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.1)",
    ...Platform.select({
      ios: { shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 3 },
    }),
  },
  heroBg: { ...StyleSheet.absoluteFillObject },
  blobTL: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(37,99,235,0.07)",
    top: -80,
    left: -60,
  },
  blobBR: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(16,185,129,0.07)",
    bottom: -60,
    right: -40,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(16,185,129,0.12)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 18,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#059669" },

  heroTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 38,
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  heroTitleAccent: { color: PARENT_COLOR },
  heroSub: { fontSize: 15, color: "#475569", lineHeight: 23, marginBottom: 24 },

  roleRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  roleCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    position: "relative",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  roleCardParent: {
    backgroundColor: "#EFF6FF",
    borderColor: "rgba(37,99,235,0.2)",
  },
  roleCardHelper: {
    backgroundColor: "#F0FDF4",
    borderColor: "rgba(16,185,129,0.2)",
  },
  roleIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  roleCardTitle: { fontSize: 16, fontWeight: "800", marginBottom: 3 },
  roleCardSub: { fontSize: 12, color: "#64748B", marginBottom: 14 },
  roleArrow: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },

  compareBtn: { paddingVertical: 12, alignItems: "center" },
  compareBtnText: { fontSize: 14, fontWeight: "700", color: PARENT_COLOR },

  trustSection: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  trustPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  trustIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  trustLabel: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 1 },
  trustSub: { fontSize: 12, color: "#64748B" },

  stepsSection: {
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: PARENT_COLOR,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  stepCard: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 4,
  },
  stepLeft: { alignItems: "center", width: 46 },
  stepIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    minHeight: 24,
    marginBottom: 12,
  },
  stepRight: { flex: 1, paddingBottom: 20 },
  stepNumRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  stepNum: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  stepTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 5 },
  stepBody: { fontSize: 13, color: "#64748B", lineHeight: 20 },

  ctaSection: { marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  ctaCard: {
    borderRadius: 24,
    backgroundColor: PARENT_COLOR,
    padding: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: PARENT_COLOR, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20 },
      android: { elevation: 6 },
    }),
  },
  ctaBlobA: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -80,
    right: -60,
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  ctaSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 21,
    marginBottom: 22,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignSelf: "stretch",
  },
  ctaBtnText: { fontSize: 15, fontWeight: "800", color: PARENT_COLOR },

  footer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 3,
  },
  footerText: { fontSize: 13, fontWeight: "600", color: "#94A3B8" },
  footerSub: { fontSize: 11, color: "#CBD5E1" },
});
