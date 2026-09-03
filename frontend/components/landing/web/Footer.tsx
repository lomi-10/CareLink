// components/landing/web/Footer.tsx
// Dark footer — brand, link row, social icons, copyright.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { FontFamily } from "@/constants/GlobalStyles";
import { layout } from "./theme";
import { useLandingTheme, type LandingPalette } from "./landingTheme";

export function Footer() {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const router = useRouter();

  return (
    <View style={s.footer}>
      <View style={[layout.container, s.footerInner]}>
        <View style={s.brand}>
          <CareLinkLogoMark size={26} />
          <Text style={s.footerBrand}>CareLink</Text>
        </View>
        <View style={s.footerLinks}>
          <Text style={s.footerLink}>About Us</Text>
          <Text style={s.footerLink}>Help Center</Text>
          <Text style={s.footerLink}>Terms of Service</Text>
          <TouchableOpacity onPress={() => router.push('/privacy-policy' as any)}>
            <Text style={s.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={s.footerLink}>Contact Us</Text>
        </View>
        <View style={s.footerSocial}>
          <Ionicons name="logo-facebook" size={18} color={c.textSubtle} />
          <Ionicons name="logo-instagram" size={18} color={c.textSubtle} />
        </View>
      </View>
      <View style={layout.container}>
        <Text style={s.footerCopy}>© 2026 CareLink. All rights reserved.</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: LandingPalette) => StyleSheet.create({
  footer: { backgroundColor: c.bg2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.cardBorder, paddingVertical: 28 },
  footerInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 14 },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  footerBrand: { fontSize: 16, fontFamily: FontFamily.fredokaSemiBold, color: c.text },
  footerLinks: { flexDirection: "row", gap: 20, flexWrap: "wrap" },
  footerLink: { fontSize: 13, fontFamily: FontFamily.fredokaRegular, color: c.textMuted },
  footerSocial: { flexDirection: "row", gap: 14 },
  footerCopy: { fontSize: 12, fontFamily: FontFamily.fredokaRegular, color: c.textSubtle },
});
