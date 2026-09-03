// components/landing/web/SectionHeading.tsx
// Small "— Label —" heading used by How It Works / Employment Management.
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FontFamily } from "@/constants/GlobalStyles";
import { useLandingTheme, type LandingPalette } from "./landingTheme";

export function SectionHeading({ label, centered = false }: { label: string; centered?: boolean }) {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[s.headingRow, centered && { justifyContent: "center" }]}>
      <View style={s.headingDash} />
      <Text style={s.headingTxt}>{label}</Text>
      <View style={s.headingDash} />
    </View>
  );
}

const makeStyles = (c: LandingPalette) => StyleSheet.create({
  headingRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 44, justifyContent: "center" },
  headingDash: { width: 40, height: 2, backgroundColor: c.accent, borderRadius: 1 },
  headingTxt: { fontSize: 28, fontFamily: FontFamily.fredokaSemiBold, color: c.text, letterSpacing: -0.5 },
});
