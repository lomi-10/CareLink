/**
 * Public marketing landing (Phase A entry). Optional hero image: see assets/landing/README.txt
 */
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { theme } from "@/constants/theme";

const { parent, helper, parentSoft, helperSoft, ink, muted, subtle, surface, surfaceElevated, line } =
  theme.color;

export function LandingScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.nav, isWeb && styles.navWeb]}>
          <Text style={styles.logo}>CareLink</Text>
          <View style={styles.navRight}>
            <Link href="/login" asChild>
              <TouchableOpacity style={styles.navGhost}>
                <Text style={styles.navGhostText}>Log in</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/(auth)/role-selection" asChild>
              <TouchableOpacity style={styles.navCta}>
                <Text style={styles.navCtaText}>Sign up</Text>
              </TouchableOpacity>
            </Link>
            {isWeb && (
              <Link href="/admin/adminlogin" asChild>
                <TouchableOpacity style={styles.navAdmin}>
                  <Ionicons name="shield-checkmark" size={16} color={muted} />
                  <Text style={styles.navAdminText}>Staff</Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>
        </View>

        <View style={[styles.hero, isWeb && styles.heroWeb]}>
          <View style={styles.heroPlaceholder}>
            <Ionicons name="home" size={48} color={subtle} />
            <Text style={styles.heroPlaceholderText}>
              Drop your hero image here and wire it in — see assets/landing/README.txt
            </Text>
          </View>
          <View style={styles.heroOverlay}>
            <Text style={styles.kicker}>Local hiring · PESO-aligned verification</Text>
            <Text style={styles.headline}>Trusted helpers. Supported families.</Text>
            <Text style={styles.lead}>
              Register as a parent or a helper, complete your profile and documents, and move through
              PESO verification before full access.
            </Text>
            <View style={styles.heroButtons}>
              <TouchableOpacity
                style={[styles.roleBtn, { borderColor: parent, backgroundColor: parentSoft }]}
                onPress={() => router.push({ pathname: "/(auth)/signup", params: { role: "parent" } })}
              >
                <Ionicons name="people" size={22} color={parent} />
                <Text style={[styles.roleBtnTitle, { color: parent }]}>I’m a parent</Text>
                <Text style={styles.roleBtnSub}>Hire trusted help</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, { borderColor: helper, backgroundColor: helperSoft }]}
                onPress={() => router.push({ pathname: "/(auth)/signup", params: { role: "helper" } })}
              >
                <Ionicons name="briefcase" size={22} color={helper} />
                <Text style={[styles.roleBtnTitle, { color: helper }]}>I’m a helper</Text>
                <Text style={styles.roleBtnSub}>Find fair work</Text>
              </TouchableOpacity>
            </View>
            <Link href="/(auth)/role-selection" asChild>
              <TouchableOpacity style={styles.secondaryCta}>
                <Text style={styles.secondaryCtaText}>Compare roles and sign up →</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <View style={styles.steps}>
          <Text style={styles.sectionTitle}>How verification works</Text>
          <View style={styles.stepRow}>
            <Step
              n={1}
              title="Create your account"
              body="Choose parent or helper and register with your basic details."
            />
            <Step
              n={2}
              title="Complete profile & documents"
              body="Add your username, personal information, and required IDs for PESO review."
            />
            <Step
              n={3}
              title="PESO decision"
              body="When approved, use the full app features for your role."
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>CareLink · Capstone / startup demo</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{n}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: surface },
  scroll: { paddingBottom: 48 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: surfaceElevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: line,
  },
  navWeb: { paddingHorizontal: 48, maxWidth: 1200, alignSelf: "center", width: "100%" },
  logo: { fontSize: 22, fontWeight: "800", color: parent, letterSpacing: -0.5 },
  navRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  navGhost: { paddingVertical: 8, paddingHorizontal: 12 },
  navGhostText: { fontSize: 15, fontWeight: "600", color: ink },
  navCta: {
    backgroundColor: parent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  navCtaText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  navAdmin: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8 },
  navAdminText: { fontSize: 14, color: muted, fontWeight: "600" },
  hero: { paddingHorizontal: 20, paddingTop: 8 },
  heroWeb: { maxWidth: 1200, alignSelf: "center", width: "100%", paddingHorizontal: 48 },
  heroPlaceholder: {
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: line,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    backgroundColor: surface,
    paddingHorizontal: 24,
  },
  heroPlaceholderText: { marginTop: 8, color: muted, textAlign: "center", fontSize: 13 },
  heroOverlay: {},
  kicker: {
    fontSize: 13,
    fontWeight: "700",
    color: parent,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  headline: {
    fontSize: Platform.OS === "web" ? 40 : 28,
    fontWeight: "800",
    color: ink,
    lineHeight: Platform.OS === "web" ? 46 : 34,
    marginBottom: 12,
  },
  lead: { fontSize: 16, color: muted, lineHeight: 24, marginBottom: 24 },
  heroButtons: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 12,
    marginBottom: 12,
  },
  roleBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    minWidth: Platform.OS === "web" ? 200 : undefined,
  },
  roleBtnTitle: { fontSize: 17, fontWeight: "800", marginTop: 8 },
  roleBtnSub: { fontSize: 13, color: muted, marginTop: 4 },
  secondaryCta: { paddingVertical: 12 },
  secondaryCtaText: { fontSize: 15, fontWeight: "700", color: parent },
  steps: {
    marginTop: 32,
    paddingHorizontal: 20,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: ink, marginBottom: 16 },
  stepRow: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 16,
  },
  step: {
    flex: 1,
    backgroundColor: surfaceElevated,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: line,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: parentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  stepBadgeText: { fontWeight: "800", color: parent, fontSize: 14 },
  stepTitle: { fontSize: 16, fontWeight: "700", color: ink, marginBottom: 6 },
  stepBody: { fontSize: 14, color: muted, lineHeight: 20 },
  footer: { marginTop: 40, alignItems: "center" },
  footerText: { fontSize: 12, color: "#94A3B8" },
});
