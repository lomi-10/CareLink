// components/landing/web/StatsBand.tsx
//
// WHAT THIS USED TO SAY, AND WHY IT DOESN'T
//
// "12,450+ Verified Helpers · 8,230+ Active Families · 25,860+ Successful
// Placements · 18,320+ Contracts Generated" — every one of those invented, on
// a system that has not launched. A panel asks where a number came from, and
// there is no recovery from "we made it up".
//
// These four replace them. Each is a commitment the system actually keeps, and
// each can be checked by reading the source:
//
//   ₱0        no helper-side payment surface exists anywhere in the app
//   ₱6,400    backend/shared/wage_floor.php, enforced at every entry point
//   2         backend/shared/account_credentials.php — the PESO bar
//   RA 10361  backend/contracts/bk1_template.php
//
// A number that survives being questioned is worth more than a bigger one that
// does not.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FontFamily } from "@/constants/GlobalStyles";
import { layout } from "./theme";
import { useLandingTheme, type LandingPalette } from "./landingTheme";

const COMMITMENTS: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }[] = [
  { icon: "wallet",            value: "₱0",       label: "Charged to helpers, ever" },
  { icon: "cash",              value: "₱6,400",   label: "Regional minimum wage enforced" },
  { icon: "shield-checkmark",  value: "2",        label: "Credentials PESO verifies, both sides" },
  { icon: "document-text",     value: "RA 10361", label: "Every contract built to the statute" },
];

export function StatsBand() {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[layout.container, layout.section]}>
      <LinearGradient colors={c.brownGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.statsBand}>
        <Text style={s.bandHeading}>What CareLink commits to</Text>
        <View style={s.statsRow}>
          {COMMITMENTS.map((st) => (
            <View key={st.label} style={s.statItem}>
              <View style={s.statIconWrap}>
                <Ionicons name={st.icon} size={18} color={c.gold} />
              </View>
              <View style={{ flex: 1 }}>
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
  bandHeading: {
    fontSize: 13, fontFamily: FontFamily.fredokaSemiBold, color: c.gold,
    letterSpacing: 1.4, opacity: 0.85, marginBottom: 24,
  },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 24, justifyContent: "space-between" },
  statItem: { flexDirection: "row", alignItems: "center", gap: 12, minWidth: 230, flexGrow: 1, flexBasis: 230 },
  statIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontFamily: FontFamily.fredokaSemiBold, color: c.gold, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: FontFamily.fredokaRegular, color: c.gold, opacity: 0.8 },
});
