// components/helper/home/HelperTabBar.tsx
// Mobile bottom tab bar for the helper portal (job-hunting mode).
// Dark brown background, elevated center Apply button, message count badge.

import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily } from '@/constants/GlobalStyles';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { useResponsive } from '@/hooks/shared';
import { useConversations } from '@/hooks/shared/useMessages';
import { isHelperNavActive } from './helperPortalNav';

// ─── Constants ────────────────────────────────────────────────────────────────

const BAR_BG      = '#2A1608';
const ACTIVE_C    = '#FFFFFF';
const INACTIVE_C  = 'rgba(255,255,255,0.45)';
const ORANGE      = '#E86019';
const APPLY_SIZE  = 56;

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabDef = {
  path:       string;
  label:      string;
  icon:       keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  isCenter?:  boolean;
};

const TABS: TabDef[] = [
  { path: '/(helper)/home',         label: 'Home',      icon: 'home-outline',           iconActive: 'home' },
  { path: '/(helper)/browse',       label: 'Find Jobs',  icon: 'search-outline',         iconActive: 'search' },
  { path: '/(helper)/applications', label: 'Apply',      icon: 'briefcase-outline',      iconActive: 'briefcase',  isCenter: true },
  { path: '/(helper)/messages',     label: 'Messages',   icon: 'chatbubbles-outline',    iconActive: 'chatbubbles' },
  { path: '/(helper)/profile',      label: 'Profile',    icon: 'person-outline',         iconActive: 'person' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function HelperTabBar() {
  const router   = useRouter();
  const pathname = usePathname() ?? '';
  const insets   = useSafeAreaInsets();
  const { isDesktop }           = useResponsive();
  const { ready, isWorkMode, activeHire } = useHelperWorkMode();
  const { conversations }       = useConversations();
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  if (!ready || isDesktop)         return null;
  if (isWorkMode && activeHire)    return null;

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const active = isHelperNavActive(pathname, tab.path);
        const isMsg  = tab.path.includes('messages');
        const hasBadge = isMsg && unreadMessages > 0;

        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key={tab.path}
              style={s.centerTab}
              onPress={() => router.push(tab.path as never)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              {/* Elevated orange FAB */}
              <View style={s.centerCircle}>
                <Ionicons
                  name={active ? tab.iconActive : tab.icon}
                  size={26}
                  color="#FFFFFF"
                />
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
            {/* Icon with optional badge */}
            <View style={s.iconWrap}>
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={22}
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

            <Text style={[s.label, active && s.labelActive]}>{tab.label}</Text>
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

  // Normal tab
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  iconWrap: { position: 'relative' },
  label: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 10,
    color: INACTIVE_C,
  },
  labelActive: {
    fontFamily: FontFamily.fredokaSemiBold,
    color: ACTIVE_C,
  },

  // Message badge
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: ORANGE,
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

  // Center elevated Apply button
  centerTab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingBottom: 4,
  },
  centerCircle: {
    width: APPLY_SIZE,
    height: APPLY_SIZE,
    borderRadius: APPLY_SIZE / 2,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -(APPLY_SIZE / 2 + 4), // lifts it above the bar
    ...Platform.select({
      ios:     { shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10 },
      android: { elevation: 8 },
      default: { boxShadow: `0 4px 16px ${ORANGE}88` } as any,
    }),
  },
  centerLabel: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 10,
    color: ORANGE,
    marginTop: 2,
  },
});
