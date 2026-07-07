// components/helper/home/HelperQuickActions.tsx
// 5-icon horizontal quick-action row for the helper dashboard.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { useHelperWarm, type HelperWarm } from './helperWarmTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Action {
  icon:    keyof typeof Ionicons.glyphMap;
  label:   string;
  iconBg:  string;
  iconColor: string;
  onPress: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HelperQuickActions() {
  const router = useRouter();
  const w = useHelperWarm();
  const s = useMemo(() => makeStyles(w), [w]);

  const actions: Action[] = [
    {
      icon: 'search',         label: 'Find Jobs',
      iconBg: '#DBEAFE',      iconColor: '#2563EB',
      onPress: () => router.push('/(helper)/browse'),
    },
    {
      icon: 'document-text',  label: 'Applications',
      iconBg: '#D1FAE5',      iconColor: '#059669',
      onPress: () => router.push('/(helper)/applications'),
    },
    {
      icon: 'folder-open',    label: 'Documents',
      iconBg: '#FEE2D5',      iconColor: '#E86019',
      onPress: () => router.push('/(helper)/profile'),
    },
    {
      icon: 'chatbubbles',    label: 'Messages',
      iconBg: '#CFFAFE',      iconColor: '#0891B2',
      onPress: () => router.push('/(helper)/messages'),
    },
    {
      icon: 'person',         label: 'My Profile',
      iconBg: '#F5E6CC',      iconColor: '#7A4E2A',
      onPress: () => router.push('/(helper)/profile'),
    },
  ];

  return (
    <View style={s.row}>
      {actions.map((a) => (
        <TouchableOpacity
          key={a.label}
          style={s.action}
          onPress={a.onPress}
          activeOpacity={0.75}
        >
          <View style={[s.iconCircle, { backgroundColor: a.iconBg }]}>
            <Ionicons name={a.icon} size={22} color={a.iconColor} />
          </View>
          <Text style={s.label}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (w: HelperWarm) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  action: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 11,
    color: w.DARK,
    textAlign: 'center',
    lineHeight: 14,
  },
});
