// components/helper/home/MobileHeader.tsx
// Top navigation bar for helper mobile screens.
// Design: cream background, dark brown hamburger, CareLink logo,
// "Care" dark + "Link" orange brand name, orange portal subtitle, bell icon.

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { FontFamily } from '@/constants/GlobalStyles';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG          = '#FFFBF5';    // warm cream
const ICON_COLOR  = '#3B1A08';    // dark brown
const ORANGE      = '#E86019';    // brand orange

// ─── Props ────────────────────────────────────────────────────────────────────

interface MobileHeaderProps {
  onMenuPress:           () => void;
  notificationCount?:    number;
  onNotificationPress?:  () => void;
  subtitle?:             string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileHeader({
  onMenuPress,
  notificationCount = 0,
  onNotificationPress,
  subtitle = 'HELPER PORTAL',
}: MobileHeaderProps) {
  return (
    <View style={s.bar}>

      {/* Hamburger */}
      <TouchableOpacity style={s.iconBtn} onPress={onMenuPress} activeOpacity={0.7}>
        <Ionicons name="menu" size={26} color={ICON_COLOR} />
      </TouchableOpacity>

      {/* Brand center */}
      <View style={s.brand}>
        <CareLinkLogoMark size={28} />
        <View style={s.brandText}>
          <Text style={s.brandName}>
            <Text style={s.brandCare}>Care</Text>
            <Text style={s.brandLink}>Link</Text>
          </Text>
          {subtitle ? (
            <Text style={s.subtitle}>{subtitle.toUpperCase()}</Text>
          ) : null}
        </View>
      </View>

      {/* Notification bell */}
      <TouchableOpacity
        style={s.iconBtn}
        activeOpacity={0.7}
        onPress={onNotificationPress}
        disabled={!onNotificationPress}
      >
        <Ionicons name="notifications-outline" size={24} color={ICON_COLOR} />
        {notificationCount > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG,
    ...Platform.select({
      ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 3 },
      default: { boxShadow: '0 2px 8px rgba(139,94,60,0.08)' } as any,
    }),
  },

  iconBtn: { padding: 8, position: 'relative' },

  // brand
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: { alignItems: 'center' },
  brandName: { fontSize: 18, letterSpacing: -0.2 },
  brandCare: { fontFamily: FontFamily.fredokaSemiBold, color: ICON_COLOR },
  brandLink: { fontFamily: FontFamily.fredokaSemiBold, color: ORANGE },
  subtitle: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 9,
    color: ORANGE,
    letterSpacing: 1.4,
    marginTop: 1,
  },

  // notification badge
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
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
    color: '#fff',
    fontSize: 9,
  },
});
