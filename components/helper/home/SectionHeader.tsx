// components/helper/home/SectionHeader.tsx
// Reusable section header with title and optional action link

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  /** Accent for the optional action link (defaults to helper green) */
  actionColor?: string;
}

export function SectionHeader({ title, action, onAction, actionColor }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={[styles.action, { color: actionColor ?? theme.color.helper }]}>
            {action} →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.color.ink,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
  },
});
