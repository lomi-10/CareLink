// components/parent/home/ParentTabBar.tsx
// Mobile bottom tab bar for the parent portal — mirrors the helper portal's
// HelperTabBar look (dark warm bar, bold active labels, elevated center action,
// message unread badge), trimmed to 5 tabs per the reference mockup:
// Dashboard · Find Helpers · Post Job (elevated gold FAB) · Messages · Profile.

import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily } from '@/constants/GlobalStyles';
import { useConversations } from '@/hooks/shared/useMessages';
import { isParentNavActive } from './parentPortalNav';
import { GOLD } from './parentWarmTheme';

// ─── Constants ────────────────────────────────────────────────────────────────

const BAR_BG     = '#F1DDBE';                 // pale caramel — matches the warm hero gradient
const ACTIVE_C   = '#8B5A2B';                 // active tab: icon + label simply turn brown (no box)
const INACTIVE_C = 'rgba(59,42,24,0.55)';     // brown-toned, legible against the pale caramel bar
const FAB_SIZE   = 56;

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabDef = {
  path:       string;
  label:      string;
  icon:       keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  isCenter?:  boolean;
};

const TABS: TabDef[] = [
  { path: '/(parent)/home',     label: 'Dashboard',  icon: 'home-outline',        iconActive: 'home' },
  { path: '/(parent)/browse',   label: 'Find',       icon: 'search-outline',      iconActive: 'search' },
  { path: '/(parent)/jobs',     label: 'Work',       icon: 'briefcase',           iconActive: 'briefcase', isCenter: true },
  { path: '/(parent)/messages', label: 'Messages',   icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { path: '/(parent)/profile',  label: 'Profile',    icon: 'person-outline',      iconActive: 'person' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ParentTabBar() {
  const router   = useRouter();
  const pathname = usePathname() ?? '';
  const insets   = useSafeAreaInsets();
  const { conversations } = useConversations();
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const active   = isParentNavActive(pathname, tab.path);
        const isMsg    = tab.path.includes('messages');
        const hasBadge = isMsg && unreadMessages > 0;

        if (tab.isCenter) {
          const onThisScreen = isParentNavActive(pathname, tab.path);
          return (
            <TouchableOpacity
              key={tab.path}
              style={s.centerTab}
              onPress={() => router.push(tab.path as never)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              <View style={s.centerCircle}>
                <Ionicons name={tab.icon} size={28} color="#FFFFFF" />
              </View>
              <Text style={s.centerLabel}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }

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
            <View style={s.tabContent}>
              <View style={s.iconWrap}>
                <Ionicons
                  name={active ? tab.iconActive : tab.icon}
                  size={18}
                  color={active ? ACTIVE_C : INACTIVE_C}
                />
                {hasBadge && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </Text>
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
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: BAR_BG,
    paddingTop: 10,
    paddingHorizontal: 4,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 16 },
      default: { boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' } as any,
    }),
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    minWidth: 0,
  },
  tabContent: {
    alignItems: 'center',
    gap: 2,
  },
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

  // Message unread badge
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
    color: '#FFFFFF',
  },

  // Center elevated "Post Job" button — gold FAB per reference mockup
  centerTab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingBottom: 4,
  },
  centerCircle: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -(FAB_SIZE / 2 + 4),
    ...Platform.select({
      ios:     { shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10 },
      android: { elevation: 8 },
      default: { boxShadow: `0 4px 16px ${GOLD}88` } as any,
    }),
  },
  centerLabel: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 10,
    marginTop: 2,
    color: ACTIVE_C,
  },
});
