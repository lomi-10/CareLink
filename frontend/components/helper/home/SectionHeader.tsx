// components/helper/home/SectionHeader.tsx
// Reusable section header with title and optional action link

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ThemeColor } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';

function createSectionHeaderStyles(c: ThemeColor) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.ink,
    },
    action: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
}

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  /** Accent for the optional action link (defaults to helper accent) */
  actionColor?: string;
}

export function SectionHeader({ title, action, onAction, actionColor }: SectionHeaderProps) {
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createSectionHeaderStyles(c), [c]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={[styles.action, { color: actionColor ?? c.helper }]}>
            {action} →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
