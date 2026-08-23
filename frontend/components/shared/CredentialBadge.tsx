// components/shared/CredentialBadge.tsx
// The PESO credential seal.
//
// DESIGN INTENT: a verified credential should feel *earned*. A flat green pill
// reading "Verified" does not — it looks like a form validation message. So a
// PESO-verified credential gets a real seal: a scalloped rosette (two rotated
// rounded squares, the shape every official seal borrows), a gradient body in
// the credential's own hue, and a single sheen sweep on mount.
//
// The restraint is deliberate and load-bearing. Credentials PESO CANNOT vouch
// for (NBI, Police — see constants/credentials.ts) render flat, dashed and
// grey, with no seal and no sheen. That contrast is the whole point: the seal
// means something precisely because not everything gets one.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import {
  credentialsForRole, credentialSpec,
  type CredentialRole, type CredentialSpec, type CredentialTier,
} from '@/constants/credentials';
import { FontFamily } from '@/constants/GlobalStyles';

// ── Tier palettes ────────────────────────────────────────────────────────────
// Hue distinguishes WHICH credential at a glance; the shared seal shape is what
// says "PESO". TESDA gets gold because a national competency certificate is
// genuinely the most prestigious thing a kasambahay can hold.
type Palette = { ink: string; grad: readonly [string, string]; tint: string; edge: string };

const TIER: Record<CredentialTier, Palette> = {
  identity:  { ink: '#047857', grad: ['#34D399', '#059669'], tint: '#ECFDF5', edge: '#6EE7B7' },
  residency: { ink: '#1D4ED8', grad: ['#60A5FA', '#2563EB'], tint: '#EFF6FF', edge: '#93C5FD' },
  skill:     { ink: '#A16207', grad: ['#FBBF24', '#D97706'], tint: '#FFFBEB', edge: '#FCD34D' },
  clearance: { ink: '#475569', grad: ['#94A3B8', '#64748B'], tint: '#F1F5F9', edge: '#CBD5E1' },
};

const DARK_TINT: Record<CredentialTier, string> = {
  identity: 'rgba(52,211,153,0.13)',
  residency: 'rgba(96,165,250,0.13)',
  skill: 'rgba(251,191,36,0.14)',
  clearance: 'rgba(148,163,184,0.11)',
};
const DARK_INK: Record<CredentialTier, string> = {
  identity: '#6EE7B7', residency: '#93C5FD', skill: '#FCD34D', clearance: '#94A3B8',
};

export type CredentialState = 'sealed' | 'onfile' | 'pending' | 'flagged' | 'missing' | 'optional';

/**
 * Maps a user_documents row to what the badge should show. Two rules live here
 * and nowhere else:
 *
 *  • A document type PESO cannot verify never reaches 'sealed', whatever status
 *    the row carries.
 *  • An ABSENT credential is only 'missing' when PESO actually requires it.
 *    Optional ones report 'optional', so a helper who never added a TESDA cert
 *    is not told they failed to submit something.
 *
 * `fallbackType` lets the caller name the credential when there is no row at
 * all — without it an absent document has no type to reason about.
 */
export function credentialStateFor(
  doc?: { status?: string | null; document_type?: string | null } | null,
  fallbackType?: string | null,
): CredentialState {
  if (!doc) return credentialSpec(fallbackType).core ? 'missing' : 'optional';
  const spec = credentialSpec(doc.document_type ?? fallbackType);
  const status = String(doc.status ?? '').toLowerCase();
  if (status === 'rejected') return 'flagged';
  if (status === 'verified') return spec.pesoVerifiable ? 'sealed' : 'onfile';
  return 'pending';
}

// ── The scalloped seal rosette ───────────────────────────────────────────────
function SealMark({ size, colors }: { size: number; colors: readonly [string, string] }) {
  const petal: ViewStyle = {
    position: 'absolute', width: size * 0.84, height: size * 0.84,
    borderRadius: size * 0.27, overflow: 'hidden',
  };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={petal}>
        <LinearGradient colors={colors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[petal, { transform: [{ rotate: '45deg' }] }]}>
        <LinearGradient colors={colors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      <Ionicons name="checkmark-sharp" size={size * 0.46} color="#fff" style={{ marginTop: -0.5 }} />
    </View>
  );
}

// ── One-shot sheen sweep ─────────────────────────────────────────────────────
// Runs once on mount, then never again — an animation that loops reads as a
// loading spinner, not as polish.
function Sheen({ delay }: { delay: number }) {
  return (
    <MotiView
      pointerEvents="none"
      from={{ translateX: -160, opacity: 0 }}
      animate={{ translateX: 320, opacity: 1 }}
      transition={{ type: 'timing', duration: 1150, delay: delay + 260 }}
      style={{ position: 'absolute', top: -20, bottom: -20, width: 70, transform: [{ rotate: '18deg' }] }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </MotiView>
  );
}

// ── The badge ────────────────────────────────────────────────────────────────
export function CredentialBadge({
  documentType, state, size = 'md', dark, delay = 0, onPress, style,
}: {
  documentType?: string | null;
  /** Derive it from a document row with credentialStateFor(). */
  state: CredentialState;
  size?: 'sm' | 'md';
  dark?: boolean;
  delay?: number;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const spec = credentialSpec(documentType);
  const sealed = state === 'sealed';
  const flagged = state === 'flagged';

  // A flagged credential is its own visual class — it must not look like a
  // quieter version of verified, it must look wrong.
  const tier: CredentialTier = flagged ? 'clearance' : sealed ? spec.tier : 'clearance';
  const pal = TIER[tier];
  const ink = flagged ? '#B91C1C' : dark ? DARK_INK[tier] : pal.ink;
  const tint = flagged ? (dark ? 'rgba(239,68,68,0.14)' : '#FEF2F2') : dark ? DARK_TINT[tier] : pal.tint;
  const edge = flagged ? (dark ? 'rgba(248,113,113,0.5)' : '#FCA5A5') : sealed ? pal.edge : (dark ? 'rgba(148,163,184,0.35)' : '#D8DEE7');

  const line2 =
    flagged ? 'Flagged by PESO'
    : state === 'pending' ? 'Awaiting PESO review'
    : state === 'missing' ? 'Required — not yet submitted'
    // Deliberately not "not submitted": nobody asked for this one, so the copy
    // must read as an opportunity rather than an outstanding task.
    : state === 'optional' ? 'Optional — add to stand out'
    : spec.proves;

  const s = useMemo(() => makeStyles(size), [size]);
  const compact = size === 'sm';

  const body = (
    <MotiView
      from={{ opacity: 0, translateY: 8, scale: 0.97 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: 'timing', duration: 340, delay }}
      style={[
        s.card,
        // Android can't draw a dashed border together with a border radius — it
        // silently falls back to solid. Ask for solid there rather than relying
        // on the fallback; the gradient chip and the seal still carry the
        // earned/not-earned distinction on their own.
        { backgroundColor: tint, borderColor: edge, borderStyle: sealed || Platform.OS === 'android' ? 'solid' : 'dashed' },
        sealed && !dark && { shadowColor: pal.ink, shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
        style,
      ]}
    >
      {sealed && <Sheen delay={delay} />}

      {/* Icon chip — gradient when sealed, flat when not */}
      <View style={[s.chip, !sealed && { backgroundColor: dark ? 'rgba(148,163,184,0.2)' : '#E2E8F0' }]}>
        {sealed && (
          <LinearGradient colors={pal.grad as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: compact ? 9 : 12 }]} />
        )}
        <Ionicons
          name={flagged ? 'alert' : spec.icon}
          size={compact ? 14 : 19}
          color={sealed ? '#fff' : ink}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.name, { color: dark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>{spec.short}</Text>
        <Text style={[s.proves, { color: ink }]} numberOfLines={1}>{line2}</Text>
        {!compact && sealed && (
          <View style={s.authRow}>
            <View style={[s.authDot, { backgroundColor: ink }]} />
            <Text style={[s.auth, { color: dark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
              PESO VERIFIED · {spec.authority.replace('PESO ', '').toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {sealed ? <SealMark size={compact ? 18 : 26} colors={pal.grad} />
        : flagged ? <Ionicons name="warning" size={compact ? 15 : 19} color={ink} />
        : null}
    </MotiView>
  );

  if (!onPress) return body;
  return <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>{body}</Pressable>;
}

// ── The wall ─────────────────────────────────────────────────────────────────
// Split into two groups, because the two mean different things:
//
//   PESO VERIFICATION — the Valid ID and Barangay Clearance. This is the bar.
//     An empty slot here is a genuine gap and is counted.
//
//   ADDITIONAL CREDENTIALS — helper-only extras. An empty slot here is NOT a
//     gap and is never counted; running them together in one grid was the whole
//     problem, because a helper with both required seals still saw three grey
//     tiles and read the wall as "2 of 5 done".
export function CredentialWall({
  documents, role = 'helper', dark, title = 'Credentials', subtitle, size = 'md', onPressCredential, style,
}: {
  // document_id is a number from the PESO endpoints and a string from the
  // helper/parent profile payloads — the wall only groups by type, so accept both.
  documents: Array<{ document_type?: string | null; status?: string | null; document_id?: number | string }>;
  /** Which slots this account is asked for. Employers are verified as a
   *  household and are never asked for the helper-side extras. */
  role?: CredentialRole;
  dark?: boolean;
  title?: string | null;
  subtitle?: string;
  size?: 'sm' | 'md';
  onPressCredential?: (documentType: string) => void;
  style?: ViewStyle;
}) {
  const specs = useMemo(() => credentialsForRole(role), [role]);

  const { core, extra, coreSealed, coreTotal, bonusSealed, hasUnsealable } = useMemo(() => {
    const byType = new Map<string, any>();
    for (const d of documents ?? []) if (d?.document_type) byType.set(d.document_type, d);

    const rank: Record<CredentialState, number> = {
      sealed: 0, onfile: 1, pending: 2, flagged: 3, missing: 4, optional: 5,
    };
    const build = (list: CredentialSpec[]) => list
      .map((spec) => ({ spec, state: credentialStateFor(byType.get(spec.type), spec.type) }))
      .sort((a, b) => rank[a.state] - rank[b.state]);

    const coreSpecs = specs.filter((c) => c.core);
    const extraSpecs = specs.filter((c) => !c.core);
    const coreRows = build(coreSpecs);
    const extraRows = build(extraSpecs);

    return {
      core: coreRows,
      extra: extraRows,
      coreSealed: coreRows.filter((r) => r.state === 'sealed').length,
      coreTotal: coreSpecs.length,
      bonusSealed: extraRows.filter((r) => r.state === 'sealed').length,
      hasUnsealable: extraSpecs.some((c) => !c.pesoVerifiable),
    };
  }, [documents, specs]);

  const complete = coreSealed === coreTotal && coreTotal > 0;
  const muted = dark ? '#94A3B8' : '#64748B';
  const gold = dark ? '#FCD34D' : '#A16207';

  const Grid = ({ rows, offset }: { rows: Array<{ spec: CredentialSpec; state: CredentialState }>; offset: number }) => (
    <View style={w.grid}>
      {rows.map(({ spec, state }, i) => (
        <View key={spec.type} style={w.cell}>
          <CredentialBadge
            documentType={spec.type}
            state={state}
            size={size}
            dark={dark}
            delay={(offset + i) * 70}
            onPress={onPressCredential ? () => onPressCredential(spec.type) : undefined}
          />
        </View>
      ))}
    </View>
  );

  return (
    <View style={style}>
      {title !== null && (
        <View style={w.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[w.title, { color: dark ? '#F8FAFC' : '#0F172A' }]}>{title}</Text>
            <Text style={[w.sub, { color: muted }]}>
              {subtitle ?? (complete
                ? 'Fully PESO Verified'
                : `${coreSealed} of ${coreTotal} required seals earned`)}
            </Text>
          </View>
          {bonusSealed > 0 && (
            <MotiView
              from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'timing', duration: 380, delay: 120 }}
              style={[w.tally, { backgroundColor: dark ? 'rgba(251,191,36,0.16)' : '#FFFBEB', borderColor: dark ? 'rgba(252,211,77,0.4)' : '#FCD34D' }]}
            >
              <Ionicons name="ribbon" size={13} color={gold} />
              <Text style={[w.tallyText, { color: gold }]}>+{bonusSealed} bonus seal{bonusSealed !== 1 ? 's' : ''}</Text>
            </MotiView>
          )}
        </View>
      )}

      <Text style={[w.groupLabel, { color: muted }]}>
        Required for PESO verification
      </Text>
      <Grid rows={core} offset={0} />

      {extra.length > 0 && (
        <>
          <Text style={[w.groupLabel, { color: muted, marginTop: 14 }]}>
            Additional credentials · optional
          </Text>
          <Grid rows={extra} offset={core.length} />

          {/* Says out loud why two of these can never be sealed. Without it a
              helper who uploaded an NBI clearance just sees a badge stay grey. */}
          {hasUnsealable && (
            <View style={[w.note, { backgroundColor: dark ? 'rgba(148,163,184,0.1)' : '#F8FAFC', borderColor: dark ? 'rgba(148,163,184,0.22)' : '#E2E8F0' }]}>
              <Ionicons name="information-circle-outline" size={14} color={muted} />
              <Text style={[w.noteText, { color: muted }]}>
                These are never required. NBI and Police Clearances are issued by the NBI and PNP — PESO holds them on file but cannot authenticate them, so they carry no PESO seal. A TESDA NC II can be sealed.
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const makeStyles = (size: 'sm' | 'md') => {
  const compact = size === 'sm';
  return StyleSheet.create({
    card: {
      flexDirection: 'row', alignItems: 'center',
      gap: compact ? 8 : 11,
      paddingVertical: compact ? 7 : 11,
      paddingHorizontal: compact ? 9 : 12,
      borderRadius: compact ? 11 : 15,
      borderWidth: 1.4,
      overflow: 'hidden',
    },
    chip: {
      width: compact ? 26 : 38, height: compact ? 26 : 38,
      borderRadius: compact ? 9 : 12,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: compact ? 12 : 14 },
    proves: { fontFamily: FontFamily.fredokaSemiBold, fontSize: compact ? 10 : 11.5, marginTop: 1 },
    authRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    authDot: { width: 4, height: 4, borderRadius: 2 },
    auth: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 8.5, letterSpacing: 0.7 },
  });
};

const w = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15 },
  sub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, marginTop: 1 },
  tally: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  tallyText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5 },
  groupLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  cell: { flexGrow: 1, flexBasis: 230, minWidth: 200 },
  note: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginTop: 11, padding: 10, borderRadius: 11, borderWidth: 1 },
  noteText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, lineHeight: 16.5 },
});
