// components/parent/home/RecommendedHelperCard.tsx
// Individual helper card in the parent dashboard's "Recommended Helpers" horizontal scroll.
// Big top photo + floating favorite heart, PESO Verified label, blue "View Profile" CTA
// (per reference mockup — the caramel/brown card chrome pairs with blue action buttons).

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import type { RecommendedHelper } from '@/hooks/parent';
import MatchBreakdownModal from '@/components/shared/MatchBreakdownModal';
import { BROWN, CARAMEL, GOLD, CARD_BG, DARK, MUTED, DIVIDER, ICON_BG, SUCCESS_BG, GREEN } from './parentWarmTheme';

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecommendedHelperCardProps {
  helper:           RecommendedHelper;
  isTopMatch?:      boolean;
  matchPercentage?: number;   // 0–100
  topReason?:       string;   // short "why this match" caption
  matchReasons?:    string[]; // full list for the breakdown modal
  onPress:          () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_W  = 220;
const PHOTO_H = 130;
const BLUE    = '#2563EB';

// ─── Component ────────────────────────────────────────────────────────────────

export function RecommendedHelperCard({
  helper,
  isTopMatch = false,
  matchPercentage,
  topReason,
  matchReasons,
  onPress,
}: RecommendedHelperCardProps) {
  const [saved, setSaved] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const initials = `${helper.first_name?.[0] ?? ''}${helper.last_name?.[0] ?? ''}`.toUpperCase();
  const location = [helper.municipality, helper.province].filter(Boolean).join(', ');

  const tags: string[] = [];
  if (helper.categories?.[0])  tags.push(helper.categories[0]);
  if (helper.employment_type)  tags.push(helper.employment_type);

  const salaryLabel = helper.expected_salary
    ? `₱ ${Number(helper.expected_salary).toLocaleString()} / ${(helper.salary_period ?? 'Monthly').toLowerCase()}`
    : null;

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.92} onPress={() => setShowMatch(true)}>

      {/* ── Big top photo + favorite heart + match badge ── */}
      <View style={s.photoWrap}>
        {helper.profile_image ? (
          <Image source={{ uri: helper.profile_image }} style={s.photo} contentFit="cover" />
        ) : (
          <View style={s.photoFallback}>
            <Text style={s.photoInitials}>{initials || '?'}</Text>
          </View>
        )}

        <TouchableOpacity
          style={s.favoriteBtn}
          onPress={() => setSaved((v) => !v)}
          activeOpacity={0.85}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={16} color={saved ? '#F43F5E' : BROWN} />
        </TouchableOpacity>

        {isTopMatch ? (
          <View style={s.topMatchBadge}>
            <Ionicons name="star" size={10} color="#FFF" />
            <Text style={s.topMatchText}>Top Match</Text>
            {matchPercentage !== undefined && (
              <Text style={s.topMatchPct}> · {matchPercentage}%</Text>
            )}
          </View>
        ) : (
          <View style={s.matchBadge}>
            <Text style={s.matchBadgeText}>Good Match</Text>
            {matchPercentage !== undefined && (
              <Text style={s.matchBadgePct}> · {matchPercentage}%</Text>
            )}
          </View>
        )}
      </View>

      <View style={s.body}>
        {/* Name + rating */}
        <Text style={s.name} numberOfLines={1}>{helper.full_name}</Text>
        {helper.rating_count > 0 ? (
          <View style={s.ratingRow}>
            <Ionicons name="star" size={12} color={GOLD} />
            <Text style={s.ratingText}>
              {helper.rating_average.toFixed(1)} ({helper.rating_count})
            </Text>
          </View>
        ) : (
          <Text style={s.newText}>New helper</Text>
        )}

        {helper.is_verified && (
          <View style={s.verifiedPill}>
            <Ionicons name="shield-checkmark" size={11} color={GREEN} />
            <Text style={s.verifiedPillText}>PESO Verified</Text>
          </View>
        )}

        {location ? (
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={13} color={MUTED} />
            <Text style={s.metaText} numberOfLines={1}>
              {location}
              {helper.distance != null ? ` · ~${helper.distance} km` : ''}
            </Text>
          </View>
        ) : null}

        {helper.experience_years > 0 && (
          <View style={s.metaRow}>
            <Ionicons name="briefcase-outline" size={13} color={MUTED} />
            <Text style={s.metaText}>
              {helper.experience_years} yr{helper.experience_years !== 1 ? 's' : ''} experience
            </Text>
          </View>
        )}

        {salaryLabel && <Text style={s.salary}>{salaryLabel}</Text>}

        {/* Tags */}
        {tags.length > 0 && (
          <View style={s.tagsRow}>
            {tags.slice(0, 2).map((tag) => (
              <View key={tag} style={s.tag}>
                <Text style={s.tagText} numberOfLines={1}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Why this match */}
        {topReason ? (
          <View style={s.metaRow}>
            <Ionicons name="sparkles-outline" size={12} color={CARAMEL} />
            <Text style={s.reasonText} numberOfLines={1}>{topReason}</Text>
          </View>
        ) : null}
      </View>

      {/* View Profile — blue CTA pairs with the caramel card chrome */}
      <TouchableOpacity style={s.viewBtn} onPress={onPress} activeOpacity={0.88}>
        <Text style={s.viewBtnText}>View Profile</Text>
      </TouchableOpacity>

      <MatchBreakdownModal
        visible={showMatch}
        onClose={() => setShowMatch(false)}
        score={matchPercentage ?? 0}
        reasons={matchReasons}
        jobTitle={helper.full_name}
        themeKey="parent"
        subjectLabel="helper"
      />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    width: CARD_W,
    minHeight: 320,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DIVIDER,
    ...Platform.select({
      ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 2 },
      default: { boxShadow: '0 4px 16px rgba(139,90,43,0.10)' } as any,
    }),
  },

  // ── Photo header ──
  photoWrap: { width: '100%', height: PHOTO_H, position: 'relative', backgroundColor: ICON_BG },
  photo: { width: '100%', height: PHOTO_H },
  photoFallback: { width: '100%', height: PHOTO_H, alignItems: 'center', justifyContent: 'center' },
  photoInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 34, color: BROWN },

  favoriteBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Top Match badge
  topMatchBadge: {
    position: 'absolute', left: 10, bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BROWN,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  topMatchText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: '#FFFFFF' },
  topMatchPct:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: 'rgba(255,255,255,0.85)' },

  // Good Match badge
  matchBadge: {
    position: 'absolute', left: 10, bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: CARAMEL,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  matchBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: BROWN },
  matchBadgePct:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 10, color: MUTED },

  body: { flex: 1, padding: 14, paddingTop: 12, gap: 5 },

  name:       { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },
  newText:    { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },

  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: SUCCESS_BG,
    borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
    marginTop: 1,
  },
  verifiedPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: GREEN },

  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: MUTED, flexShrink: 1 },
  salary:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, marginTop: 2 },
  reasonText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, flexShrink: 1, fontStyle: 'italic' },

  tagsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 1 },
  tag: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 110,
  },
  tagText: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED },

  viewBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
    marginTop: 4,
  },
  viewBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#FFFFFF' },
});
