// components/helper/home/HelperStatsCard.tsx
// 4-column unified stats card: Applied, Saved, Profile Views, Profile Strength.
// Used on the helper dashboard (non-hired state).

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCol {
  icon:     keyof typeof Ionicons.glyphMap;
  iconBg:   string;
  iconColor:string;
  value:    string | number;
  label:    string;
  actionLabel: string;
  onAction?: () => void;
}

interface HelperStatsCardProps {
  applied:         number;
  saved:           number;
  profileViews:    number;
  profileStrength: number; // 0-100
  onApplied?:      () => void;
  onSaved?:        () => void;
  onViews?:        () => void;
  onStrength?:     () => void;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const ACCENT   = '#E86019';
const LABEL_C  = '#6B4F3A';
const VALUE_C  = '#2A1608';
const ICON_BG  = '#F5E6CC';

// ─── Component ────────────────────────────────────────────────────────────────

export function HelperStatsCard({
  applied, saved, profileViews, profileStrength,
  onApplied, onSaved, onViews, onStrength,
}: HelperStatsCardProps) {
  const router = useRouter();

  const cols: StatCol[] = [
    {
      icon: 'briefcase', iconBg: ICON_BG, iconColor: '#7A4E2A',
      value: applied, label: 'Applied',
      actionLabel: 'View all',
      onAction: onApplied ?? (() => router.push('/(helper)/applications')),
    },
    {
      icon: 'bookmark', iconBg: ICON_BG, iconColor: '#7A4E2A',
      value: saved, label: 'Saved',
      actionLabel: 'View all',
      onAction: onSaved ?? (() => router.push('/(helper)/browse/saved_jobs')),
    },
    {
      icon: 'eye', iconBg: '#D8F5EC', iconColor: '#059669',
      value: profileViews, label: 'Profile Views',
      actionLabel: 'View all',
      onAction: onViews,
    },
    {
      icon: 'shield-checkmark', iconBg: ICON_BG, iconColor: '#E86019',
      value: `${profileStrength}%`, label: 'Profile Strength',
      actionLabel: profileStrength < 100 ? 'Improve' : 'Perfect!',
      onAction: onStrength ?? (() => router.push('/(helper)/profile')),
    },
  ];

  return (
    <View style={s.card}>
      {cols.map((col, idx) => (
        <React.Fragment key={col.label}>
          {idx > 0 && <View style={s.divider} />}
          <StatColumn {...col} />
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function StatColumn({ icon, iconBg, iconColor, value, label, actionLabel, onAction }: StatCol) {
  return (
    <View style={s.col}>
      <View style={[s.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={s.value}>{value}</Text>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity
        onPress={onAction}
        disabled={!onAction}
        activeOpacity={0.7}
        style={s.actionRow}
        hitSlop={8}
      >
        <Text style={[s.actionText, !onAction && { color: '#CBD5E1' }]}>
          {actionLabel}
        </Text>
        {onAction && (
          <Ionicons name="chevron-forward" size={11} color={ACCENT} />
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 18,
    ...Platform.select({
      ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
      default: { boxShadow: '0 4px 16px rgba(139,94,60,0.10)' } as any,
    }),
  },

  col: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },

  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#EDE0D0',
    marginVertical: 4,
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  value: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 20,
    color: VALUE_C,
    letterSpacing: -0.3,
  },
  label: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 11,
    color: LABEL_C,
    textAlign: 'center',
    lineHeight: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  actionText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 11,
    color: ACCENT,
  },
});
