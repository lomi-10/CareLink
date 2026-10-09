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
import { useHelperWarm, type HelperWarm } from './helperWarmTheme';
import { useT } from '@/contexts/LocaleContext';

interface SidebarProps {
  onLogout: () => void;
}

const makeStyles = (w: HelperWarm) => StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: w.SURFACE,
    borderRightWidth: 1,
    borderRightColor: w.DIVIDER,
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
  logoText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: w.DARK },
  logoSubtext: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: w.MUTED, marginTop: 1 },

  nav: { flex: 1, paddingHorizontal: 12 },
  navLabel: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 10,
    color: w.SUBTLE,
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
  navItemActive: { backgroundColor: w.ICON_BG },
  navItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  navItemText: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: w.MUTED },
  navItemTextActive: { fontFamily: FontFamily.fredokaSemiBold, color: w.ORANGE },

  badge: {
    backgroundColor: w.DANGER,
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
    backgroundColor: w.ORANGE,
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
    backgroundColor: w.DANGER_BG,
    gap: 10,
  },
  logoutText: { fontFamily: FontFamily.fredokaSemiBold, color: w.DANGER, fontSize: 14 },
});

export function Sidebar({ onLogout }: SidebarProps) {
  const router = useRouter();
  const { t } = useT();
  const pathname = usePathname() ?? '';
  const { unreadCount } = useNotifications('helper');
  const { isWorkMode } = useHelperWorkMode();
  const w = useHelperWarm();
  const styles = useMemo(() => makeStyles(w), [w]);

  const navItems = isWorkMode
    ? [
        { icon: 'home' as const, labelKey: 'nav.dashboard', path: '/(helper)/home' },
        { icon: 'list' as const, labelKey: 'helper.nav.tasks', path: '/(helper)/work/tasks' },
        { icon: 'calendar' as const, labelKey: 'helper.nav.schedule', path: '/(helper)/work' },
        { icon: 'time' as const, labelKey: 'helper.nav.history', path: '/(helper)/work/history' },
        {
          icon: 'notifications' as const,
          labelKey: 'nav.notifications',
          path: '/(helper)/notifications',
          badge: unreadCount,
        },
        { icon: 'chatbubbles' as const, labelKey: 'nav.messages', path: '/(helper)/messages' },
        { icon: 'person' as const, labelKey: 'nav.profile', path: '/(helper)/profile' },
        { icon: 'settings' as const, labelKey: 'nav.settings', path: '/(helper)/settings' },
      ]
    : [
        { icon: 'home' as const, labelKey: 'nav.dashboard', path: '/(helper)/home' },
        { icon: 'search' as const, labelKey: 'nav.findJobs', path: '/(helper)/browse' },
        { icon: 'briefcase' as const, labelKey: 'nav.myApplications', path: '/(helper)/applications' },
        {
          icon: 'notifications' as const,
          labelKey: 'nav.notifications',
          path: '/(helper)/notifications',
          badge: unreadCount,
        },
        { icon: 'chatbubbles' as const, labelKey: 'nav.messages', path: '/(helper)/messages' },
        { icon: 'person' as const, labelKey: 'nav.profile', path: '/(helper)/profile' },
        { icon: 'settings' as const, labelKey: 'nav.settings', path: '/(helper)/settings' },
      ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CareLinkLogoMark size={44} />
        <View>
          <Text style={styles.logoText}>CareLink</Text>
          <Text style={styles.logoSubtext}>{isWorkMode ? t('helper.menu.workMode') : t('helper.menu.helperPortal')}</Text>
        </View>
      </View>

      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        <Text style={styles.navLabel}>{t('helper.menu.mainMenu')}</Text>
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
                  color={active ? w.ORANGE : w.MUTED}
                />
                <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{t(item.labelKey)}</Text>
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
        <Ionicons name="log-out-outline" size={20} color={w.DANGER} />
        <Text style={styles.logoutText}>{t('nav.logOut')}</Text>
      </TouchableOpacity>
    </View>
  );
}
