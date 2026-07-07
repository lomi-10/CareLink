// components/helper/home/SectionHeader.tsx
// Reusable section header with title and optional action link

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { useHelperWarm } from './helperWarmTheme';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 18,
  },
  action: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 14,
  },
});

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  /** Accent for the optional action link (defaults to helper accent) */
  actionColor?: string;
}

export function SectionHeader({ title, action, onAction, actionColor }: SectionHeaderProps) {
  const w = useHelperWarm();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: w.DARK }]}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={[styles.action, { color: actionColor ?? w.ORANGE }]}>
            {action} →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
