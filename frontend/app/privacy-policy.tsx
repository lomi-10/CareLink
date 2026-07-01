// app/privacy-policy.tsx
// Privacy Policy — linked from signup (consent checkbox) and the web landing
// page footer. Required for RA 10173 (Data Privacy Act) / NPC Circular 16-01
// compliance: what data is collected, why, who can access it, how long it's
// retained, and how users can request deletion.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontFamily } from "@/constants/GlobalStyles";

const DARK = "#2A1608";
const MUTED = "#7A5C3E";
const ACCENT = "#E86019";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.intro}>
          CareLink connects households with domestic helpers (kasambahay) in compliance with the
          Philippine Data Privacy Act of 2012 (RA 10173) and NPC Circular 16-01. This policy explains
          what personal information we collect, why we collect it, who can access it, how long we keep
          it, and how you can request that it be deleted.
        </Text>

        <Section title="What we collect">
          <Text style={s.body}>
            • Identity details you provide at signup and in your profile (name, contact number,
            address, birth date).{"\n"}
            • Government-issued identity documents you upload (Valid ID, Barangay Clearance, Police
            Clearance, TESDA NC2) for PESO verification.{"\n"}
            • Job-related information: posted jobs, applications, contracts, salary terms, attendance,
            and messages exchanged with the other party.{"\n"}
            • Account activity such as login times and device information, used only for security and
            audit purposes.
          </Text>
        </Section>

        <Section title="Why we collect it">
          <Text style={s.body}>
            We process this information to operate the recruitment and employment-matching service:
            verifying identity through PESO, matching helpers with households, generating employment
            contracts, and maintaining records required under RA 10361 (the Domestic Workers Act).
            We do not sell personal data, and we do not use it for advertising.
          </Text>
        </Section>

        <Section title="Who can access your documents">
          <Text style={s.body}>
            Your uploaded ID and clearance documents are visible only to: (1) you, the document owner;
            (2) a specific employer or helper you explicitly choose to share a document with for a
            specific job application — sharing is opt-in and per-document, never automatic; and (3)
            approved PESO staff, for verification. No one else can view these files.
          </Text>
        </Section>

        <Section title="Third-party verification">
          <Text style={s.body}>
            To help confirm that a Valid ID is genuine, the image of your Valid ID may be sent to a
            third-party identity-verification provider (Didit) which checks it against official ID
            templates and reads its details. This is an automated assistive check only — PESO staff
            still make the final verification decision. We share only the Valid ID for this purpose,
            and only when you start the scan yourself.
          </Text>
        </Section>

        <Section title="How long we keep it">
          <Text style={s.body}>
            We retain account and employment records for as long as your account is active, and for a
            reasonable period afterward to comply with labor-record and dispute-resolution obligations
            under RA 10361. Uploaded documents are retained only while relevant to an active or recently
            ended placement, or as required for PESO verification records.
          </Text>
        </Section>

        <Section title="Your rights and how to request deletion">
          <Text style={s.body}>
            Under RA 10173, you have the right to access, correct, and request deletion of your personal
            data. To request deletion of your account and associated data, contact CareLink support
            through the app's "Report an issue" feature or your registered email, identifying your
            account and the data you wish to have removed. We will respond and act on verified requests
            within a reasonable time, subject to records we are legally required to keep.
          </Text>
        </Section>

        <Section title="Changes to this policy">
          <Text style={s.body}>
            We may update this policy as the platform evolves. Material changes will be communicated
            in-app before they take effect.
          </Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFBF5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE2D0",
  },
  headerTitle: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 17,
    color: DARK,
  },
  scroll: { padding: 20, paddingBottom: 40 },
  intro: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    marginBottom: 20,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 15,
    color: ACCENT,
    marginBottom: 6,
  },
  body: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 13.5,
    lineHeight: 20,
    color: DARK,
  },
});
