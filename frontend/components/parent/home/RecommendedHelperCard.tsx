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
import { BROWN, CARAMEL, GOLD, DARK, MUTED, DIVIDER, ICON_BG, SUCCESS_BG, GREEN } from './parentWarmTheme';

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecommendedHelperCardProps {
  helper:           RecommendedHelper;
  isTopMatch?:      boolean;
  matchPercentage?: number;   // 0–100
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
  matchReasons,
  onPress,
}: RecommendedHelperCardProps) {
  const [saved, setSaved] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const initials = `${helper.first_name?.[0] ?? ''}${helper.last_name?.[0] ?? ''}`.toUpperCase();
  const location = [helper.municipality, helper.province].filter(Boolean).join(', ');
  const roles = helper.jobs?.filter(Boolean) ?? [];
  const specialties = roles.length > 0 ? roles : helper.categories ?? [];
  const distanceText = helper.distance == null
    ? null
    : `${helper.distance_exact ? '' : '~'}${helper.distance < 1
      ? `${Math.round(helper.distance * 1000)} m`
      : `${helper.distance.toFixed(1)} km`}`;
  const nearby = helper.distance != null && helper.distance <= 20;

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
        <Text style={s.name} numberOfLines={1}>{helper.full_name}</Text>
        {helper.rating_count === 0 && <Text style={s.newText}>NEW TO CARELINK</Text>}

        <View style={s.rolesBlock}>
          <Text style={s.rolesLabel}>ROLES AND SPECIALTIES</Text>
          {specialties.length > 0 ? (
            <View style={s.rolesList}>
              {specialties.slice(0, 2).map((role) => (
                <View key={role} style={s.roleRow}>
                  <View style={s.roleMark} />
                  <Text style={s.roleText} numberOfLines={1}>{role}</Text>
                </View>
              ))}
              {specialties.length > 2 && (
                <Text style={s.moreRoles}>+{specialties.length - 2} more roles</Text>
              )}
            </View>
          ) : (
            <Text style={s.noRoles}>Not listed</Text>
          )}
        </View>

        {(distanceText || location) && (
          <View style={[s.locationCard, { borderLeftColor: nearby ? GREEN : '#C88B4A' }]}>
            <View style={[s.locationIcon, { backgroundColor: nearby ? SUCCESS_BG : '#F6E5CB' }]}>
              <Ionicons name="location" size={15} color={nearby ? GREEN : BROWN} />
            </View>
            <View style={s.locationInfo}>
              {distanceText ? (
                <Text style={[s.distanceText, { color: nearby ? GREEN : '#92400E' }]}>{distanceText} away</Text>
              ) : null}
              {location ? <Text style={s.locationText} numberOfLines={1}>{location}</Text> : null}
            </View>
          </View>
        )}

        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Ionicons name="briefcase-outline" size={14} color={BROWN} />
            <Text style={s.statValue}>
              {helper.experience_years > 0
                ? `${helper.experience_years} yr${helper.experience_years !== 1 ? 's' : ''}`
                : 'New'}
            </Text>
            <Text style={s.statLabel}>experience</Text>
          </View>
          {helper.rating_count > 0 && (
            <>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Ionicons name="star" size={13} color={GOLD} />
                <Text style={s.statValue}>{helper.rating_average.toFixed(1)}</Text>
                <Text style={s.statLabel}>({helper.rating_count})</Text>
              </View>
            </>
          )}
        </View>
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
    minHeight: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
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
    width: 30, height: 30, borderRadius: 8,
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
    borderRadius: 6,
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
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  matchBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: BROWN },
  matchBadgePct:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 10, color: MUTED },

  body: { flex: 1, padding: 14, paddingTop: 12, gap: 9 },

  name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  newText: { marginTop: -7, fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, color: MUTED, letterSpacing: 0.7 },

  rolesBlock: { gap: 5, paddingTop: 3 },
  rolesLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, color: BROWN, letterSpacing: 0.8 },
  noRoles: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },
  rolesList: { gap: 3 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  roleMark: { width: 4, height: 14, borderRadius: 1, backgroundColor: CARAMEL },
  roleText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: DARK },
  moreRoles: { marginLeft: 11, fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED },

  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8EF', borderLeftWidth: 3,
    paddingHorizontal: 9, paddingVertical: 8,
  },
  locationIcon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  locationInfo: { flex: 1, minWidth: 0, gap: 1 },
  distanceText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DARK },
  locationText: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: MUTED },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 3 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: DARK },
  statLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: MUTED },
  statDivider: { width: 1, height: 14, backgroundColor: DIVIDER },

  viewBtn: {
    backgroundColor: BLUE,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
    marginTop: 4,
  },
  viewBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#FFFFFF' },
});
