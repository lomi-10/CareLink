// components/landing/web/Team.tsx
//
// The people who built CareLink.
//
// ⚠ REPLACE THE PLACEHOLDER NAMES BELOW before the defense. They are marked
// rather than invented — putting made-up names on a page a panel will read is
// worse than an obvious gap, because a gap gets fixed and a plausible fiction
// does not.
//
// Photographs are optional. A member with no `photo` falls back to their
// initials on the brand accent, which is deliberate: a grid where some cards
// have a face and others have a grey silhouette looks broken, whereas initials
// look like a choice.
import React from 'react';
import { Image } from 'expo-image';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { FontFamily } from '@/constants/GlobalStyles';
import { CONTAINER_MAX, useLandingTheme } from './landingTheme';

type Member = {
  name: string;
  role: string;
  /** e.g. require('@/assets/team/jess.jpg') */
  photo?: number;
};

// Three members. ⚠ The two placeholder names below still need replacing.
const TEAM: Member[] = [
  { name: 'Jess David Almeñe', role: 'Lead Developer' },
  { name: 'Sean Howie Eulogio', role: 'Documentation' },
  { name: 'Kirby L. Calderon', role: 'Quality Assurance' },
];

const ADVISER: Member | null = { name: 'Mr. Joscoro Cantero', role: 'Adviser' };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function Card({ m, wide }: { m: Member; wide: boolean }) {
  const { c } = useLandingTheme();
  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: c.card,
          borderColor: c.cardBorder,
          // Desktop fits four across; below that they wrap two-up rather than
          // shrinking to a size where the names stop being readable.
          flexBasis: wide ? 0 : '46%',
          flexGrow: 1,
          minWidth: wide ? 0 : 190,
          ...(Platform.OS === 'web'
            ? ({ transition: 'transform 200ms ease, border-color 200ms ease' } as object)
            : null),
        },
      ]}
    >
      {m.photo ? (
        <Image source={m.photo} style={s.photo} contentFit="cover" />
      ) : (
        <View style={[s.photo, s.fallback, { backgroundColor: c.accentSoft, borderColor: c.accent }]}>
          <Text style={[s.initials, { color: c.accent }]}>{initials(m.name)}</Text>
        </View>
      )}
      <Text style={[s.name, { color: c.text }]} numberOfLines={2}>{m.name}</Text>
      <Text style={[s.role, { color: c.textMuted }]} numberOfLines={1}>{m.role}</Text>
    </View>
  );
}

export function Team() {
  const { c } = useLandingTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 1024;

  return (
    <View style={s.section}>
      <View style={s.container}>
        <View style={[s.headRow, { flexDirection: wide ? 'row' : 'column' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.eyebrow, { color: c.accent }]}>THE TEAM</Text>
            <Text style={[s.heading, { color: c.text }]}>Built by students, for Ormoc</Text>
            <Text style={[s.sub, { color: c.textMuted }]}>
              CareLink is a BSIT capstone project developed with PESO Ormoc, built around the
              Batas Kasambahay and the way hiring actually happens here.
            </Text>
          </View>

          {/* The partnership is the most credible thing on this page, so it gets
              a panel rather than a line of text. */}
          <View style={[s.pesoPanel, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Image
              source={require("@/assets/landing/large-peso-ormoc-logo.png")}
              style={s.pesoLogo}
              contentFit="contain"
            />
            <Text style={[s.pesoTxt, { color: c.textMuted }]}>
              Developed with the{' '}
              <Text style={{ color: c.text, fontFamily: FontFamily.fredokaSemiBold }}>
                Public Employment Service Office, Ormoc City
              </Text>
            </Text>
          </View>
        </View>

        <View style={[s.grid, { flexWrap: wide ? 'nowrap' : 'wrap', maxWidth: wide ? 760 : undefined }]}>
          {TEAM.map((m) => <Card key={m.name + m.role} m={m} wide={wide} />)}
        </View>

        {ADVISER && (
          <View style={[s.adviser, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
            <View style={[s.adviserDot, { backgroundColor: c.accent }]} />
            <Text style={[s.adviserTxt, { color: c.textMuted }]}>
              <Text style={{ color: c.text, fontFamily: FontFamily.fredokaSemiBold }}>{ADVISER.name}</Text>
              {'  ·  '}{ADVISER.role}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingVertical: 96, minHeight: 620, justifyContent: 'center' },
  container: { width: '100%', maxWidth: CONTAINER_MAX, alignSelf: 'center', paddingHorizontal: 32 },
  eyebrow: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, letterSpacing: 1.6, marginBottom: 10 },
  heading: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 34, letterSpacing: -0.5, marginBottom: 10 },
  sub: { fontFamily: FontFamily.fredokaRegular, fontSize: 15, lineHeight: 24, maxWidth: 560 },
  headRow: { gap: 32, alignItems: 'center', marginBottom: 40 },
  pesoPanel: {
    borderWidth: 1, borderRadius: 20, padding: 22, alignItems: 'center', gap: 14,
    width: 260, alignSelf: 'flex-start',
  },
  pesoLogo: { width: 96, height: 96 },
  pesoTxt: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, lineHeight: 19, textAlign: 'center' },
  grid: { flexDirection: 'row', gap: 16 },
  card: { borderRadius: 18, borderWidth: 1, padding: 20, alignItems: 'center', gap: 4 },
  photo: { width: 76, height: 76, borderRadius: 38, marginBottom: 12 },
  fallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  initials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24 },
  name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, textAlign: 'center' },
  role: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, textAlign: 'center' },
  adviser: {
    flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start',
    marginTop: 22, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1,
  },
  adviserDot: { width: 7, height: 7, borderRadius: 4 },
  adviserTxt: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5 },
});
