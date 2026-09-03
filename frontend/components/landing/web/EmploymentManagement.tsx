// components/landing/web/EmploymentManagement.tsx
// "All-in-One Employment Management" glass card grid. Edit MANAGEMENT_ITEMS
// to add/remove/rename feature cards.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FontFamily } from "@/constants/GlobalStyles";
import { SectionHeading } from "./SectionHeading";
import { layout } from "./theme";
import { useLandingTheme, type LandingPalette } from "./landingTheme";

type ManagementItem = { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string };

const MANAGEMENT_ITEMS: ManagementItem[] = [
  { icon: "calendar-outline", title: "Attendance Tracking", sub: "Easy check-in/out and work history tracking." },
  { icon: "clipboard-outline", title: "Task Management", sub: "AI-assisted task planning and daily assignments." },
  { icon: "leaf-outline", title: "Leave Requests", sub: "Digital leave requests and approval workflow." },
  { icon: "cash-outline", title: "Payroll Records", sub: "Track salaries, payments, and payout history." },
  { icon: "document-lock-outline", title: "Contracts", sub: "Secure storage of contracts and important documents." },
  { icon: "chatbubble-ellipses-outline", title: "Messaging", sub: "Communicate easily from hiring to employment." },
];

export function EmploymentManagement() {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[layout.container, layout.section]}>
      <SectionHeading label="All-in-One Employment Management" centered />
      <View style={s.managementGrid}>
        {MANAGEMENT_ITEMS.map((it) => (
          <View key={it.title} style={s.managementCard}>
            <View style={s.managementIconWrap}>
              <Ionicons name={it.icon} size={20} color={c.accent} />
            </View>
            <Text style={s.managementTitle}>{it.title}</Text>
            <Text style={s.managementSub}>{it.sub}</Text>
            <Text style={s.managementLearnMore}>Learn more →</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: LandingPalette) => StyleSheet.create({
  managementGrid: { flexDirection: "row", flexWrap: "wrap", gap: 18, paddingHorizontal: 4 },
  managementCard: {
    width: "31%", minWidth: 240, backgroundColor: c.card, borderRadius: 18,
    borderWidth: 1, borderColor: c.cardBorder, padding: 20,
  },
  managementIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(234,111,42,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  managementTitle: { fontSize: 15, fontFamily: FontFamily.fredokaSemiBold, color: c.text, marginBottom: 5 },
  managementSub: { fontSize: 12, fontFamily: FontFamily.fredokaRegular, color: c.textMuted, lineHeight: 17, marginBottom: 12 },
  managementLearnMore: { fontSize: 12, fontFamily: FontFamily.fredokaSemiBold, color: c.accent },
});
