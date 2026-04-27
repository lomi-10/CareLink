import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import { isHelperNavActive } from '@/components/helper/home/helperPortalNav';

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
  { path: '/(helper)/profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

export function WorkModeTabBar() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const insets = useSafeAreaInsets();
  const { color: c } = useHelperTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingTop: 8,
          backgroundColor: c.surfaceElevated,
          borderTopWidth: 1,
          borderTopColor: c.line,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = isHelperNavActive(pathname, tab.path);
        return (
          <TouchableOpacity
            key={tab.path}
            style={{ flex: 1, alignItems: 'center', gap: 1, paddingVertical: 4, minWidth: 0 }}
            onPress={() => router.push(tab.path as any)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={active ? tab.iconActive : tab.icon}
              size={20}
              color={active ? c.helper : c.muted}
            />
            <Text
              style={[
                { fontSize: 9, fontWeight: '600', color: c.muted },
                active && { color: c.helper, fontWeight: '800' },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
