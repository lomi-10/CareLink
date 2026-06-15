import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isHelperNavActive } from '@/components/helper/home/helperPortalNav';
import { DARK, ORANGE, SUBTLE } from '@/components/helper/home/helperWarmTheme';

const TABS: {
  path: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { path: '/(helper)/home', label: 'Work', icon: 'home-outline', iconActive: 'home' },
  { path: '/(helper)/work/tasks', label: 'Tasks', icon: 'list-outline', iconActive: 'list' },
  { path: '/(helper)/work', label: 'Schedule', icon: 'calendar-outline', iconActive: 'calendar' },
  { path: '/(helper)/messages', label: 'Messages', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { path: '/(helper)/profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

export function WorkModeTabBar() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 8,
        backgroundColor: DARK,
        paddingBottom: Math.max(insets.bottom, 8),
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.25, shadowRadius: 12 },
          android: { elevation: 16 },
          default: { boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' } as any,
        }),
      }}
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
              color={active ? ORANGE : SUBTLE}
            />
            <Text
              style={[
                { fontSize: 9, fontWeight: '600' as const, color: SUBTLE },
                active && { color: ORANGE, fontWeight: '800' as const },
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
