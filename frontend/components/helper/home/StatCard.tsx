// components/helper/home/StatCard.tsx
// Desktop statistics card component

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColor } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';

function createStatCardStyles(c: ThemeColor) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.surfaceElevated,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: c.line,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
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
      fontSize: 32,
      fontWeight: '700',
      color: c.ink,
      marginBottom: 4,
    },
    title: {
      fontSize: 14,
      color: c.muted,
    },
  });
}

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
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createStatCardStyles(c), [c]);

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </CardWrapper>
  );
}
