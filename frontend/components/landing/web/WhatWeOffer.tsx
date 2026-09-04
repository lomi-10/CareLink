// components/landing/web/WhatWeOffer.tsx
//
// One section replacing FeatureStrip and HowItWorks, which described the same
// six capabilities twice — once as a strip of glass cards and once as two
// columns of numbered steps. Saying a thing twice on a landing page does not
// make it twice as convincing; it makes the reader wonder which version is
// current.
//
// EVERY CLAIM HERE IS CHECKABLE IN THE CODEBASE. No user counts, no adoption
// figures, no "trusted by thousands". A capstone panel can and will ask where a
// number came from, and "we made it up for the landing page" is the one answer
// that costs marks. What is here instead — the two credentials PESO verifies,
// the statutes the contract is built from, the wage floor, that helpers are
// never charged — is specific, true, and verifiable by reading the source.
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { FontFamily } from '@/constants/GlobalStyles';
import { CONTAINER_MAX, useLandingTheme, type LandingPalette } from './landingTheme';

type Offer = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  pills: string[];
};

const OFFERS: Offer[] = [
  {
    icon: 'shield-checkmark-outline',
    title: 'PESO-verified accounts',
    body: 'A PESO officer checks a Valid ID and Barangay Clearance for helpers and household employers alike before an account is marked verified.',
    pills: ['Valid ID', 'Barangay Clearance', 'Reviewed by an officer'],
  },
  {
    icon: 'document-text-outline',
    title: 'Contracts built on the Kasambahay Law',
    body: 'Employment contracts follow the BK-1 format, with the benefits, rest days and termination grounds RA 10361 actually requires — not a generic template.',
    pills: ['BK-1 format', '13th month pay', 'Both parties e-sign'],
  },
  {
    icon: 'search-outline',
    title: 'Finding and interviewing',
    body: 'Employers post work, helpers apply, and both sides talk in the app — including a video call that runs inside the conversation, so no one swaps phone numbers to hold an interview.',
    pills: ['In-app video call', 'Interview scheduling', 'Application tracking'],
  },
  {
    icon: 'time-outline',
    title: 'Work Mode',
    body: 'After hiring, the placement keeps its own record: attendance with hours and overtime, task lists, leave requests against a real balance, and payroll.',
    pills: ['Check in and out', 'Overtime from 8 hours', '5-day leave balance'],
  },
  {
    icon: 'alert-circle-outline',
    title: 'Complaints that go somewhere',
    body: 'A complaint is a tracked case with actions recorded against it, escalating to PESO. Both parties follow the same case, and written reviews stay private to PESO.',
    pills: ['Escalates to PESO', 'Action history', 'Private written reviews'],
  },
  {
    icon: 'wallet-outline',
    title: 'Never a peso from a helper',
    body: 'Helpers are not charged to join, apply, be verified or be hired. There is no helper-side payment screen anywhere in the system, by design.',
    pills: ['Free for helpers', 'RA 8042 & RA 10364'],
  },
];

function OfferCard({ offer, cols }: { offer: Offer; cols: number }) {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [hover, setHover] = useState(false);

  return (
    <Pressable
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={[
        s.card,
        {
          // A basis of 0 with grow lets N cards share a row exactly; the
          // percentage below it is what makes them wrap two-up, then one-up,
          // instead of squeezing six columns onto a laptop.
          flexBasis: cols === 3 ? 0 : cols === 2 ? '46%' : '100%',
          flexGrow: 1,
          minWidth: cols === 3 ? 280 : 0,
          borderColor: hover ? c.accent : c.cardBorder,
          backgroundColor: hover ? c.accentSoft : c.card,
          ...(Platform.OS === 'web'
            ? ({
                transition: 'transform 220ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease',
                boxShadow: hover ? `0 14px 40px -18px ${c.accent}` : 'none',
                cursor: 'default',
              } as object)
            : null),
          transform: [{ translateY: hover ? -6 : 0 }],
        },
      ]}
    >
      <View style={[s.iconWrap, { backgroundColor: hover ? c.accent : c.accentSoft }]}>
        <Ionicons name={offer.icon} size={21} color={hover ? '#fff' : c.accent} />
      </View>

      <Text style={s.title}>{offer.title}</Text>
      <Text style={s.body}>{offer.body}</Text>

      <View style={s.pills}>
        {offer.pills.map((p) => (
          <View key={p} style={[s.pill, { borderColor: hover ? c.accent : c.cardBorder }]}>
            <Text style={[s.pillTxt, { color: hover ? c.accent : c.textMuted }]}>{p}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export function WhatWeOffer() {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();
  const cols = width >= 1180 ? 3 : width >= 720 ? 2 : 1;

  return (
    <View style={s.section}>
      <View style={s.container}>
        <View style={s.head}>
          <Text style={s.eyebrow}>WHAT WE OFFER</Text>
          <Text style={s.heading}>Everything a household hire needs, in one place</Text>
          <Text style={s.sub}>
            From verification to the contract, and from the first interview to the last day worked —
            built around the Batas Kasambahay rather than bolted onto it.
          </Text>
        </View>

        <View style={s.grid}>
          {OFFERS.map((o) => <OfferCard key={o.title} offer={o} cols={cols} />)}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: LandingPalette) => StyleSheet.create({
  section: { paddingVertical: 80 },
  container: { width: '100%', maxWidth: CONTAINER_MAX, alignSelf: 'center', paddingHorizontal: 32 },
  head: { alignItems: 'center', marginBottom: 44 },
  eyebrow: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, letterSpacing: 1.8,
    color: c.accent, marginBottom: 12,
  },
  heading: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 36, letterSpacing: -0.6,
    color: c.text, textAlign: 'center', maxWidth: 760, marginBottom: 12,
  },
  sub: {
    fontFamily: FontFamily.fredokaRegular, fontSize: 15.5, lineHeight: 25,
    color: c.textMuted, textAlign: 'center', maxWidth: 660,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  card: { borderRadius: 20, borderWidth: 1, padding: 26 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 17.5, color: c.text,
    letterSpacing: -0.2, marginBottom: 9,
  },
  body: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, lineHeight: 22, color: c.textMuted },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  pillTxt: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5 },
});
