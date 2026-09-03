// components/landing/web/FeatureStrip.tsx
// Glass card row overlapping the bottom edge of the Hero photo.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FontFamily } from "@/constants/GlobalStyles";
import { layout } from "./theme";
import { useLandingTheme, type LandingPalette } from "./landingTheme";

const ITEMS: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }[] = [
  { icon: "shield-checkmark-outline", title: "PESO Verified", sub: "All helpers are government-\nverified for your peace of mind." },
  { icon: "document-text-outline", title: "DOLE-Compliant Contracts", sub: "Auto-generated contracts\naligned with RA 10361." },
  { icon: "chatbubbles-outline", title: "Secure Communication", sub: "In-app messaging for safe\ninterviews and updates." },
  { icon: "people-outline", title: "Employment Management", sub: "Manage attendance, tasks, leave,\npayroll, and contracts." },
];

export function FeatureStrip() {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[layout.container, { marginTop: -36 }]}>
      <View style={s.featureCard}>
        {ITEMS.map((it, i) => (
          <React.Fragment key={it.title}>
            {i > 0 && <View style={s.featureDiv} />}
            <View style={s.featureItem}>
              <View style={s.featureIconWrap}>
                <Ionicons name={it.icon} size={20} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.featureTitle}>{it.title}</Text>
                <Text style={s.featureSub}>{it.sub}</Text>
              </View>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: LandingPalette) => StyleSheet.create({
  featureCard: {
    flexDirection: "row", backgroundColor: c.card, borderRadius: 22,
    borderWidth: 1, borderColor: c.cardBorder, padding: 26,
  },
  featureDiv: { width: 1, backgroundColor: c.cardBorder, marginHorizontal: 22 },
  featureItem: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  featureIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(234,111,42,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  featureTitle: { fontSize: 14, fontFamily: FontFamily.fredokaSemiBold, color: c.text, marginBottom: 3 },
  featureSub: { fontSize: 12, fontFamily: FontFamily.fredokaRegular, color: c.textMuted, lineHeight: 17 },
});
