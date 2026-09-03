// components/landing/web/StatsBand.tsx
// Inset gradient-brown stats card with golden yellow numbers. Edit STATS to
// change the figures.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FontFamily } from "@/constants/GlobalStyles";
import { layout } from "./theme";
import { useLandingTheme, type LandingPalette } from "./landingTheme";

const STATS: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }[] = [
  { icon: "people", value: "12,450+", label: "Verified Helpers" },
  { icon: "home", value: "8,230+", label: "Active Families" },
  { icon: "hand-left", value: "25,860+", label: "Successful Placements" },
  { icon: "document-text", value: "18,320+", label: "Contracts Generated" },
];

export function StatsBand() {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[layout.container, layout.section]}>
      <LinearGradient colors={c.brownGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.statsBand}>
        <View style={s.statsRow}>
          {STATS.map((st) => (
            <View key={st.label} style={s.statItem}>
              <View style={s.statIconWrap}>
                <Ionicons name={st.icon} size={18} color={c.gold} />
              </View>
              <View>
                <Text style={s.statValue}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

const makeStyles = (c: LandingPalette) => StyleSheet.create({
  statsBand: { borderRadius: 28, paddingVertical: 36, paddingHorizontal: 36 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 24, justifyContent: "space-between" },
  statItem: { flexDirection: "row", alignItems: "center", gap: 12, minWidth: 200 },
  statIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontFamily: FontFamily.fredokaSemiBold, color: c.gold, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: FontFamily.fredokaRegular, color: c.gold, opacity: 0.8 },
});
