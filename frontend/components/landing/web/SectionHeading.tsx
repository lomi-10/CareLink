// components/landing/web/SectionHeading.tsx
// Small "— Label —" heading used by How It Works / Employment Management.
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FontFamily } from "@/constants/GlobalStyles";
import { ORANGE, TEXT_LIGHT } from "./theme";

export function SectionHeading({ label, centered = false }: { label: string; centered?: boolean }) {
  return (
    <View style={[s.headingRow, centered && { justifyContent: "center" }]}>
      <View style={s.headingDash} />
      <Text style={s.headingTxt}>{label}</Text>
      <View style={s.headingDash} />
    </View>
  );
}

const s = StyleSheet.create({
  headingRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 44, justifyContent: "center" },
  headingDash: { width: 40, height: 2, backgroundColor: ORANGE, borderRadius: 1 },
  headingTxt: { fontSize: 28, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT, letterSpacing: -0.5 },
});
