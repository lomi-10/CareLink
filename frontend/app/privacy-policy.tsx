// app/privacy-policy.tsx
// Privacy Policy — linked from signup (consent checkbox) and the web landing
// page footer. Required for RA 10173 (Data Privacy Act) / NPC Circular 16-01:
// what is collected, on what legal basis, who receives it, how long it is kept,
// and how a data subject exercises their rights.
//
// TWO CORRECTIONS THIS VERSION MAKES, BOTH MATERIAL
//
// 1. The previous text named "Didit" as the identity-verification provider.
//    That string appeared nowhere else in the codebase. The service that
//    actually receives uploaded documents is GOOGLE, through the Gemini vision
//    API (backend/shared/gemini_id.php, gemini-2.5-flash). Naming the wrong
//    processor is not a typo in a privacy notice: consent was being collected
//    for a disclosure to a company that never receives the data, and not
//    collected for the one that does.
//
// 2. It said only the Valid ID was sent. gemini_id.php builds a prompt for
//    Valid ID, Barangay Clearance, Police Clearance AND TESDA NC2 — every
//    document type the app accepts.
//
// KEEP THIS FILE HONEST. If a service is added that receives personal data,
// it belongs in "Who else receives your data" before it ships, not after.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontFamily } from "@/constants/GlobalStyles";

const DARK = "#2A1608";
const MUTED = "#7A5C3E";
const ACCENT = "#E86019";

/** Last substantive revision. Shown to the reader — a policy with no date
 *  gives no way to tell whether it describes the system in front of them. */
const LAST_UPDATED = "6 September 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** A bullet as a real row, so wrapped lines indent under the text rather than
 *  under the dot — a "•" inside a paragraph wraps flush left and reads as a
 *  new bullet. */
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
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
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Capped for reading. Full-bleed legal text on a 1920px monitor runs
            to ~200 characters a line, which is roughly three times the width
            anyone reads comfortably. */}
        <View style={[s.column, isDesktop && s.columnDesktop]}>
          <Text style={s.updated}>Last updated {LAST_UPDATED}</Text>

          <Text style={s.intro}>
            CareLink connects households with domestic helpers (kasambahay) in Ormoc City, working with
            the Public Employment Service Office. This policy explains what personal information we
            collect, the legal basis for collecting it, who else receives it, how long we keep it, and
            the rights you hold over it under the Data Privacy Act of 2012 (RA 10173), its
            Implementing Rules, and NPC Circular 16-01.
          </Text>

          <Section title="Who is responsible for your data">
            <Text style={s.body}>
              CareLink is the personal information controller for the data described here. It is
              operated as a capstone project by BSIT students of Western Leyte College, in coordination
              with PESO Ormoc. Verification decisions are made by PESO officers acting in their official
              capacity.
            </Text>
          </Section>

          <Section title="What we collect">
            <Bullet>
              <Text style={s.strong}>Identity and contact details</Text> you enter at signup and in your
              profile: name, email address, mobile number, birth date, sex, civil status, religion,
              address, and profile photo.
            </Bullet>
            <Bullet>
              <Text style={s.strong}>Government-issued documents</Text> you upload: Valid ID, Barangay
              Clearance, Police Clearance and TESDA NC2, including the images themselves and the details
              printed on them.
            </Bullet>
            <Bullet>
              <Text style={s.strong}>Household composition</Text>, if you are hiring: the number, ages
              and any special needs of children or elderly members the work involves. Information about
              health or a disability is sensitive personal information, and we collect it only because
              it determines what care is being asked for.
            </Bullet>
            <Bullet>
              <Text style={s.strong}>Employment records</Text>: job posts, applications, interviews,
              contracts, agreed salary, attendance and hours, leave, tasks, and placement history.
            </Bullet>
            <Bullet>
              <Text style={s.strong}>Messages and calls</Text> exchanged with the other party through
              the app, and complaints or reviews you submit.
            </Bullet>
            <Bullet>
              <Text style={s.strong}>Account and security activity</Text>: login times, IP address and
              device or browser information, kept as an audit trail.
            </Bullet>
          </Section>

          <Section title="Why we collect it, and on what basis">
            <Text style={s.body}>
              RA 10173 requires a lawful basis for every processing activity. Ours are:
            </Text>
            <Bullet>
              <Text style={s.strong}>Your consent</Text>, given at signup, for matching you with
              households or helpers and for sending your documents for the automated check described
              below. You may withdraw it, though doing so may mean we can no longer provide the service.
            </Bullet>
            <Bullet>
              <Text style={s.strong}>Performance of a contract</Text> — generating and maintaining the
              employment contract between a household and a helper, and the records that go with it.
            </Bullet>
            <Bullet>
              <Text style={s.strong}>Legal obligation</Text> — the employment records the Batas
              Kasambahay (RA 10361) requires an employer to keep, and PESO's own function under RA 8759.
            </Bullet>
            <Text style={s.body}>
              We do not sell personal data, we do not share it with advertisers, and we do not use it to
              build profiles for any purpose other than matching within CareLink.
            </Text>
          </Section>

          <Section title="Who can see your documents inside CareLink">
            <Text style={s.body}>
              Your uploaded ID and clearance documents are visible only to:
            </Text>
            <Bullet>you, the person who uploaded them;</Bullet>
            <Bullet>
              a specific employer or helper you explicitly choose to share a document with, for a
              specific application — sharing is opt-in, per document, and never automatic; and
            </Bullet>
            <Bullet>PESO officers, for verification.</Bullet>
            <Text style={s.body}>
              Your Valid ID and Barangay Clearance carry your home address, so they are never shown to
              the other party in a hiring conversation, whatever else is shared.
            </Text>
          </Section>

          <Section title="Who else receives your data">
            <Text style={s.body}>
              CareLink uses the following outside services. Each receives only what its function needs.
            </Text>
            <Bullet>
              <Text style={s.strong}>Google (Gemini vision API)</Text> — when you scan an uploaded
              document, its image is sent to Google to read the printed details and flag signs of
              tampering. This applies to all four document types, not only your ID. It is an assistive
              check: a PESO officer still makes the verification decision. Google processes this on
              servers outside the Philippines.
            </Bullet>
            <Bullet>
              <Text style={s.strong}>The video call provider</Text> — when you start a call, you and the
              other party connect through a third-party meeting service. Your camera and microphone
              stream through it for the duration of the call. CareLink does not record calls.
            </Bullet>
            <Bullet>
              <Text style={s.strong}>PayMongo</Text> — if a household employer subscribes or pays a
              placement fee, payment details are handled by PayMongo. CareLink never sees or stores card
              numbers. Helpers are never charged, so this never applies to a helper account.
            </Bullet>
            <Bullet>
              <Text style={s.strong}>Our email provider</Text> — your email address, to send verification
              codes and account notices.
            </Bullet>
            <Bullet>
              <Text style={s.strong}>Our web host</Text> — where the application and database run.
            </Bullet>
            <Text style={s.body}>
              Where a provider is located outside the Philippines, that is a cross-border transfer. We
              use only services that offer contractual protections comparable to those RA 10173 requires.
            </Text>
          </Section>

          <Section title="Verification against government records">
            <Text style={s.body}>
              A PESO officer may check the reference number on a Police Clearance against the issuing
              agency's own public verification page and record what they saw. CareLink makes no
              connection to any government system and sends nothing to one; the officer performs the
              check themselves and records the result.
            </Text>
          </Section>

          <Section title="How we protect it">
            <Bullet>Passwords are stored hashed, never in a form that can be read back.</Bullet>
            <Bullet>
              Document files are served through expiring links tied to your session, so a copied URL
              stops working.
            </Bullet>
            <Bullet>
              Every request that returns personal data checks that the account asking is entitled to it,
              on the server — not only in the app.
            </Bullet>
            <Bullet>Access by PESO and administrator accounts is recorded in an audit trail.</Bullet>
          </Section>

          <Section title="How long we keep it">
            <Text style={s.body}>
              Account and employment records are kept while your account is active, and afterwards for
              as long as needed to satisfy the labour-record and dispute-resolution obligations under RA
              10361 — ordinarily three years from the end of a placement. Uploaded documents are kept
              while relevant to an active or recently ended placement, or as part of PESO's verification
              record. Audit logs are kept for security review. When a retention period ends, records are
              deleted or anonymised.
            </Text>
          </Section>

          <Section title="Your rights">
            <Text style={s.body}>Under RA 10173 you have the right to:</Text>
            <Bullet>be informed that your data is being processed, and why;</Bullet>
            <Bullet>access the personal data we hold about you;</Bullet>
            <Bullet>correct anything inaccurate or incomplete;</Bullet>
            <Bullet>object to processing, or withdraw consent you previously gave;</Bullet>
            <Bullet>
              have your data erased or blocked where it is incomplete, outdated, unlawfully obtained, or
              no longer necessary;
            </Bullet>
            <Bullet>obtain a copy of your data in a portable electronic format;</Bullet>
            <Bullet>be indemnified for damages caused by inaccurate or unlawfully used data; and</Bullet>
            <Bullet>
              lodge a complaint with the National Privacy Commission at privacy.gov.ph, independently of
              us.
            </Bullet>
          </Section>

          <Section title="How to exercise them">
            <Text style={s.body}>
              Use "Report an issue" in the app, or write to us from the email address on your account,
              saying which right you wish to exercise. We will verify that the request comes from you and
              respond within fifteen (15) days, or tell you why we need longer. If we must keep something
              the law requires us to keep, we will say so and explain which record and why.
            </Text>
          </Section>

          <Section title="Data breaches">
            <Text style={s.body}>
              If a breach occurs that is likely to put your rights at serious risk, we will notify the
              National Privacy Commission and the people affected within seventy-two (72) hours of
              becoming aware of it, as NPC Circular 16-03 requires.
            </Text>
          </Section>

          <Section title="Children">
            <Text style={s.body}>
              CareLink accounts are for adults. Information about children is collected only as part of a
              household's description of the care being sought, is entered by the parent or guardian
              themselves, and is never used for anything else.
            </Text>
          </Section>

          <Section title="Changes to this policy">
            <Text style={s.body}>
              We may update this policy as the platform changes. The date at the top shows the last
              revision, and material changes will be shown in-app before they take effect.
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
