// Desktop sidebar — theme from helper portal, active state matches nested routes

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import type { ThemeColor } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import { useNotifications } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { isHelperNavActive } from './helperPortalNav';

interface SidebarProps {
  onLogout: () => void;
}

function createSidebarStyles(c: ThemeColor) {
  return StyleSheet.create({
    container: {
      width: 260,
      backgroundColor: c.surfaceElevated,
      borderRightWidth: 1,
      borderRightColor: c.line,
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
    logoText: { fontSize: 18, fontWeight: '800', color: c.ink },
    logoSubtext: { fontSize: 11, color: c.muted, fontWeight: '600', marginTop: 1 },

    nav: { flex: 1, paddingHorizontal: 12 },
    navLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: c.subtle,
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
    navItemActive: { backgroundColor: c.helperSoft },
    navItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    navItemText: { fontSize: 14, fontWeight: '500', color: c.muted },
    navItemTextActive: { color: c.helper, fontWeight: '700' },

    badge: {
      backgroundColor: c.danger,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 20,
      alignItems: 'center',
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

    activeBar: {
      position: 'absolute',
      right: 0,
      top: '50%',
      marginTop: -10,
      width: 3,
      height: 20,
      backgroundColor: c.helper,
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
      backgroundColor: c.dangerSoft,
      gap: 10,
    },
    logoutText: { color: c.danger, fontSize: 14, fontWeight: '700' },
  });
}

export function Sidebar({ onLogout }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { unreadCount } = useNotifications('helper');
  const { isWorkMode } = useHelperWorkMode();
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createSidebarStyles(c), [c]);

  const navItems = isWorkMode
    ? [
        { icon: 'home' as const, label: 'Home', path: '/(helper)/home' },
        { icon: 'list' as const, label: 'Tasks', path: '/(helper)/work_tasks' },
        { icon: 'calendar' as const, label: 'Schedule', path: '/(helper)/work_schedule' },
        { icon: 'time' as const, label: 'History', path: '/(helper)/work_history' },
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
        { icon: 'search' as const, label: 'Find Jobs', path: '/(helper)/browse_jobs' },
        { icon: 'briefcase' as const, label: 'My Applications', path: '/(helper)/my_applications' },
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
                  color={active ? c.helper : c.muted}
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
        <Ionicons name="log-out-outline" size={20} color={c.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
