// components/parent/jobs/TrustBanner.tsx
// Bottom marketing/trust strip shown across all Post-a-Job steps

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CREAM, ICON_BG, BROWN, MUTED, DIVIDER } from '../home/parentWarmTheme';

const ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'shield-checkmark', label: 'PESO Verified Helpers' },
  { icon: 'sparkles', label: 'Smart Matching' },
  { icon: 'lock-closed', label: 'Secure & Private' },
  { icon: 'flash', label: 'Find the Right Helper Faster' },
];

export function TrustBanner() {
  return (
    <View style={styles.container}>
      {ITEMS.map((item) => (
        <View key={item.label} style={styles.item}>
          <View style={styles.iconCircle}>
            <Ionicons name={item.icon} size={18} color={BROWN} />
          </View>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: CREAM,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DIVIDER,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginTop: 24,
    gap: 12,
  },
  item: {
    alignItems: 'center',
    width: '23%',
    minWidth: 80,
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
    lineHeight: 14,
  },
});
