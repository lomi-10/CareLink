// components/parent/home/GreetingCard.tsx
// Hero banner for the parent dashboard — warm caramel gradient (family-focused,
// the opposite of the helper portal's dark-brown hero), with a rounded family
// photo frame and dual "Post a Job" / "Browse Helpers" CTAs (per reference mockup).

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { BROWN, DARK, CREAM } from './parentWarmTheme';

interface GreetingCardProps {
  userName: string;
  profileImage?: string | null;
}

// Deeper, more saturated caramel gradient — reads warm against the cream
// canvas instead of blending into it.
const HERO_GRADIENT: [string, string, string] = ['#F6D9AE', '#E2A968', '#C5853E'];
const PHOTO_W = 104;
const PHOTO_H = 124;

export function GreetingCard({ userName, profileImage }: GreetingCardProps) {
  const router = useRouter();
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning,';
    if (h < 18) return 'Good afternoon,';
    return 'Good evening,';
  })();

  return (
    <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
      <View style={s.circle1} />
      <View style={s.circle2} />

      <View style={s.content}>
        <View style={s.kickerBadge}>
          <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
          <Text style={s.kickerText}>FAMILY FIRST</Text>
        </View>

        <Text style={s.greeting}>{greeting}</Text>
        <Text style={s.name} numberOfLines={1}>{userName} 👋</Text>
        <Text style={s.tagline}>Let's find trusted and verified{'\n'}helpers for your family.</Text>

        <View style={s.ctaRow}>
          <TouchableOpacity style={s.ctaPrimary} onPress={() => router.push('/(parent)/jobs')} activeOpacity={0.88}>
            <Ionicons name="add-circle" size={15} color="#FFFFFF" />
            <Text style={s.ctaPrimaryText}>Post a Job</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ctaSecondary} onPress={() => router.push('/(parent)/browse')} activeOpacity={0.88}>
            <Ionicons name="search" size={15} color={BROWN} />
            <Text style={s.ctaSecondaryText}>Browse Helpers</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.photoCol}>
        <View style={s.photoFrame}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={s.photo} contentFit="cover" />
          ) : (
            <View style={s.photoFallback}>
              <Ionicons name="people" size={PHOTO_W * 0.4} color={BROWN} />
            </View>
          )}
        </View>
        <View style={[s.iconBadge, { top: -10, right: -10 }]}>
          <Ionicons name="people" size={14} color={BROWN} />
        </View>
        <View style={[s.iconBadge, { bottom: -10, right: 14 }]}>
          <Ionicons name="heart" size={14} color="#F43F5E" />
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    marginHorizontal: 10,
    marginBottom: 16,
    minHeight: 196,
    paddingLeft: 20,
    paddingRight: 16,
    paddingVertical: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  circle1: {
    position: 'absolute', right: -34, top: -34,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  circle2: {
    position: 'absolute', right: 70, bottom: -64,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(139,90,43,0.10)',
  },

  content: { flex: 1, zIndex: 2, paddingRight: 8 },
  kickerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BROWN,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, alignSelf: 'flex-start', marginBottom: 12,
  },
  kickerText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 9, color: '#FFFFFF',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  greeting: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK, marginBottom: 2 },
  name:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 21, color: DARK, letterSpacing: -0.3, marginBottom: 8 },
  tagline:  { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: '#5A4327', lineHeight: 18, marginBottom: 16 },

  ctaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1E2A4A',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999,
  },
  ctaPrimaryText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: '#FFFFFF' },
  ctaSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(139,90,43,0.18)',
  },
  ctaSecondaryText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: BROWN },

  photoCol: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  photoFrame: {
    width: PHOTO_W, height: PHOTO_H, borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.65)',
    backgroundColor: CREAM,
  },
  photo: { width: PHOTO_W, height: PHOTO_H },
  photoFallback: { width: PHOTO_W, height: PHOTO_H, alignItems: 'center', justifyContent: 'center' },

  iconBadge: {
    position: 'absolute',
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(139,90,43,0.14)',
    ...({
      shadowColor: '#3B2A18', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4,
    } as any),
  },
});
