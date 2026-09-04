// components/landing/web/Hero.tsx
//
// Full-viewport hero: photograph left, role choice right.
//
// TWO PROBLEMS THIS SOLVES
//
// Height. The hero used to size itself to its content, so on a tall window the
// photograph stopped partway down and the page's flat background showed
// underneath it as a dark band. A hero has to own the first screen — it is the
// only element whose job is to be the whole of what you see first.
//
// The separate role-selection screen. Choosing "I am hiring" or "I am looking
// for work" was a whole extra page on desktop, which is a click and a page load
// to answer a question that fits beside the headline. The choice now lives
// here. Mobile keeps its own route: two large cards side by side is a desktop
// shape, and stacking them on a phone just rebuilds the screen that already
// exists.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { FontFamily } from "@/constants/GlobalStyles";
import { CONTAINER_MAX, useLandingTheme, type LandingPalette, type SectionKey } from "./landingTheme";

type Role = "parent" | "helper";

const ROLES: { role: Role; icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    role: "parent",
    icon: "home-outline",
    title: "I'm hiring",
    body: "Post the work, meet verified helpers, and hire on a Kasambahay-compliant contract.",
  },
  {
    role: "helper",
    icon: "briefcase-outline",
    title: "I'm looking for work",
    body: "Build a profile, get PESO-verified, and apply to households near you. Always free.",
  },
];

function RoleCard({
  item, router,
}: {
  item: (typeof ROLES)[number];
  router: ReturnType<typeof useRouter>;
}) {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [hover, setHover] = useState(false);

  return (
    <Pressable
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onPress={() => router.push({ pathname: "/(auth)/signup", params: { role: item.role } })}
      style={[
        s.roleCard,
        {
          borderColor: hover ? c.accent : c.glassBorder,
          backgroundColor: hover ? c.accentSoft : c.glass,
          ...(Platform.OS === "web"
            ? ({
                transition: "transform 200ms ease, border-color 200ms ease, background-color 200ms ease",
                cursor: "pointer",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              } as object)
            : null),
          transform: [{ translateY: hover ? -4 : 0 }],
        },
      ]}
    >
      <View style={[s.roleIcon, { backgroundColor: hover ? c.accent : c.accentSoft }]}>
        <Ionicons name={item.icon} size={20} color={hover ? "#fff" : c.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.roleTitle}>{item.title}</Text>
        <Text style={s.roleBody}>{item.body}</Text>
      </View>
      <Ionicons name="arrow-forward" size={17} color={hover ? c.accent : c.textSubtle} />
    </Pressable>
  );
}

export function Hero({
  router,
  onNavigate,
}: {
  router: ReturnType<typeof useRouter>;
  onNavigate: (key: SectionKey) => void;
}) {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { height, width } = useWindowDimensions();

  // Fill the window, with a floor so a short laptop window does not crush the
  // headline, and a ceiling so a very tall monitor does not strand the next
  // section a full screen below the fold.
  const heroHeight = Math.max(660, Math.min(height || 800, 920));
  const stack = width < 1100;

  return (
    <View style={[s.heroWrap, { minHeight: heroHeight }]}>
      <Image source={require("@/assets/landing/hero-photo.png")} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={c.heroOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />
      {/* A second wash from the bottom so the hero meets the section below it
          instead of ending on a hard horizontal edge across the photograph. */}
      <LinearGradient
        colors={["transparent", "transparent", c.bg]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[s.container, s.row, { flexDirection: stack ? "column" : "row" }]}>
        <View style={[s.left, { maxWidth: stack ? 640 : 560 }]}>
          <View style={s.badge}>
            <Ionicons name="shield-checkmark" size={13} color={c.gold} />
            <Text style={s.badgeTxt}>PESO-VERIFIED PLATFORM</Text>
          </View>

          <Text style={s.heroTitle}>
            Trusted Connections,{"\n"}
            <Text style={{ color: c.accent }}>Better Lives.</Text>
          </Text>

          <Text style={s.heroSub}>
            CareLink connects Ormoc households with PESO-verified kasambahay — on contracts
            written to the Batas Kasambahay, with the whole placement kept on the record.
          </Text>

          <Pressable style={s.learnRow} onPress={() => onNavigate("offer")}>
            <Text style={s.learnTxt}>See what we offer</Text>
            <Ionicons name="arrow-down" size={15} color={c.accent} />
          </Pressable>
        </View>

        <View style={[s.right, { maxWidth: stack ? 640 : 430, marginTop: stack ? 34 : 0 }]}>
          <Text style={s.rolePrompt}>Get started</Text>
          {ROLES.map((r) => <RoleCard key={r.role} item={r} router={router} />)}

          <Pressable style={s.loginRow} onPress={() => router.push("/(auth)/login")}>
            <Text style={s.loginTxt}>
              Already have an account? <Text style={{ color: c.accent, fontFamily: FontFamily.fredokaSemiBold }}>Log in</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: LandingPalette) => StyleSheet.create({
  heroWrap: {
    position: "relative", overflow: "hidden", backgroundColor: c.bg2,
    justifyContent: "center",
  },
  container: {
    width: "100%", maxWidth: CONTAINER_MAX, alignSelf: "center",
    paddingHorizontal: 32, paddingTop: 96, paddingBottom: 56,
  },
  row: { alignItems: "center", gap: 56, justifyContent: "space-between" },
  left: { flex: 1 },
  right: { flex: 1, width: "100%", gap: 12 },

  badge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "rgba(246,196,83,0.15)", borderWidth: 1, borderColor: "rgba(246,196,83,0.4)",
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: "flex-start", marginBottom: 18,
  },
  badgeTxt: { fontSize: 11, fontFamily: FontFamily.fredokaSemiBold, color: c.gold, letterSpacing: 0.6 },

  heroTitle: { fontSize: 48, fontFamily: FontFamily.fredokaSemiBold, color: c.text, lineHeight: 56, letterSpacing: -1, marginBottom: 18 },
  heroSub: { fontSize: 16, fontFamily: FontFamily.fredokaRegular, color: c.textMuted, lineHeight: 26, marginBottom: 26, maxWidth: 500 },

  learnRow: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start" },
  learnTxt: { fontSize: 14.5, fontFamily: FontFamily.fredokaSemiBold, color: c.accent },

  rolePrompt: {
    fontSize: 11.5, fontFamily: FontFamily.fredokaSemiBold, color: c.textSubtle,
    letterSpacing: 1.6, marginBottom: 4,
  },
  roleCard: {
    flexDirection: "row", alignItems: "center", gap: 15,
    borderWidth: 1, borderRadius: 17, padding: 19,
  },
  roleIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  roleTitle: { fontSize: 16.5, fontFamily: FontFamily.fredokaSemiBold, color: c.text, marginBottom: 4 },
  roleBody: { fontSize: 13.5, fontFamily: FontFamily.fredokaRegular, color: c.textMuted, lineHeight: 20 },

  loginRow: { alignSelf: "flex-start", marginTop: 6 },
  loginTxt: { fontSize: 13.5, fontFamily: FontFamily.fredokaRegular, color: c.textMuted },
});
