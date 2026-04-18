// components/helper/home/Sidebar.tsx
// Desktop sidebar navigation with active highlighting

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { theme } from '@/constants/theme';
import { useNotifications } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';

interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications('helper');
  const { isWorkMode } = useHelperWorkMode();

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

  const isActive = (path: string) => pathname === path;

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Ionicons name="briefcase" size={24} color="#fff" />
        </View>
        <View>
          <Text style={styles.logoText}>CareLink</Text>
          <Text style={styles.logoSubtext}>{isWorkMode ? 'Work Mode' : 'Helper Portal'}</Text>
        </View>
      </View>

      {/* Nav */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        <Text style={styles.navLabel}>MAIN MENU</Text>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <TouchableOpacity
              key={item.path}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.75}
            >
              <View style={styles.navItemContent}>
                <Ionicons
                  name={active ? item.icon : (item.icon + '-outline') as any}
                  size={20}
                  color={active ? theme.color.helper : theme.color.muted}
                />
                <Text style={[styles.navItemText, active && styles.navItemTextActive]}>
                  {item.label}
                </Text>
              </View>

              {/* Unread badge */}
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

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={20} color={theme.color.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: theme.color.surfaceElevated,
    borderRightWidth: 1,
    borderRightColor: theme.color.line,
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
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.color.helper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText:    { fontSize: 18, fontWeight: '800', color: theme.color.ink },
  logoSubtext: { fontSize: 11, color: theme.color.muted, fontWeight: '600', marginTop: 1 },

  nav: { flex: 1, paddingHorizontal: 12 },
  navLabel: {
    fontSize: 10, fontWeight: '700', color: theme.color.subtle,
    marginBottom: 10, marginLeft: 12, letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 10, marginBottom: 2, position: 'relative',
  },
  navItemActive: { backgroundColor: theme.color.helperSoft },
  navItemContent:{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  navItemText:   { fontSize: 14, fontWeight: '500', color: theme.color.muted },
  navItemTextActive: { color: theme.color.helper, fontWeight: '700' },

  badge: {
    backgroundColor: theme.color.danger,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 10, minWidth: 20, alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  activeBar: {
    position: 'absolute', right: 0, top: '50%', marginTop: -10,
    width: 3, height: 20,
    backgroundColor: theme.color.helper,
    borderTopLeftRadius: 3, borderBottomLeftRadius: 3,
  },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 20,
    marginHorizontal: 12, borderRadius: 10,
    backgroundColor: theme.color.dangerSoft, gap: 10,
  },
  logoutText: { color: theme.color.danger, fontSize: 14, fontWeight: '700' },
});
