// components/landing/web/Team.tsx
import React from 'react';
import { Image } from 'expo-image';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { FontFamily } from '@/constants/GlobalStyles';
import { CONTAINER_MAX, useLandingTheme } from './landingTheme';

type Member = {
  name: string;
  role: string;
  photo?: any;
};

const TEAM: Member[] = [
  { 
    name: 'Jess David Almeñe', 
    role: 'Lead Developer', 
    photo: require('@/assets/team/jess.png') 
  },
  { 
    name: 'Sean Howie Eulogio', 
    role: 'Documentation', 
    photo: require('@/assets/team/sean.png') 
  },
  { 
    name: 'Kirby L. Calderon', 
    role: 'Quality Assurance', 
    photo: require('@/assets/team/kirby.png') 
  },
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
          flexBasis: wide ? 0 : '46%',
          flexGrow: 1,
          minWidth: wide ? 0 : 220,
          ...(Platform.OS === 'web'
            ? ({ transition: 'transform 200ms ease, border-color 200ms ease' } as object)
            : null),
        },
      ]}
    >
      {/* Top Full-Bleed Image Container */}
      <View style={s.imageContainer}>
        {m.photo ? (
          <Image source={m.photo} style={s.photo} contentFit="cover" />
        ) : (
          <View style={[s.photo, s.fallback, { backgroundColor: c.accentSoft }]}>
            <Text style={[s.initials, { color: c.accent }]}>{initials(m.name)}</Text>
          </View>
        )}
      </View>

      {/* Bottom Information Panel */}
      <View style={s.infoSection}>
        <Text style={[s.name, { color: c.text }]} numberOfLines={2}>{m.name}</Text>
        <View style={[s.roleBadge, { backgroundColor: c.accentSoft }]}>
          <Text style={[s.roleText, { color: c.accent }]}>{m.role}</Text>
        </View>
      </View>
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
              CareLink is a BSCS capstone project developed with PESO Ormoc, built around the
              Batas Kasambahay and the way hiring actually happens here.
            </Text>
          </View>

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

        <View style={[s.grid, { flexWrap: wide ? 'nowrap' : 'wrap', maxWidth: wide ? 820 : undefined }]}>
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
  grid: { flexDirection: 'row', gap: 20, marginTop: 10},
  card: { 
    borderRadius: 20, 
    borderWidth: 1, 
    overflow: 'hidden', // Clips photo to top corners of card
  },
  imageContainer: {
    width: '100%',
    height: 210, // Full top image height
  },
  photo: { width: '100%', height: '100%' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 36 },
  infoSection: {
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, textAlign: 'center' },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, textAlign: 'center' },
  adviser: {
    flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start',
    marginTop: 28, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1,
  },
  adviserDot: { width: 7, height: 7, borderRadius: 4 },
  adviserTxt: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5 },
});