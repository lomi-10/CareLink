import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      
      {/* Tab 1: Home */}
      <Tabs.Screen
        name="home" 
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      {/* Tab 2: Settings (HIDDEN FROM BOTTOM BAR) */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          href: null, // <-- This removes it from the bottom tab bar
          // We can keep the icon config just in case, but it won't show
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />

      {/* Tab 3: Profile (HIDDEN FROM BOTTOM BAR) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: null, // <-- This removes it from the bottom tab bar
          // We can keep the icon config just in case, but it won't show
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}