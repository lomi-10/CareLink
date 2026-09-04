// components/landing/web/Hero.tsx
//
// Full-viewport hero: one centred statement, one action.
//
// The action sits at the BOTTOM CENTRE rather than in the top-right nav. Up
// there it competed with Log in and the theme switch for the same glance; here
// the eye finishes the headline and lands on it. It does not leave the page —
// it scrolls to the role section directly below, so choosing between hiring
// and looking for work costs a scroll instead of a page load.
//
// Height is floored and capped rather than left to the content: sized to its
// text, the photograph stopped partway down a tall window and the page ground
// showed underneath it as a dark band.

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { FontFamily } from "@/constants/GlobalStyles";
import { useLandingTheme, type LandingPalette, type SectionKey } from "./landingTheme";

export function Hero({
  router,
  onNavigate,
}: {
  router: ReturnType<typeof useRouter>;
  onNavigate: (key: SectionKey) => void;
}) {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { height } = useWindowDimensions();
  const [hover, setHover] = useState(false);

  // Fill the window, floored so a short laptop cannot crush the headline and
  // capped so a tall monitor does not strand the next section a screen below.
  const heroHeight = Math.max(660, Math.min(height || 800, 920));

  return (
    <View style={[s.heroWrap, { minHeight: heroHeight }]}>
      <Image source={require("@/assets/landing/hero-photo.png")} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={c.heroOverlay} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.4 }} style={StyleSheet.absoluteFill} />
      {/* A second wash from the bottom so the photograph meets the section
          below it instead of ending on a hard horizontal edge. */}
      <LinearGradient colors={["transparent", "transparent", c.bg]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={s.center}>
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
      </View>

      {/* Bottom centre, deliberately. It is the only action in the hero, and
          putting it here means the eye finishes the headline and lands on it —
          rather than hunting the top-right corner, where it used to live and
          competed with Log in and the theme switch for the same glance. */}
      <Pressable
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        onPress={() => onNavigate("roles")}
        style={[
          s.getStarted,
          {
            backgroundColor: c.accent,
            ...(Platform.OS === "web"
              ? ({ transition: "transform 200ms ease, box-shadow 200ms ease", cursor: "pointer",
                   boxShadow: hover ? `0 16px 40px -14px ${c.accent}` : "none" } as object)
              : null),
            transform: [{ translateY: hover ? -3 : 0 }],
          },
        ]}
      >
        <Text style={s.getStartedTxt}>Get started</Text>
        <Ionicons name="arrow-down" size={17} color="#fff" />
      </Pressable>
    </View>
  );
}

const makeStyles = (c: LandingPalette) => StyleSheet.create({
  heroWrap: { position: "relative", overflow: "hidden", backgroundColor: c.bg2, justifyContent: "center", alignItems: "center" },
  center: { width: "100%", maxWidth: 760, paddingHorizontal: 32, alignItems: "center", paddingBottom: 40 },

  badge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "rgba(246,196,83,0.15)", borderWidth: 1, borderColor: "rgba(246,196,83,0.4)",
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 22,
  },
  badgeTxt: { fontSize: 11, fontFamily: FontFamily.fredokaSemiBold, color: c.gold, letterSpacing: 0.6 },

  heroTitle: {
    fontSize: 56, fontFamily: FontFamily.fredokaSemiBold, color: c.text,
    lineHeight: 64, letterSpacing: -1.4, marginBottom: 20, textAlign: "center",
  },
  heroSub: {
    fontSize: 17, fontFamily: FontFamily.fredokaRegular, color: c.textMuted,
    lineHeight: 28, textAlign: "center", maxWidth: 620,
  },

  getStarted: {
    position: "absolute", bottom: 52, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 15, paddingHorizontal: 30, paddingVertical: 16,
  },
  getStartedTxt: { fontSize: 16, fontFamily: FontFamily.fredokaSemiBold, color: "#fff" },
});
