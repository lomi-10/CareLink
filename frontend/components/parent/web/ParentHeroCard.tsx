// components/parent/web/ParentHeroCard.tsx — the "name card" hero used at the top
// of both parent dashboards (recruitment + work). Warm caramel gradient, greeting,
// name, tagline, up to two actions, and an avatar (initials unless a real photo).
import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '@/constants/GlobalStyles';
import { pt, CARAMEL_GRADIENT } from './parentWebTheme';

const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const initials = (n: string) => (n || '?').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();

type Action = { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void };

export function ParentHeroCard({
  badge, greeting, name, tagline, avatar, verified, primary, secondary,
}: {
  badge: { icon: keyof typeof Ionicons.glyphMap; label: string };
  greeting: string;
  name: string;
  tagline: string;
  avatar: string | null;
  verified?: boolean;
  primary: Action;
  secondary?: Action;
}) {
  return (
    <LinearGradient colors={CARAMEL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
      <View style={s.text}>
        <View style={s.badge}><Ionicons name={badge.icon} size={12} color="#fff" /><Text style={s.badgeText}>{badge.label}</Text></View>
        <Text style={s.greeting}>{greeting},</Text>
        <Text style={s.name}>{name} 👋</Text>
        <Text style={s.tagline}>{tagline}</Text>
        <View style={s.actions}>
          <Pressable onPress={primary.onPress} style={({ hovered, pressed }: any) => [TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
            <View style={s.primaryBtn}><Ionicons name={primary.icon} size={17} color="#fff" /><Text style={s.primaryText}>{primary.label}</Text></View>
          </Pressable>
          {secondary && (
            <Pressable onPress={secondary.onPress} style={({ hovered, pressed }: any) => [TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
              <View style={s.secondaryBtn}><Ionicons name={secondary.icon} size={17} color={pt.ink} /><Text style={s.secondaryText}>{secondary.label}</Text></View>
            </Pressable>
          )}
        </View>
      </View>
      <View style={s.avaWrap}>
        {avatar ? <Image source={{ uri: avatar }} style={s.ava} /> : <View style={[s.ava, s.avaFb]}><Text style={s.avaInit}>{initials(name)}</Text></View>}
        {verified && <View style={s.avaChk}><Ionicons name="checkmark" size={16} color="#fff" /></View>}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: 22, padding: 26, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 22 },
  text: { flex: 1, minWidth: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,.18)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, marginBottom: 12 },
  badgeText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, letterSpacing: 0.5 },
  greeting: { color: 'rgba(255,255,255,.9)', fontFamily: FontFamily.fredokaRegular, fontSize: 15 },
  name: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 30, letterSpacing: -0.5, marginVertical: 2 },
  tagline: { color: 'rgba(255,255,255,.88)', fontFamily: FontFamily.fredokaRegular, fontSize: 14.5, lineHeight: 21, marginBottom: 18, maxWidth: 460 },
  actions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: pt.feat2, borderRadius: 13, paddingHorizontal: 20, paddingVertical: 12, minHeight: 44 },
  primaryText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 13, paddingHorizontal: 20, paddingVertical: 12, minHeight: 44 },
  secondaryText: { color: pt.ink, fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  avaWrap: { position: 'relative' },
  ava: { width: 118, height: 118, borderRadius: 22, borderWidth: 4, borderColor: 'rgba(255,255,255,.3)' },
  avaFb: { backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' },
  avaInit: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 40 },
  avaChk: { position: 'absolute', right: -6, bottom: -6, width: 34, height: 34, borderRadius: 17, backgroundColor: pt.green, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#7A4E22' },
});
