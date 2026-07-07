// components/helper/home/StatCard.tsx
// Desktop statistics card component

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';
import { useHelperWarm } from './helperWarmTheme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
  default: { boxShadow: '0 3px 12px rgba(139,94,60,0.06)' } as any,
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    ...CARD_SHADOW,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  value: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 32,
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 14,
  },
});

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  value: number;
  onPress?: () => void;
}

export function StatCard({
  icon,
  iconColor,
  iconBg,
  title,
  value,
  onPress,
}: StatCardProps) {
  const CardWrapper = onPress ? TouchableOpacity : View;
  const w = useHelperWarm();

  return (
    <CardWrapper
      style={[styles.container, { backgroundColor: w.SURFACE_ELEVATED, borderColor: w.DIVIDER }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={[styles.value, { color: w.DARK }]}>{value}</Text>
      <Text style={[styles.title, { color: w.MUTED }]}>{title}</Text>
    </CardWrapper>
  );
}
