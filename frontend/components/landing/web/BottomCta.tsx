// components/landing/web/BottomCta.tsx
// Split card: photo panel (left) + gradient-brown panel with an orange edge
// glow (right). Swap assets/landing/cta-photo.png to restyle the photo side.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FontFamily } from "@/constants/GlobalStyles";
import { CTA_EDGE_GLOW, layout } from "./theme";
import { useLandingTheme, type LandingPalette } from "./landingTheme";

export function BottomCta({ router }: { router: ReturnType<typeof useRouter> }) {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[layout.container, layout.section]}>
      <View style={s.ctaSplit}>
        <View style={s.ctaPhotoSide}>
          <Image source={require("@/assets/landing/cta-photo.png")} style={StyleSheet.absoluteFill} contentFit="cover" />
        </View>

        <LinearGradient colors={c.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaTextSide}>
          <LinearGradient
            colors={CTA_EDGE_GLOW}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.ctaEdgeGlow}
            pointerEvents="none"
          />
          <Text style={s.ctaBandTitle}>Ready to find trusted help?</Text>
          <Text style={s.ctaBandSub}>
            Join thousands of Filipino families and domestic helpers using CareLink — the
            PESO-verified platform.
          </Text>
          <View style={s.ctaBandBtns}>
            <Pressable
              style={s.ctaBandPrimary}
              onPress={() => router.push({ pathname: "/(auth)/signup", params: { role: "parent" } })}
            >
              <Text style={s.ctaBandPrimaryTxt}>Find Helpers</Text>
              <Ionicons name="arrow-forward" size={15} color="#fff" />
            </Pressable>
            <Pressable style={s.ctaBandSecondary} onPress={() => router.push("/(auth)/role-selection")}>
              <Text style={s.ctaBandSecondaryTxt}>Create Account</Text>
              <Ionicons name="arrow-forward" size={15} color={c.invText} />
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const makeStyles = (c: LandingPalette) => StyleSheet.create({
  ctaSplit: { flexDirection: "row", borderRadius: 28, overflow: "hidden", height: 360 },
  ctaPhotoSide: { width: "36%", backgroundColor: c.bg2, position: "relative", overflow: "hidden" },
  ctaTextSide: { flex: 1, padding: 44, justifyContent: "center", position: "relative", overflow: "hidden" },
  ctaEdgeGlow: { position: "absolute", top: 0, right: 0, bottom: 0, width: "60%" },
  ctaBandTitle: { fontSize: 26, fontFamily: FontFamily.fredokaSemiBold, color: "#fff", marginBottom: 10 },
  ctaBandSub: { fontSize: 14, fontFamily: FontFamily.fredokaRegular, color: "rgba(255,255,255,0.75)", lineHeight: 21, maxWidth: 420, marginBottom: 24 },
  ctaBandBtns: { flexDirection: "column", gap: 12, alignSelf: "flex-start" },
  ctaBandPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: c.accent, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 14, minWidth: 200,
  },
  ctaBandPrimaryTxt: { fontSize: 14, fontFamily: FontFamily.fredokaSemiBold, color: "#fff" },
  ctaBandSecondary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: c.invBg, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 14, minWidth: 200,
  },
  ctaBandSecondaryTxt: { fontSize: 14, fontFamily: FontFamily.fredokaSemiBold, color: c.invText },
});
