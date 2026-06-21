// components/landing/web/HowItWorks.tsx
// "For Parents" / "For Helpers" — two glass boxes side by side, each with a
// numbered step row. Edit PARENT_STEPS / HELPER_STEPS to change the content.
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FontFamily } from "@/constants/GlobalStyles";
import { SectionHeading } from "./SectionHeading";
import {
  BG_DARK, CARD_GLASS, CARD_GLASS_BORDER, DARK, GOLDEN, ORANGE, TEXT_LIGHT, TEXT_LIGHT_MUTED,
  layout,
} from "./theme";

type Step = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string };

const PARENT_STEPS: Step[] = [
  { icon: "document-text", title: "Post a Job", body: "Tell us what you need and find the right help." },
  { icon: "people", title: "Interview Helpers", body: "Chat and interview verified applicants." },
  { icon: "checkmark-done", title: "Hire with Confidence", body: "Sign a DOLE-ready digital contract." },
  { icon: "easel", title: "Manage Employment", body: "Track attendance, tasks, leave, and more." },
];

const HELPER_STEPS: Step[] = [
  { icon: "person", title: "Build Your Profile", body: "Create your profile and showcase your skills." },
  { icon: "shield-checkmark", title: "Get Verified", body: "Submit requirements and get PESO-verified." },
  { icon: "briefcase", title: "Apply for Jobs", body: "Browse jobs and apply to trusted families." },
  { icon: "home", title: "Start Working", body: "Get hired, sign your contract, and thrive." },
];

export function HowItWorks() {
  return (
    <View style={[layout.container, layout.section]}>
      <SectionHeading label="How CareLink Works" />
      <View style={s.stepsRow}>
        <View style={s.stepsBox}>
          <StepColumn label="For Parents" badgeColor={ORANGE} steps={PARENT_STEPS} />
        </View>
        <View style={s.stepsBox}>
          <StepColumn label="For Helpers" badgeColor={GOLDEN} steps={HELPER_STEPS} />
        </View>
      </View>
    </View>
  );
}

function StepColumn({ label, badgeColor, steps }: { label: string; badgeColor: string; steps: Step[] }) {
  return (
    <View style={s.stepsCol}>
      <View style={[s.stepsColBadge, { backgroundColor: badgeColor + "26" }]}>
        <Ionicons name="person-circle-outline" size={14} color={badgeColor} />
        <Text style={[s.stepsColBadgeTxt, { color: badgeColor }]}>{label}</Text>
      </View>
      <View style={s.stepsRowInner}>
        {steps.map((st, i) => (
          <View key={st.title} style={s.stepNode}>
            <View style={s.stepNodeTop}>
              <View style={[s.stepIconWrap, { backgroundColor: badgeColor + "26" }]}>
                <Ionicons name={st.icon} size={20} color={badgeColor} />
              </View>
              <View style={[s.stepNumBadge, { backgroundColor: badgeColor }]}>
                <Text style={s.stepNumTxt}>{i + 1}</Text>
              </View>
            </View>
            {i < steps.length - 1 && <View style={[s.stepConnector, { backgroundColor: badgeColor + "40" }]} />}
            <Text style={s.stepTitle}>{st.title}</Text>
            <Text style={s.stepBody}>{st.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stepsRow: { flexDirection: "row", gap: 28 },
  stepsBox: {
    flex: 1, backgroundColor: CARD_GLASS, borderRadius: 24,
    borderWidth: 1, borderColor: CARD_GLASS_BORDER, padding: 30,
  },
  stepsCol: { flex: 1 },
  stepsColBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center",
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, marginBottom: 28,
  },
  stepsColBadgeTxt: { fontSize: 12, fontFamily: FontFamily.fredokaSemiBold, letterSpacing: 0.4 },
  stepsRowInner: { flexDirection: "row" },
  stepNode: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
  stepNodeTop: { position: "relative", marginBottom: 14 },
  stepIconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  stepNumBadge: {
    position: "absolute", bottom: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: BG_DARK,
  },
  stepNumTxt: { fontSize: 11, fontFamily: FontFamily.fredokaSemiBold, color: DARK },
  stepConnector: { position: "absolute", top: 30, left: "100%", width: 32, height: 2 },
  stepTitle: { fontSize: 13, fontFamily: FontFamily.fredokaSemiBold, color: TEXT_LIGHT, textAlign: "center", marginBottom: 4 },
  stepBody: { fontSize: 11, fontFamily: FontFamily.fredokaRegular, color: TEXT_LIGHT_MUTED, textAlign: "center", lineHeight: 16 },
});
