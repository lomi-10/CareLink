// components/parent/home/SafetyBanner.tsx
// "Safety is our priority" caramel-gradient reassurance banner — sits just
// below "My Hiring Activity" on the parent dashboard (per reference mockup).

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { BROWN, DARK } from './parentWarmTheme';

const GRADIENT: [string, string] = ['#F3DDBB', '#D9A66B'];

export function SafetyBanner() {
  return (
    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
      <View style={s.iconCircle}>
        <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
      </View>
      <View style={s.textCol}>
        <Text style={s.title}>Safety is our priority</Text>
        <Text style={s.sub}>
          All helpers on CareLink are PESO-verified and background-checked for your peace of mind.
        </Text>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: BROWN,
    alignItems: 'center', justifyContent: 'center',
  },
  textCol: { flex: 1 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 2 },
  sub:   { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: '#5A4327', lineHeight: 16 },
});
