// components/shared/AwaitingVerificationCard.tsx
// Shown on the Home screen once a user's profile strength reaches 90–100% but
// PESO hasn't verified them yet: confirms they're done and to await verification.
// Hidden once Verified (or while still below 90%, where the setup guide shows).

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';

const ACCENT: Record<'helper' | 'parent', string> = { helper: '#E86019', parent: '#C88B4A' };

export function AwaitingVerificationCard({
  completeness, status, themeKey = 'helper',
}: {
  completeness?: number | null;
  status?: string | null;
  themeKey?: 'helper' | 'parent';
}) {
  const pct = completeness ?? 0;
  const s = String(status ?? '');
  // Only when the profile is essentially complete AND still awaiting PESO.
  if (pct < 90) return null;
  if (s === 'Verified' || s === 'Rejected') return null;

  return (
    <View style={st.card}>
      <View style={st.head}>
        <View style={st.iconWrap}>
          <Ionicons name="shield-checkmark" size={22} color="#059669" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Profile complete! 🎉</Text>
          <Text style={st.sub}>
            You’re all set at {Math.min(100, Math.round(pct))}%. Your profile is now awaiting PESO verification — we’ll
            notify you once an officer reviews your documents. This usually takes 1–3 working days.
          </Text>
        </View>
      </View>
      <View style={st.badge}>
        <Ionicons name="time-outline" size={14} color={ACCENT[themeKey]} />
        <Text style={[st.badgeText, { color: ACCENT[themeKey] }]}>Awaiting PESO verification</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: '#ECFDF5', borderRadius: 18, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#A7F3D0',
    ...Platform.select({
      ios: { shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 2 },
      default: { boxShadow: '0 4px 14px rgba(5,150,105,0.08)' } as any,
    }),
  },
  head: { flexDirection: 'row', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: '#065F46' },
  sub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: '#3F6B57', lineHeight: 18, marginTop: 3 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginTop: 12,
  },
  badgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5 },
});
