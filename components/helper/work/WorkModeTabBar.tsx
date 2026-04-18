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
}[] = [
  { path: '/(helper)/home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { path: '/(helper)/work_tasks', label: 'Tasks', icon: 'list-outline', iconActive: 'list' },
  { path: '/(helper)/work_schedule', label: 'Schedule', icon: 'calendar-outline', iconActive: 'calendar' },
  { path: '/(helper)/work_history', label: 'History', icon: 'time-outline', iconActive: 'time' },
  { path: '/(helper)/messages', label: 'Messages', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
];

export function WorkModeTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const active = pathname === tab.path;
        return (
          <TouchableOpacity
            key={tab.path}
            style={styles.tab}
            onPress={() => router.push(tab.path as any)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={active ? tab.iconActive : tab.icon}
              size={22}
              color={active ? theme.color.helper : theme.color.muted}
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
  labelActive: { color: theme.color.helper, fontWeight: '800' },
});
