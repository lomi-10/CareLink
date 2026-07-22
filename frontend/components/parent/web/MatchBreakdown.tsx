// components/parent/web/MatchBreakdown.tsx
// Turns a HelperJobMatch into a clear "why this %" explanation, so a parent can
// see exactly what drove the number instead of trusting a bare percentage.
//
// Two layers:
//   • a one-line headline naming the single biggest reason
//   • a per-signal breakdown (Category, Skills, Distance…) with a mini bar and
//     the points earned, strongest first.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HelperJobMatch } from '@/lib/parentHelperMatch';
import { pt } from './parentWebTheme';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  category: 'pricetag-outline',
  skills: 'construct-outline',
  roles: 'briefcase-outline',
  salary: 'cash-outline',
  experience: 'time-outline',
  location: 'location-outline',
  distance: 'location-outline',
  rating: 'star-outline',
  verification: 'shield-checkmark-outline',
  versatility: 'sparkles-outline',
};

export function MatchBreakdown({
  match,
  firstName,
  jobTitle,
  compact = false,
}: {
  match: HelperJobMatch;
  /** Helper's first name for the headline; falls back to "This helper". */
  firstName?: string;
  /** When present, frames the headline around a specific job. */
  jobTitle?: string;
  /** Hides the per-factor bars, leaving just the headline + top reasons. */
  compact?: boolean;
}) {
  const who = firstName?.trim() || 'This helper';
  const top = match.factors.find((f) => f.hit && f.earned > 0) ?? match.factors[0];

  return (
    <View style={s.wrap}>
      {/* Headline */}
      <View style={s.head}>
        <View style={s.scoreBadge}>
          <Text style={s.scoreNum}>{match.score}%</Text>
          <Text style={s.scoreLabel}>match</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headTitle}>Why {who} ranks here</Text>
          <Text style={s.headSub} numberOfLines={2}>
            {top ? top.detail : 'Scored on category, skills, distance, salary and rating.'}
            {jobTitle ? ` · for ${jobTitle}` : ''}
          </Text>
        </View>
      </View>

      {compact ? (
        // Just the strongest reasons as ticks.
        <View style={s.reasons}>
          {match.reasons.slice(0, 3).map((r, i) => (
            <View key={i} style={s.reasonRow}>
              <Ionicons name="checkmark-circle" size={14} color={pt.green} />
              <Text style={s.reasonText}>{r}</Text>
            </View>
          ))}
        </View>
      ) : (
        // Full per-signal breakdown with bars.
        <View style={s.factors}>
          {match.factors.map((f) => {
            const ratio = f.max > 0 ? f.earned / f.max : 0;
            const strong = ratio >= 0.75;
            const some = ratio > 0 && !strong;
            const barColor = strong ? pt.green : some ? pt.accent : pt.line;
            const iconColor = f.earned > 0 ? (strong ? pt.green : pt.accent) : pt.subtle;
            return (
              <View key={f.key} style={s.factorRow}>
                <View style={s.factorIc}>
                  <Ionicons name={ICONS[f.key] ?? 'ellipse-outline'} size={14} color={iconColor} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.factorTop}>
                    <Text style={s.factorLabel}>{f.label}</Text>
                    <Text style={[s.factorPts, f.earned === 0 && { color: pt.subtle }]}>
                      {f.earned}/{f.max}
                    </Text>
                  </View>
                  <View style={s.factorBarTrack}>
                    <View style={[s.factorBarFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: barColor }]} />
                  </View>
                  <Text style={s.factorDetail} numberOfLines={1}>{f.detail}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreBadge: {
    width: 58, height: 58, borderRadius: 16,
    backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontFamily: 'Fredoka-SemiBold', fontSize: 19, color: '#9A6B12', letterSpacing: -0.5 },
  scoreLabel: { fontFamily: 'Fredoka-Regular', fontSize: 10, color: '#9A6B12', marginTop: -2 },
  headTitle: { fontFamily: 'Fredoka-SemiBold', fontSize: 14.5, color: pt.ink },
  headSub: { fontFamily: 'Fredoka-Regular', fontSize: 12.5, color: pt.muted, marginTop: 2, lineHeight: 17 },

  reasons: { gap: 7 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  reasonText: { flex: 1, fontFamily: 'Fredoka-Regular', fontSize: 13, color: pt.ink, lineHeight: 18 },

  factors: { gap: 11 },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  factorIc: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: pt.raise, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  factorTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  factorLabel: { fontFamily: 'Fredoka-SemiBold', fontSize: 12.5, color: pt.ink },
  factorPts: { fontFamily: 'Fredoka-SemiBold', fontSize: 11.5, color: pt.muted },
  factorBarTrack: { height: 5, borderRadius: 3, backgroundColor: pt.lineSoft, marginTop: 5, overflow: 'hidden' },
  factorBarFill: { height: 5, borderRadius: 3 },
  factorDetail: { fontFamily: 'Fredoka-Regular', fontSize: 11.5, color: pt.muted, marginTop: 4 },
});
