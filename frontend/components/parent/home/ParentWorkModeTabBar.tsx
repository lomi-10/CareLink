// components/parent/home/ParentWorkModeTabBar.tsx
// Work Mode bottom tab bar for the parent portal.
// Tabs: Dashboard · Helpers · Tasks · Messages · Profile
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily } from '@/constants/GlobalStyles';
import { useConversations } from '@/hooks/shared/useMessages';
import { GOLD, BROWN } from './parentWarmTheme';
import { isParentNavActive } from './parentPortalNav';

const BAR_BG     = '#F1DDBE';
const ACTIVE_C   = BROWN;
const INACTIVE_C = 'rgba(59,42,24,0.55)';

type TabDef = {
  path: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDef[] = [
  { path: '/(parent)/home',                 label: 'Dashboard', icon: 'home-outline',        iconActive: 'home' },
  { path: '/(parent)/hire',                 label: 'Helpers',   icon: 'people-outline',      iconActive: 'people' },
  { path: '/(parent)/hire/placement_tasks', label: 'Tasks',     icon: 'clipboard-outline',   iconActive: 'clipboard' },
  { path: '/(parent)/messages',             label: 'Messages',  icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { path: '/(parent)/profile',              label: 'Profile',   icon: 'person-outline',      iconActive: 'person' },
];

export function ParentWorkModeTabBar() {
  const router   = useRouter();
  const pathname = usePathname() ?? '';
  const insets   = useSafeAreaInsets();
  const { conversations } = useConversations();
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const TASK_SCREENS = ['placement_tasks', 'task_board', 'ai_tasks', 'task_details'];
  const onTaskScreen = TASK_SCREENS.some(p => pathname.includes(p));

  function isActive(tab: TabDef): boolean {
    if (tab.path.includes('placement_tasks')) {
      return onTaskScreen;
    }
    if (tab.path === '/(parent)/hire') {
      return isParentNavActive(pathname, tab.path) && !onTaskScreen;
    }
    return isParentNavActive(pathname, tab.path);
  }

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const active = isActive(tab);
        const isMsg  = tab.path.includes('messages');
        const hasBadge = isMsg && unreadMessages > 0;

        return (
          <TouchableOpacity
            key={tab.path}
            style={s.tab}
            onPress={() => router.push(tab.path as never)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
          >
            <View style={s.iconWrap}>
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={22}
                color={active ? ACTIVE_C : INACTIVE_C}
              />
              {hasBadge && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
                </View>
              )}
            </View>
            <Text
              style={[s.label, active && s.labelActive]}
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

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: BAR_BG,
    paddingTop: 10,
    paddingHorizontal: 4,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 14 },
      default: { boxShadow: '0 -4px 20px rgba(0,0,0,0.25)' } as any,
    }),
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4, minWidth: 0 },
  iconWrap: { position: 'relative' },
  label: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 10,
    color: INACTIVE_C,
    maxWidth: '100%',
  },
  labelActive: {
    fontFamily: FontFamily.fredokaSemiBold,
    color: ACTIVE_C,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: GOLD,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 9,
    color: '#fff',
  },
});
