// components/shared/DocumentStatusTag.tsx
// One consistent way to say where a document stands.
//
// The old pills just said "Verified", which left the important part unsaid:
// verification is done by a PESO officer, not by CareLink and not by the AI
// pre-scan. Users read "Verified" next to an AI scan result and reasonably
// assumed the app had cleared them. Naming PESO makes the authority explicit,
// which is the whole trust model.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';

export type DocStatus = 'Verified' | 'Rejected' | 'Pending' | string;

const MAP: Record<string, {
  label: string; icon: keyof typeof Ionicons.glyphMap; fg: string; bg: string;
}> = {
  Verified: { label: 'PESO Verified',   icon: 'shield-checkmark', fg: '#059669', bg: '#D1FAE5' },
  Rejected: { label: 'Rejected by PESO', icon: 'close-circle',     fg: '#DC2626', bg: '#FECACA' },
  Pending:  { label: 'Awaiting PESO',    icon: 'time-outline',     fg: '#B45309', bg: '#FEF3C7' },
};

export function DocumentStatusTag({ status, compact }: { status: DocStatus; compact?: boolean }) {
  const cfg = MAP[status] ?? MAP.Pending;
  return (
    <View style={[s.tag, { backgroundColor: cfg.bg }, compact && s.tagCompact]}>
      <Ionicons name={cfg.icon} size={compact ? 10 : 12} color={cfg.fg} />
      <Text style={[s.text, { color: cfg.fg }, compact && s.textCompact]}>{cfg.label}</Text>
    </View>
  );
}

/** Separate marker for the AI pre-scan, so it is never mistaken for PESO's decision. */
export function AiScanTag({ status, compact }: { status?: string | null; compact?: boolean }) {
  if (!status || status === 'Unchecked') return null;
  const passed = status === 'Passed';
  return (
    <View style={[s.tag, { backgroundColor: '#FEE2D5' }, compact && s.tagCompact]}>
      <Ionicons name="sparkles" size={compact ? 10 : 11} color="#E86019" />
      <Text style={[s.text, { color: '#E86019' }, compact && s.textCompact]}>
        AI pre-check {passed ? 'passed' : 'flagged'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start',
  },
  tagCompact: { paddingHorizontal: 7, paddingVertical: 3 },
  text: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5 },
  textCompact: { fontSize: 10 },
});
