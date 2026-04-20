import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

const TABS: {
  path: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
  isActive: (pathname: string) => boolean;
}[] = [
  {
    path: '/(parent)/home',
    label: 'Home',
    icon: 'home-outline',
    iconActive: 'home',
    isActive: (p) =>
      p.includes('/home') && !p.includes('browse_helpers') && !p.includes('active_helpers'),
  },
  {
    path: '/(parent)/browse_helpers',
    label: 'Find',
    icon: 'search-outline',
    iconActive: 'search',
    isActive: (p) => p.includes('browse_helpers'),
  },
  {
    path: '/(parent)/jobs',
    label: 'Jobs',
    icon: 'briefcase-outline',
    iconActive: 'briefcase',
    isActive: (p) => p.includes('/jobs') && !p.includes('browse'),
  },
  {
    path: '/(parent)/applications',
    label: 'Applicants',
    icon: 'people-outline',
    iconActive: 'people',
    isActive: (p) => p.includes('applications'),
  },
  {
    path: '/(parent)/messages',
    label: 'Messages',
    icon: 'chatbubbles-outline',
    iconActive: 'chatbubbles',
    isActive: (p) => p.includes('messages'),
  },
];

export function ParentTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const active = tab.isActive(pathname || '');
        return (
          <TouchableOpacity
            key={tab.path}
            style={styles.tab}
            onPress={() => router.push(tab.path as never)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={active ? tab.iconActive : tab.icon}
              size={22}
              color={active ? theme.color.parent : theme.color.muted}
            />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    backgroundColor: theme.color.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: theme.color.line,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  label: { fontSize: 10, fontWeight: '600', color: theme.color.muted },
  labelActive: { color: theme.color.parent, fontWeight: '800' },
});
