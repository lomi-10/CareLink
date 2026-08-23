// components/shared/SafetyFlagBadge.tsx
// The public marking PESO can place on an account after a confirmed finding.
//
// DESIGN INTENT — restraint is the whole point. This label can cost a kasambahay
// their livelihood, so it is written to inform rather than to shame:
//
//  • It never shows the complaint text, the reporter, or a case reference. Only
//    the short line an officer wrote and the level.
//  • It says WHO issued it. "PESO Ormoc reviewed a complaint" is a checkable
//    claim; an anonymous red banner is just a rumour with styling.
//  • It is amber/red but small and factual — not a skull, not a giant slab. The
//    reader should be able to weigh it, not recoil from it.
//  • The same component renders on employers. A helper deciding whether to work
//    for a household needs this at least as much.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';

export type SafetyFlag = {
  level: 'caution' | 'serious' | string;
  public_reason: string;
  issued_at?: string | null;
} | null | undefined;

const TONE = {
  caution: { fg: '#92400E', bg: '#FEF3C7', edge: '#FCD34D', icon: 'alert-circle' as const, label: 'PESO caution' },
  serious: { fg: '#991B1B', bg: '#FEE2E2', edge: '#FCA5A5', icon: 'warning' as const, label: 'PESO warning' },
};

export function SafetyFlagBadge({
  flag, compact, onPress, style,
}: {
  flag: SafetyFlag;
  /** Chip form for list rows; full form for profiles. */
  compact?: boolean;
  onPress?: () => void;
  style?: any;
}) {
  if (!flag || !flag.public_reason) return null;
  const t = flag.level === 'serious' ? TONE.serious : TONE.caution;

  if (compact) {
    return (
      <View style={[s.chip, { backgroundColor: t.bg, borderColor: t.edge }, style]}>
        <Ionicons name={t.icon} size={11} color={t.fg} />
        <Text style={[s.chipText, { color: t.fg }]} numberOfLines={1}>{t.label}</Text>
      </View>
    );
  }

  const body = (
    <View style={[s.card, { backgroundColor: t.bg, borderColor: t.edge }, style]}>
      <View style={[s.iconWrap, { backgroundColor: t.fg + '1A' }]}>
        <Ionicons name={t.icon} size={17} color={t.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.title, { color: t.fg }]}>{t.label}</Text>
        <Text style={[s.reason, { color: t.fg }]}>{flag.public_reason}</Text>
        {/* Attribution and date, so the reader can judge how current it is. */}
        <Text style={s.meta}>
          Issued by PESO Ormoc after reviewing a complaint
          {flag.issued_at ? ` · ${new Date(String(flag.issued_at).replace(' ', 'T')).toLocaleDateString('en-PH', { dateStyle: 'medium' })}` : ''}
        </Text>
      </View>
    </View>
  );

  if (!onPress) return body;
  return <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>{body}</Pressable>;
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start',
  },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5 },
  card: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', padding: 13, borderRadius: 14, borderWidth: 1.4 },
  iconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5 },
  reason: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  meta: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: '#78716C', marginTop: 6 },
});
