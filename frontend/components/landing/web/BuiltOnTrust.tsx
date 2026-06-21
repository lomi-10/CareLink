// components/landing/web/BuiltOnTrust.tsx
// Full-bleed "Built on Trust. Backed by Compliance." photo section. Swap
// assets/landing/trust-photo.png, large-peso-ormoc-logo.png, and
// new-peso-ormoc-smoke.png to restyle.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FontFamily } from "@/constants/GlobalStyles";
import { CARD_GLASS, CARD_GLASS_BORDER, ORANGE, TEXT_LIGHT, TEXT_LIGHT_MUTED, PHOTO_BG, layout } from "./theme";

const ITEMS: { icon?: keyof typeof Ionicons.glyphMap; logo?: boolean; title: string; sub: string }[] = [
  { logo: true, title: "PESO Ormoc Partnership", sub: "Working with PESO Ormoc for verified placements." },
  { icon: "scale-outline", title: "RA 10361 Compliant", sub: "All contracts follow the Kasambahay Law." },
  { icon: "lock-closed-outline", title: "Data Privacy Protected", sub: "Your data is encrypted and never shared." },
  { icon: "checkmark-circle-outline", title: "Verified Identities", sub: "Multi-step verification for helpers and families." },
];

export function BuiltOnTrust() {
  return (
    <View style={s.trustWrap}>
      <Image source={require("@/assets/landing/trust-photo.png")} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={s.trustOverlay} />

      <View style={[layout.container, layout.section, s.trustInner]}>
        <View style={s.trustLeft}>
          <Text style={s.trustTitle}>Built on Trust. Backed by Compliance.</Text>
          <View style={s.trustGrid}>
            {ITEMS.map((it) => (
              <View key={it.title} style={s.trustItem}>
                <View style={s.trustIconWrap}>
                  {it.logo ? (
                    <Image source={require("@/assets/landing/large-peso-ormoc-logo.png")} style={s.trustLogoImg} contentFit="contain" />
                  ) : (
                    <Ionicons name={it.icon!} size={20} color={ORANGE} />
                  )}
                </View>
                <Text style={s.trustItemTitle}>{it.title}</Text>
                <Text style={s.trustItemSub}>{it.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.trustRight}>
          <View style={s.pesoSeal}>
            <Image source={require("@/assets/landing/new-peso-ormoc-smoke.png")} style={s.pesoSealImg} contentFit="cover" />
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  trustWrap: { position: "relative", overflow: "hidden", backgroundColor: PHOTO_BG },
  trustOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,9,4,0.85)" },
  trustInner: { flexDirection: "row", alignItems: "center", gap: 48 },
  trustLeft: { flex: 1 },
  trustTitle: { fontSize: 28, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT, letterSpacing: -0.5, marginBottom: 32, maxWidth: 420 },
  trustGrid: { flexDirection: "row", flexWrap: "wrap", gap: 24 },
  trustItem: { width: "45%", minWidth: 200 },
  trustIconWrap: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: CARD_GLASS, borderWidth: 1, borderColor: CARD_GLASS_BORDER,
    alignItems: "center", justifyContent: "center", marginBottom: 10, overflow: "hidden",
  },
  trustLogoImg: { width: 30, height: 30 },
  trustItemTitle: { fontSize: 13, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT, marginBottom: 3 },
  trustItemSub: { fontSize: 12, fontFamily: FontFamily.fredokaRegular, color: TEXT_LIGHT_MUTED, lineHeight: 17 },
  trustRight: { width: 280, alignItems: "center", justifyContent: "center" },
  pesoSeal: {
    width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5, borderColor: "rgba(246,196,83,0.35)", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  pesoSealImg: { width: "100%", height: "100%" },
});
