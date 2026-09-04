// components/landing/web/RoleSelection.tsx
//
// The role choice, as a section of the landing page rather than a screen of
// its own.
//
// WHY IT MOVED HERE
//
// On desktop, "are you hiring or looking for work" was a whole page: a click,
// a route change and a load to answer one question with two answers. It is the
// first thing a visitor needs to say and the last thing that deserves a page
// transition, so it now sits directly under the hero — reached by the hero's
// own Get started button, or by scrolling one section.
//
// Desktop only, by construction: LandingPage renders an entirely different
// component below 1024px, and the separate /(auth)/role-selection route is
// still what mobile uses. Two cards this size only work side by side.
import { Ionicons } from '@expo/vector-icons';
import type { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { FontFamily } from '@/constants/GlobalStyles';
import { CONTAINER_MAX, useLandingTheme, type LandingPalette } from './landingTheme';

type Role = 'parent' | 'helper';

const ROLES: {
  role: Role;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  points: string[];
  cta: string;
}[] = [
  {
    role: 'parent',
    icon: 'home',
    title: "I'm hiring a kasambahay",
    body: 'For households in Ormoc looking for help at home.',
    points: [
      'Post the work and receive applications',
      'Interview by message or video, in the app',
      'Hire on a contract built to RA 10361',
    ],
    cta: 'Continue as household employer',
  },
  {
    role: 'helper',
    icon: 'briefcase',
    title: "I'm looking for work",
    body: 'For kasambahay looking for a household to work with.',
    points: [
      'Build a profile and get PESO-verified',
      'Apply to households near you',
      'Free at every step — always',
    ],
    cta: 'Continue as helper',
  },
];

function RoleCard({
  item, router, stack,
}: {
  item: (typeof ROLES)[number];
  router: ReturnType<typeof useRouter>;
  stack: boolean;
}) {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [hover, setHover] = useState(false);

  return (
    <Pressable
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onPress={() => router.push({ pathname: '/(auth)/signup', params: { role: item.role } })}
      style={[
        s.card,
        {
          flexBasis: stack ? 'auto' : 0,
          flexGrow: 1,
          borderColor: hover ? c.accent : c.cardBorder,
          backgroundColor: hover ? c.accentSoft : c.card,
          ...(Platform.OS === 'web'
            ? ({
                transition: 'transform 220ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease',
                boxShadow: hover ? `0 18px 48px -20px ${c.accent}` : 'none',
                cursor: 'pointer',
              } as object)
            : null),
          transform: [{ translateY: hover ? -6 : 0 }],
        },
      ]}
    >
      <View style={[s.icon, { backgroundColor: hover ? c.accent : c.accentSoft }]}>
        <Ionicons name={item.icon} size={26} color={hover ? '#fff' : c.accent} />
      </View>

      <Text style={s.title}>{item.title}</Text>
      <Text style={s.body}>{item.body}</Text>

      <View style={s.points}>
        {item.points.map((p) => (
          <View key={p} style={s.point}>
            <Ionicons name="checkmark-circle" size={15} color={c.accent} />
            <Text style={s.pointTxt}>{p}</Text>
          </View>
        ))}
      </View>

      <View style={[s.cta, { backgroundColor: hover ? c.accent : 'transparent', borderColor: c.accent }]}>
        <Text style={[s.ctaTxt, { color: hover ? '#fff' : c.accent }]}>{item.cta}</Text>
        <Ionicons name="arrow-forward" size={15} color={hover ? '#fff' : c.accent} />
      </View>
    </Pressable>
  );
}

export function RoleSelection({ router }: { router: ReturnType<typeof useRouter> }) {
  const { c } = useLandingTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();
  const stack = width < 900;

  return (
    <View style={s.section}>
      <View style={s.container}>
        <View style={s.head}>
          <Text style={s.eyebrow}>GET STARTED</Text>
          <Text style={s.heading}>How will you use CareLink?</Text>
          <Text style={s.sub}>
            Pick the one that describes you. You can only hold one kind of account, so this
            decides what the rest of CareLink looks like.
          </Text>
        </View>

        <View style={[s.grid, { flexDirection: stack ? 'column' : 'row' }]}>
          {ROLES.map((r) => <RoleCard key={r.role} item={r} router={router} stack={stack} />)}
        </View>

        <Pressable style={s.loginRow} onPress={() => router.push('/(auth)/login')}>
          <Text style={s.loginTxt}>
            Already have an account?{' '}
            <Text style={{ color: c.accent, fontFamily: FontFamily.fredokaSemiBold }}>Log in</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: LandingPalette) => StyleSheet.create({
  section: { paddingVertical: 96, minHeight: 660, justifyContent: 'center' },
  container: { width: '100%', maxWidth: CONTAINER_MAX, alignSelf: 'center', paddingHorizontal: 32 },
  head: { alignItems: 'center', marginBottom: 40 },
  eyebrow: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, letterSpacing: 1.8,
    color: c.accent, marginBottom: 12,
  },
  heading: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 36, letterSpacing: -0.6,
    color: c.text, textAlign: 'center', marginBottom: 12,
  },
  sub: {
    fontFamily: FontFamily.fredokaRegular, fontSize: 15.5, lineHeight: 25,
    color: c.textMuted, textAlign: 'center', maxWidth: 600,
  },
  grid: { gap: 22, alignItems: 'stretch' },
  card: { borderRadius: 22, borderWidth: 1, padding: 30 },
  icon: {
    width: 56, height: 56, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 21, color: c.text, letterSpacing: -0.3, marginBottom: 7 },
  body: { fontFamily: FontFamily.fredokaRegular, fontSize: 14.5, lineHeight: 22, color: c.textMuted },
  points: { gap: 10, marginTop: 20, marginBottom: 24 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pointTxt: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: c.textMuted, flex: 1 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 13, paddingVertical: 13, marginTop: 'auto',
  },
  ctaTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5 },
  loginRow: { alignSelf: 'center', marginTop: 30 },
  loginTxt: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: c.textMuted },
});
