// Desktop sidebar — warm helper-portal theme, active state matches nested routes

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { FontFamily } from '@/constants/GlobalStyles';
import { useNotifications } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { isHelperNavActive } from './helperPortalNav';
import { DARK, MUTED, SUBTLE, ORANGE, ICON_BG, DIVIDER, SURFACE, DANGER, DANGER_BG } from './helperWarmTheme';

interface SidebarProps {
  onLogout: () => void;
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: SURFACE,
    borderRightWidth: 1,
    borderRightColor: DIVIDER,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 28,
    gap: 12,
  },
  logoText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },
  logoSubtext: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 1 },

  nav: { flex: 1, paddingHorizontal: 12 },
  navLabel: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 10,
    color: SUBTLE,
    marginBottom: 10,
    marginLeft: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 2,
    position: 'relative',
  },
  navItemActive: { backgroundColor: ICON_BG },
  navItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  navItemText: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED },
  navItemTextActive: { fontFamily: FontFamily.fredokaSemiBold, color: ORANGE },

  badge: {
    backgroundColor: DANGER,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 10 },

  activeBar: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -10,
    width: 3,
    height: 20,
    backgroundColor: ORANGE,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 10,
    backgroundColor: DANGER_BG,
    gap: 10,
  },
  logoutText: { fontFamily: FontFamily.fredokaSemiBold, color: DANGER, fontSize: 14 },
});

export function Sidebar({ onLogout }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { unreadCount } = useNotifications('helper');
  const { isWorkMode } = useHelperWorkMode();

  const navItems = isWorkMode
    ? [
        { icon: 'home' as const, label: 'Home', path: '/(helper)/home' },
        { icon: 'list' as const, label: 'Tasks', path: '/(helper)/work/tasks' },
        { icon: 'calendar' as const, label: 'Schedule', path: '/(helper)/work' },
        { icon: 'time' as const, label: 'History', path: '/(helper)/work/history' },
        {
          icon: 'notifications' as const,
          label: 'Notifications',
          path: '/(helper)/notifications',
          badge: unreadCount,
        },
        { icon: 'chatbubbles' as const, label: 'Messages', path: '/(helper)/messages' },
        { icon: 'person' as const, label: 'Profile', path: '/(helper)/profile' },
        { icon: 'settings' as const, label: 'Settings', path: '/(helper)/settings' },
      ]
    : [
        { icon: 'home' as const, label: 'Home', path: '/(helper)/home' },
        { icon: 'search' as const, label: 'Find Jobs', path: '/(helper)/browse' },
        { icon: 'briefcase' as const, label: 'My Applications', path: '/(helper)/applications' },
        {
          icon: 'notifications' as const,
          label: 'Notifications',
          path: '/(helper)/notifications',
          badge: unreadCount,
        },
        { icon: 'chatbubbles' as const, label: 'Messages', path: '/(helper)/messages' },
        { icon: 'person' as const, label: 'Profile', path: '/(helper)/profile' },
        { icon: 'settings' as const, label: 'Settings', path: '/(helper)/settings' },
      ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CareLinkLogoMark size={44} />
        <View>
          <Text style={styles.logoText}>CareLink</Text>
          <Text style={styles.logoSubtext}>{isWorkMode ? 'Work Mode' : 'Helper Portal'}</Text>
        </View>
      </View>

      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        <Text style={styles.navLabel}>MAIN MENU</Text>
        {navItems.map((item) => {
          const active = isHelperNavActive(pathname, item.path);
          return (
            <TouchableOpacity
              key={item.path}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.path as never)}
              activeOpacity={0.75}
            >
              <View style={styles.navItemContent}>
                <Ionicons
                  name={active ? item.icon : (`${item.icon}-outline` as React.ComponentProps<typeof Ionicons>['name'])}
                  size={20}
                  color={active ? ORANGE : MUTED}
                />
                <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{item.label}</Text>
              </View>

              {item.badge != null && item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                </View>
              )}

              {active && <View style={styles.activeBar} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={20} color={DANGER} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
