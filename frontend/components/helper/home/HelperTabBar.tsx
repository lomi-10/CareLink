import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColor } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { useResponsive } from '@/hooks/shared';
import { isHelperNavActive } from './helperPortalNav';

const TABS: {
  path: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { path: '/(helper)/home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { path: '/(helper)/browse_jobs', label: 'Find', icon: 'search-outline', iconActive: 'search' },
  { path: '/(helper)/my_applications', label: 'Apply', icon: 'briefcase-outline', iconActive: 'briefcase' },
  { path: '/(helper)/messages', label: 'Chats', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { path: '/(helper)/profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

function createHelperTabBarStyles(c: ThemeColor) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingTop: 10,
      paddingHorizontal: 4,
      backgroundColor: c.surfaceElevated,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      ...Platform.select({
        web: { boxShadow: '0 -4px 24px rgba(15, 23, 42, 0.08)' },
        ios: {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: { elevation: 10 },
        default: {},
      }),
    },
    tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 5, minWidth: 0 },
    label: { fontSize: 10, fontWeight: '600', color: c.muted, maxWidth: '100%' },
    labelActive: { color: c.helper, fontWeight: '800' },
    activeDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.helper,
      marginTop: 1,
    },
  });
}

/**
 * Mobile bottom bar when the helper is in job-hunting mode (not active placement / work bar).
 */
export function HelperTabBar() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const { ready, isWorkMode, activeHire } = useHelperWorkMode();
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createHelperTabBarStyles(c), [c]);

  if (!ready || isDesktop) return null;
  if (isWorkMode && activeHire) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const active = isHelperNavActive(pathname, tab.path);
        return (
          <TouchableOpacity
            key={tab.path}
            style={styles.tab}
            onPress={() => router.push(tab.path as never)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
          >
            <Ionicons
              name={active ? tab.iconActive : tab.icon}
              size={24}
              color={active ? c.helper : c.muted}
            />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
            {active ? <View style={styles.activeDot} /> : <View style={{ height: 5 }} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
