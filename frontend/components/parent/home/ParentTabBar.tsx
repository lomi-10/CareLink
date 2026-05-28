import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColor } from '@/constants/theme';
import { useParentTheme } from '@/contexts/ParentThemeContext';
import { isParentNavActive } from './parentPortalNav';

const TABS: {
  path: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { path: '/(parent)/home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { path: '/(parent)/browse_helpers', label: 'Find', icon: 'search-outline', iconActive: 'search' },
  { path: '/(parent)/jobs', label: 'Jobs', icon: 'briefcase-outline', iconActive: 'briefcase' },
  { path: '/(parent)/applications', label: 'Applicants', icon: 'people-outline', iconActive: 'people' },
  { path: '/(parent)/messages', label: 'Messages', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { path: '/(parent)/profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

function createParentTabBarStyles(c: ThemeColor) {
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
        web: {
          boxShadow: '0 -4px 24px rgba(15, 23, 42, 0.08)',
        },
        ios: {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: {
          elevation: 10,
        },
        default: {},
      }),
    },
    tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4, minWidth: 0 },
    label: { fontSize: 9, fontWeight: '600', color: c.muted, maxWidth: '100%' },
    labelActive: { color: c.parent, fontWeight: '800' },
    activeDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.parent,
      marginTop: 1,
    },
  });
}

export function ParentTabBar() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const insets = useSafeAreaInsets();
  const { color: c } = useParentTheme();
  const styles = useMemo(() => createParentTabBarStyles(c), [c]);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const active = isParentNavActive(pathname, tab.path);
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
              size={20}
              color={active ? c.parent : c.muted}
            />
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {tab.label}
            </Text>
            {active ? <View style={styles.activeDot} /> : <View style={{ height: 5 }} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
