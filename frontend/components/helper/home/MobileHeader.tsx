// Mobile top header — menu, branding, notifications entry

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { theme } from '@/constants/theme';

interface MobileHeaderProps {
  onMenuPress: () => void;
  notificationCount?: number;
  onNotificationPress?: () => void;
  /** Primary accent for title + icons (helper green or parent blue) */
  accentColor?: string;
  subtitle?: string;
}

export function MobileHeader({
  onMenuPress,
  notificationCount = 0,
  onNotificationPress,
  accentColor = theme.color.ink,
  subtitle,
}: MobileHeaderProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.menuButton} onPress={onMenuPress} activeOpacity={0.7}>
        <Ionicons name="menu" size={28} color={accentColor} />
      </TouchableOpacity>

      <View style={styles.titleBlock}>
        <CareLinkLogoMark size={28} containerStyle={styles.headerLogo} />
        <View style={styles.titleTextCol}>
          <Text style={[styles.title, { color: accentColor }]}>CareLink</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <TouchableOpacity
        style={styles.notificationButton}
        activeOpacity={0.7}
        onPress={onNotificationPress}
        disabled={!onNotificationPress}
      >
        <Ionicons name="notifications-outline" size={24} color={accentColor} />
        {notificationCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
    ...theme.shadow.nav,
  },
  menuButton: {
    padding: 8,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    flexShrink: 0,
  },
  titleTextCol: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.color.muted,
    marginTop: 2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.color.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
