// components/helper/home/RecommendedJobCard.tsx
// Individual job card in the "Recommended for you" horizontal scroll.

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import type { JobPost } from '@/hooks/helper/useBrowseJobs';

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecommendedJobCardProps {
  job:              JobPost;
  isTopMatch?:      boolean;
  matchPercentage?: number;   // 0–100
  isNew?:           boolean;  // posted within the last 3 days
  onPress:          () => void;
  onSave?:          () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_W      = 210;
const DARK_BTN    = '#2A1608';
const ACCENT      = '#E86019';
const ICON_BG     = '#1A5C40';
const LABEL_MUTED = '#7A5C3E';

// ─── Component ────────────────────────────────────────────────────────────────

export function RecommendedJobCard({
  job,
  isTopMatch = false,
  matchPercentage,
  isNew = false,
  onPress,
  onSave,
}: RecommendedJobCardProps) {
  const saved = !!job.is_saved;

  const salaryLabel = (() => {
    const p = job.salary_period === 'monthly' ? '/ month'
            : job.salary_period === 'daily'   ? '/ day'
            : job.salary_period === 'hourly'  ? '/ hour'
            : job.salary_period ?? '';
    return `₱ ${Number(job.salary_offered).toLocaleString()} ${p}`.trim();
  })();

  const tags: string[] = [];
  if (job.employment_type) tags.push(job.employment_type);
  if (job.jobs?.[0])       tags.push(job.jobs[0]);
  else if (job.skills?.[0]) tags.push(job.skills[0]);

  const location = [job.municipality, job.province].filter(Boolean).join(', ');

  return (
    <View style={s.card}>

      {/* ── Top row: badge(s) + heart ── */}
      <View style={s.topRow}>
        <View style={s.badgeGroup}>
          {isTopMatch ? (
            <View style={s.topMatchBadge}>
              <Ionicons name="star" size={10} color="#FFF" />
              <Text style={s.topMatchText}>Top Match</Text>
              {matchPercentage !== undefined && (
                <Text style={s.topMatchPct}> · {matchPercentage}%</Text>
              )}
            </View>
          ) : (
            <View style={s.matchBadgeOutline}>
              {matchPercentage !== undefined && (
                <Text style={s.matchBadgeOutlineText}>{matchPercentage}% Match</Text>
              )}
            </View>
          )}

          {isNew && (
            <View style={s.newBadge}>
              <Text style={s.newBadgeText}>New</Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={() => onSave?.()} hitSlop={8}>
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={18}
            color={saved ? ACCENT : '#B0A090'}
          />
        </TouchableOpacity>
      </View>

      {/* Category icon */}
      <View style={s.iconCircle}>
        <Ionicons name="home" size={20} color="#FFFFFF" />
      </View>

      {/* Info */}
      <Text style={s.title} numberOfLines={2}>{job.title}</Text>
      <Text style={s.employer} numberOfLines={1}>
        {job.category_name ?? job.categories?.[0] ?? 'Household'}
      </Text>
      <Text style={s.location} numberOfLines={1}>{location}</Text>
      <Text style={s.salary}>{salaryLabel}</Text>

      {/* Tags */}
      {tags.length > 0 && (
        <View style={s.tagsRow}>
          {tags.slice(0, 2).map((tag) => (
            <View key={tag} style={s.tag}>
              <Text style={s.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* View Job */}
      <TouchableOpacity style={s.viewBtn} onPress={onPress} activeOpacity={0.88}>
        <Text style={s.viewBtnText}>View Job</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    gap: 6,
    ...Platform.select({
      ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 3 },
      default: { boxShadow: '0 4px 16px rgba(139,94,60,0.10)' } as any,
    }),
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },

  // Top Match badge
  topMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  topMatchText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  topMatchPct: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
  },

  // Plain match-percentage outline badge (non-top-match cards)
  matchBadgeOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C4A882',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  matchBadgeOutlineText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 10,
    color: '#7A5C3E',
  },

  // "New" badge — job posted within the last 3 days (recency, unrelated to match score)
  newBadge: {
    backgroundColor: '#1A5C40',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 10,
    color: '#FFFFFF',
  },

  // Icon
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  title:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#2A1608', lineHeight: 20 },
  employer: { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: LABEL_MUTED },
  location: { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: LABEL_MUTED },
  salary:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#3B1A08', marginTop: 2 },

  tagsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 2 },
  tag: {
    borderWidth: 1,
    borderColor: '#D4B896',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: LABEL_MUTED },

  viewBtn: {
    backgroundColor: DARK_BTN,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  viewBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#FFFFFF' },
});
