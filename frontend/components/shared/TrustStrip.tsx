// components/shared/TrustStrip.tsx
// What a stranger needs to know before hiring, or before accepting work.
//
// Shown when an employer browses helpers and when a helper browses households.
// Two things, in this order:
//
//   1. A SAFETY MARKING, if PESO issued one. It comes first and it is loud,
//      because it changes the decision. Only the short public line PESO wrote is
//      ever shown — never the complaint, never who reported it.
//
//   2. The CREDENTIAL SEALS the account has earned. These carry the credential
//      type and the fact PESO verified it, and nothing else. A Valid ID seal can
//      appear here while the document itself stays PESO-only, because "PESO
//      checked their ID" is a safe thing for a stranger to know and the ID
//      itself — which carries a home address — is not.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CredentialBadge, credentialStateFor } from './CredentialBadge';
import { FontFamily } from '@/constants/GlobalStyles';

export type PublicCredential = { document_type?: string | null; status?: string | null };
export type PublicSafetyFlag = { level?: string | null; public_reason?: string | null; issued_at?: string | null } | null;

export function SafetyMarking({ flag, dark, compact, style }: {
  flag: PublicSafetyFlag; dark?: boolean; compact?: boolean; style?: ViewStyle;
}) {
  if (!flag?.public_reason) return null;
  const serious = String(flag.level ?? '').toLowerCase() === 'serious';
  const ink = serious ? (dark ? '#FCA5A5' : '#B91C1C') : (dark ? '#FCD34D' : '#A16207');
  const bg = serious
    ? (dark ? 'rgba(239,68,68,0.16)' : '#FEF2F2')
    : (dark ? 'rgba(251,191,36,0.16)' : '#FFFBEB');
  const edge = serious ? (dark ? 'rgba(248,113,113,0.55)' : '#FCA5A5') : (dark ? 'rgba(252,211,77,0.5)' : '#FCD34D');

  return (
    <View style={[m.wrap, { backgroundColor: bg, borderColor: edge }, compact && m.wrapCompact, style]}>
      <Ionicons name={serious ? 'warning' : 'alert-circle-outline'} size={compact ? 13 : 15} color={ink} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[m.title, { color: ink }, compact && m.titleCompact]}>
          {serious ? 'PESO flagged — serious' : 'PESO caution'}
        </Text>
        {!compact && <Text style={[m.reason, { color: dark ? '#CBD5E1' : '#475569' }]}>{flag.public_reason}</Text>}
      </View>
    </View>
  );
}

export function TrustStrip({
  credentials, safetyFlag, dark, size = 'sm', max, showEmpty, style,
}: {
  credentials?: PublicCredential[] | null;
  safetyFlag?: PublicSafetyFlag;
  dark?: boolean;
  size?: 'sm' | 'md';
  /** Cap the seals shown on a dense card; the rest become a "+N" chip. */
  max?: number;
  /** Say "no seals yet" instead of rendering nothing. */
  showEmpty?: boolean;
  style?: ViewStyle;
}) {
  const seals = useMemo(
    () => (credentials ?? []).filter((c) => credentialStateFor(c, c.document_type) === 'sealed'),
    [credentials],
  );
  const shown = max ? seals.slice(0, max) : seals;
  const extra = seals.length - shown.length;

  if (!safetyFlag?.public_reason && seals.length === 0 && !showEmpty) return null;

  return (
    <View style={style}>
      <SafetyMarking flag={safetyFlag ?? null} dark={dark} compact={size === 'sm'} style={{ marginBottom: seals.length ? 7 : 0 }} />
      {seals.length > 0 ? (
        <View style={m.row}>
          {shown.map((c, i) => (
            <CredentialBadge
              key={`${c.document_type}-${i}`}
              documentType={c.document_type}
              state="sealed"
              size={size}
              dark={dark}
              delay={i * 60}
              style={{ flexGrow: 1, minWidth: size === 'sm' ? 140 : 190 }}
            />
          ))}
          {extra > 0 && (
            <View style={[m.more, { borderColor: dark ? 'rgba(148,163,184,0.35)' : '#D8DEE7' }]}>
              <Text style={[m.moreText, { color: dark ? '#94A3B8' : '#64748B' }]}>+{extra}</Text>
            </View>
          )}
        </View>
      ) : showEmpty ? (
        <Text style={[m.empty, { color: dark ? '#94A3B8' : '#64748B' }]}>No PESO seals yet.</Text>
      ) : null}
    </View>
  );
}

const m = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1.2, borderRadius: 11, paddingVertical: 8, paddingHorizontal: 10 },
  wrapCompact: { paddingVertical: 6, paddingHorizontal: 9, borderRadius: 9 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },
  titleCompact: { fontSize: 11 },
  reason: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, marginTop: 2, lineHeight: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  more: { justifyContent: 'center', paddingHorizontal: 10, borderRadius: 11, borderWidth: 1.4, borderStyle: 'dashed' },
  moreText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5 },
  empty: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5 },
});
