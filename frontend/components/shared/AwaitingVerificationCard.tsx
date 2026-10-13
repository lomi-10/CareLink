// components/shared/AwaitingVerificationCard.tsx
// Shown only after the account has entered PESO's verification queue.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';
import { useT } from '@/contexts/LocaleContext';

const ACCENT: Record<'helper' | 'parent', string> = { helper: '#E86019', parent: '#C88B4A' };

export function AwaitingVerificationCard({
  status, themeKey = 'helper',
}: {
  completeness?: number | null;
  status?: string | null;
  themeKey?: 'helper' | 'parent';
}) {
  const { t } = useT();
  const s = String(status ?? '');
  if (s !== 'Pending') return null;

  return (
    <View style={st.card}>
      <View style={st.head}>
        <View style={st.iconWrap}>
          <Ionicons name="shield-checkmark" size={22} color="#059669" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>{t('helper.home.profileCompleteTitle')} 🎉</Text>
          <Text style={st.sub}>
            {t('helper.home.awaitingVerificationDescription')}
          </Text>
        </View>
      </View>
      <View style={st.badge}>
        <Ionicons name="time-outline" size={14} color={ACCENT[themeKey]} />
        <Text style={[st.badgeText, { color: ACCENT[themeKey] }]}>{t('helper.home.awaitingVerification')}</Text>
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
