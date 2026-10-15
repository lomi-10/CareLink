// app/terms-of-service.tsx
// Terms of Service — linked from signup (consent checkbox) and the web landing
// page footer. Defines the rules for using CareLink, the relationship between
// users and PESO Ormoc, and the responsibilities of Helpers and Employers.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontFamily } from "@/constants/GlobalStyles";

const DARK = "#2A1608";
const MUTED = "#7A5C3E";
const ACCENT = "#E86019";

/** Last substantive revision. */
const LAST_UPDATED = "15 October 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

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
        <Text style={s.headerTitle}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.column, isDesktop && s.columnDesktop]}>
          <Text style={s.updated}>Last updated {LAST_UPDATED}</Text>

          <Text style={s.intro}>
            Welcome to CareLink. By creating an account or using our platform, you agree to these
            Terms of Service. These terms govern your use of the CareLink mobile and web applications
            and the services provided through them.
          </Text>

          <Section title="1. The Nature of CareLink">
            <Text style={s.body}>
              CareLink is a platform that connects Household Employers with Domestic Helpers
              (Kasambahay) in Ormoc City. We work in coordination with the Public Employment Service
              Office (PESO) Ormoc to facilitate safe and legal employment matching.
            </Text>
            <Text style={s.body}>
              CareLink itself is not an employer, a recruitment agency, or a placement agency. We
              provide the tools for matching, verification, and contract management, but the
              employment relationship is strictly between the Employer and the Helper.
            </Text>
          </Section>

          <Section title="2. Account Eligibility and Registration">
            <Bullet>You must be at least 18 years old to create an account.</Bullet>
            <Bullet>
              You agree to provide accurate, current, and complete information during registration
               and to keep your profile updated.
            </Bullet>
            <Bullet>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account.
            </Bullet>
          </Section>

          <Section title="3. Verification and PESO's Role">
            <Text style={s.body}>
              To ensure safety and compliance with RA 10361 (Batas Kasambahay), all Helper accounts
              must undergo verification by PESO Ormoc.
            </Text>
            <Bullet>
              Verification is based on the documents you provide (Valid ID, Clearances).
            </Bullet>
            <Bullet>
              PESO reserves the right to approve, reject, or request additional information for any
              verification request.
            </Bullet>
            <Bullet>
              Employers may also be subject to review to ensure a safe working environment for
              Helpers.
            </Bullet>
          </Section>

          <Section title="4. User Responsibilities">
            <Text style={s.strong}>For Employers:</Text>
            <Bullet>You agree to comply with all provisions of RA 10361 (Batas Kasambahay).</Bullet>
            <Bullet>You must provide a safe and humane working environment.</Bullet>
            <Bullet>You agree to pay the agreed-upon wages and benefits on time.</Bullet>

            <Text style={[s.strong, { marginTop: 10 }]}>For Helpers:</Text>
            <Bullet>You agree to perform your duties as outlined in the employment contract.</Bullet>
            <Bullet>You must provide genuine and valid documents for verification.</Bullet>
            <Bullet>You agree to maintain professional conduct throughout your engagement.</Bullet>
          </Section>

          <Section title="5. Employment Contracts">
            <Text style={s.body}>
              CareLink facilitates the generation of the DOLE BK-1 employment contract. By signing
              digitally within the app, both parties agree to be bound by the terms of that contract
              and the governing laws of the Philippines.
            </Text>
          </Section>

          <Section title="6. Prohibited Conduct">
            <Text style={s.body}>You agree not to:</Text>
            <Bullet>Provide false or misleading information.</Bullet>
            <Bullet>Harass, abuse, or harm other users or PESO staff.</Bullet>
            <Bullet>Use the platform for any illegal purpose or unauthorized recruitment.</Bullet>
            <Bullet>Attempt to circumvent the platform's security or verification processes.</Bullet>
          </Section>

          <Section title="7. Termination of Account">
            <Text style={s.body}>
              We reserve the right to suspend or terminate your account if you violate these terms,
              fail verification, or engage in conduct that harms the platform or its users. PESO Ormoc
              may also request account termination for users who violate labor laws.
            </Text>
          </Section>

          <Section title="8. Limitation of Liability">
            <Text style={s.body}>
              CareLink is provided "as is". While we strive for accuracy and safety, we do not
              guarantee the conduct of users or the successful outcome of any employment match. We are
              not liable for disputes, damages, or losses arising from the employment relationship.
            </Text>
          </Section>

          <Section title="9. Governing Law">
            <Text style={s.body}>
              These terms are governed by the laws of the Republic of the Philippines, including but
              not limited to RA 10361 (Batas Kasambahay) and RA 10173 (Data Privacy Act).
            </Text>
          </Section>

          <Section title="10. Changes to Terms">
            <Text style={s.body}>
              We may update these terms from time to time. We will notify you of any material changes
              through the app. Continued use of CareLink after changes constitutes acceptance of the
              new terms.
            </Text>
          </Section>
        </View>
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E4D4",
    backgroundColor: "#FFFBF5",
  },
  headerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK },

  scroll: { paddingBottom: 56 },
  column: { paddingHorizontal: 20, paddingTop: 18 },
  columnDesktop: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 32, paddingTop: 32 },

  updated: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, marginBottom: 14 },
  intro: { fontFamily: FontFamily.fredokaRegular, fontSize: 14.5, lineHeight: 23, color: DARK, marginBottom: 8 },

  section: { marginTop: 26 },
  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: ACCENT, marginBottom: 9 },
  body: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, lineHeight: 22, color: DARK, marginBottom: 6 },
  strong: { fontFamily: FontFamily.fredokaSemiBold, color: DARK },

  bulletRow: { flexDirection: "row", gap: 9, marginBottom: 7, paddingRight: 4 },
  bulletDot: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, lineHeight: 22, color: ACCENT },
  bulletText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 14, lineHeight: 22, color: DARK },
});
