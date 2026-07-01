// app/(helper)/browse/RecommendedJobCard.tsx
// Horizontal-scroll card shown in the "Recommended for You" section.

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import type { JobPost } from '@/hooks/helper';
import { fmtPeriod, fmtTag, getCategoryIcon } from './browseHelpers';
import { CARD_BG, DARK, DIVIDER, GREEN, MUTED, ORANGE, TAG_BORDER } from './browseJobs.theme';

// ─── Warm background tones per card slot (no green) ──────────────────────────
export const REC_TOPS = ['#F5E3C8', '#EDD9C2', '#F0E0CC'] as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14 },
      android: { elevation: 3 },
      default: { boxShadow: '0 4px 16px rgba(139,94,60,0.10)' } as any,
    }),
  },

  // Warm photo-like top area
  top: {
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: GREEN,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  matchText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  newBadge: {
    backgroundColor: '#1A5C40',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  newBadgeText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info area
  body: { padding: 12, gap: 4 },
  title: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 14,
    color: DARK,
    lineHeight: 20,
  },
  familyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  familyName: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    color: MUTED,
    flex: 1,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  locationText: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    color: MUTED,
    flex: 1,
  },
  salary: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: ORANGE,
    marginTop: 3,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 3 },
  tag: {
    borderWidth: 1,
    borderColor: TAG_BORDER,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 10,
    color: MUTED,
  },
  viewBtn: {
    backgroundColor: DARK,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  viewBtnText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  job: JobPost;
  topColor: string;
  onPress: () => void;
  onSave: () => void;
}

export function RecommendedJobCard({ job, topColor, onPress, onSave }: Props) {
  const pct  = Math.round(Number(job.match_score ?? 0));
  const icon = getCategoryIcon(job) as any;

  const tags: string[] = [];
  if (job.employment_type) tags.push(fmtTag(job.employment_type));
  if (job.categories?.[0]) tags.push(job.categories[0]);

  return (
    <View style={s.card}>

      {/* ── Warm top area ── */}
      <View style={[s.top, { backgroundColor: topColor }]}>
        <View style={s.topBadgeRow}>
          {pct > 0 && (
            <View style={s.matchBadge}>
              <Text style={s.matchText}>{pct}% Match</Text>
            </View>
          )}
          {job.is_new && (
            <View style={s.newBadge}>
              <Text style={s.newBadgeText}>New</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.heartBtn} onPress={onSave} hitSlop={8}>
          <Ionicons
            name={job.is_saved ? 'heart' : 'heart-outline'}
            size={17}
            color={job.is_saved ? '#DC2626' : DARK}
          />
        </TouchableOpacity>
        <View style={s.iconCircle}>
          <Ionicons name={icon} size={22} color="#FFFFFF" />
        </View>
      </View>

      {/* ── Info body ── */}
      <View style={s.body}>
        <Text style={s.title} numberOfLines={2}>{job.title}</Text>

        <View style={s.familyRow}>
          <Text style={s.familyName} numberOfLines={1}>
            {job.parent_name ?? 'Employer'}
          </Text>
          {job.parent_verified && (
            <Ionicons name="shield-checkmark" size={13} color={GREEN} />
          )}
        </View>

        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={12} color={MUTED} />
          <Text style={s.locationText} numberOfLines={1}>{job.municipality}</Text>
        </View>

        <Text style={s.salary}>
          ₱{Number(job.salary_offered).toLocaleString()} {fmtPeriod(job.salary_period)}
        </Text>

        {tags.length > 0 && (
          <View style={s.tagsRow}>
            {tags.slice(0, 2).map((tag, i) => (
              <View key={i} style={s.tag}>
                <Text style={s.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={s.viewBtn} onPress={onPress} activeOpacity={0.88}>
          <Text style={s.viewBtnText}>View Job</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
