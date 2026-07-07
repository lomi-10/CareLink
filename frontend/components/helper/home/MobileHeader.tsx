// components/helper/home/MobileHeader.tsx
// Top navigation bar for helper mobile screens.
// Design: cream background, dark brown hamburger, CareLink logo,
// "Care" dark + "Link" orange brand name, orange portal subtitle, bell icon.

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { FontFamily } from '@/constants/GlobalStyles';
import { useMemo } from 'react';
import { useHelperWarm, type HelperWarm } from './helperWarmTheme';

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
  const w = useHelperWarm();
  const s = useMemo(() => makeStyles(w), [w]);
  return (
    <View style={s.bar}>

      {/* Hamburger */}
      <TouchableOpacity style={s.iconBtn} onPress={onMenuPress} activeOpacity={0.7}>
        <Ionicons name="menu" size={26} color={w.DARK} />
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
        <Ionicons name="notifications-outline" size={24} color={w.DARK} />
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

const makeStyles = (w: HelperWarm) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: w.SURFACE,
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
  brandCare: { fontFamily: FontFamily.fredokaSemiBold, color: w.DARK },
  brandLink: { fontFamily: FontFamily.fredokaSemiBold, color: w.ORANGE },
  subtitle: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 9,
    color: w.ORANGE,
    letterSpacing: 1.4,
    marginTop: 1,
  },

  // notification badge
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: w.ORANGE,
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
