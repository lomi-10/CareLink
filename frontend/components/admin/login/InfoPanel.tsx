// components/admin/login/InfoPanel.tsx
// Left panel of the admin login screen — full-bleed photo + dark scrim with
// CareLink branding, trust stats, and compliance badges.
// Swap assets/admin/web-admin-login.png (or large-web-admin-login.png for
// higher-DPI displays) to restyle the background photo.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { CARD_GLASS_BORDER, GOLDEN, ORANGE, TEXT_LIGHT, TEXT_LIGHT_MUTED, TEXT_LIGHT_SUBTLE } from "@/components/landing/web/theme";
import { FontFamily } from "@/constants/GlobalStyles";

const OVERLAY = ["rgba(15,9,4,0.88)", "rgba(15,9,4,0.62)", "rgba(15,9,4,0.45)"] as const;

const STATS: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }[] = [
  { icon: "people", value: "4,521+", label: "Verified Helpers" },
  { icon: "home", value: "1,203+", label: "Registered Employers" },
  { icon: "briefcase", value: "317+", label: "Active Placements" },
  { icon: "document-text", value: "892+", label: "Generated Contracts" },
];

export function InfoPanel() {
  return (
    <View style={s.panel}>
      <Image source={require("@/assets/admin/web-admin-login.png")} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={OVERLAY} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.6 }} style={StyleSheet.absoluteFill} />

      <View style={s.content}>
        <View>
          <View style={s.brandRow}>
            <CareLinkLogoMark size={34} />
            <Text style={s.brandTxt}>
              Care<Text style={{ color: ORANGE }}>Link</Text>
            </Text>
          </View>

          <View style={s.badge}>
            <Ionicons name="shield-checkmark" size={13} color={GOLDEN} />
            <Text style={s.badgeTxt}>PESO-VERIFIED PLATFORM</Text>
          </View>

          <Text style={s.headline}>
            Empowering Connections,{"\n"}
            Building <Text style={{ color: ORANGE }}>Better Lives.</Text>
          </Text>

          <Text style={s.sub}>
            CareLink is the unified platform for domestic helper recruitment, verification,
            contract management, and employment oversight in partnership with PESO.
          </Text>

          <View style={s.statsRow}>
            {STATS.map((st, i) => (
              <React.Fragment key={st.label}>
                {i > 0 && <View style={s.statDiv} />}
                <View style={s.statItem}>
                  <Ionicons name={st.icon} size={20} color={ORANGE} style={{ marginBottom: 8 }} />
                  <Text style={s.statValue}>{st.value}</Text>
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View>
          <View style={s.complianceStrip}>
            <View style={s.complianceItem}>
              <Ionicons name="shield-checkmark-outline" size={26} color={ORANGE} />
              <View style={{ flex: 1 }}>
                <Text style={s.complianceSmall}>In partnership with</Text>
                <Text style={s.complianceTitle}>PESO Ormoc City</Text>
                <Text style={s.complianceSmall}>Public Employment Service Office</Text>
              </View>
            </View>
            <View style={s.complianceDiv} />
            <View style={s.complianceItem}>
              <Ionicons name="scale-outline" size={26} color={ORANGE} />
              <View style={{ flex: 1 }}>
                <Text style={s.complianceTitle}>RA 10361 Compliant</Text>
                <Text style={s.complianceSmall}>Batas Kasambahay</Text>
                <Text style={s.complianceSmall}>DOLE-Compliant Platform</Text>
              </View>
            </View>
          </View>

          <View style={s.tagline}>
            <Ionicons name="shield-checkmark" size={14} color={GOLDEN} />
            <Text style={s.taglineStrong}>Trusted. Verified. Compliant.</Text>
            <Text style={s.taglineMuted}>
              Securing quality employment for Filipino families and domestic helpers.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { flex: 1, position: "relative", overflow: "hidden", backgroundColor: "#1B0F06" },
  content: { flex: 1, justifyContent: "space-between", padding: 48 },

  brandRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 28 },
  brandTxt: { fontSize: 24, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT },

  badge: {
    flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start",
    backgroundColor: "rgba(246,196,83,0.15)", borderWidth: 1, borderColor: "rgba(246,196,83,0.4)",
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 20,
  },
  badgeTxt: { fontSize: 11, fontFamily: FontFamily.fredokaSemiBold, color: GOLDEN, letterSpacing: 0.6 },

  headline: { fontSize: 36, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT, lineHeight: 44, letterSpacing: -0.8, marginBottom: 16, maxWidth: 520 },
  sub: { fontSize: 15, fontFamily: FontFamily.fredokaRegular, color: TEXT_LIGHT_MUTED, lineHeight: 23, maxWidth: 460, marginBottom: 32 },

  statsRow: { flexDirection: "row", alignItems: "flex-start" },
  statDiv: { width: 1, height: 50, backgroundColor: CARD_GLASS_BORDER, marginHorizontal: 20 },
  statItem: { alignItems: "flex-start" },
  statValue: { fontSize: 24, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT, marginBottom: 2 },
  statLabel: { fontSize: 12, fontFamily: FontFamily.fredokaRegular, color: TEXT_LIGHT_MUTED },

  complianceStrip: {
    flexDirection: "row", borderWidth: 1, borderColor: CARD_GLASS_BORDER, borderRadius: 16,
    padding: 18, marginBottom: 20, backgroundColor: "rgba(0,0,0,0.25)",
  },
  complianceItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  complianceDiv: { width: 1, backgroundColor: CARD_GLASS_BORDER, marginHorizontal: 18 },
  complianceTitle: { fontSize: 13, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT },
  complianceSmall: { fontSize: 11, fontFamily: FontFamily.fredokaRegular, color: TEXT_LIGHT_MUTED },

  tagline: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  taglineStrong: { fontSize: 13, fontFamily: FontFamily.fredokaSemiBold, color: GOLDEN },
  taglineMuted: { fontSize: 12, fontFamily: FontFamily.fredokaRegular, color: TEXT_LIGHT_SUBTLE },
});
