// components/parent/browse/CompactHelperCard.tsx — Mobile 2-col grid card (warm palette)
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';
import MatchBreakdownModal from '@/components/shared/MatchBreakdownModal';
import {
  BROWN, CARAMEL, GOLD, DARK, DIVIDER, ICON_BG, SURFACE, GREEN, SUCCESS_BG, WARNING_BG,
} from '@/components/parent/home/parentWarmTheme';
import type { HelperProfile } from '@/hooks/parent';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8 },
  android: { elevation: 2 },
  default: { boxShadow: '0 3px 10px rgba(139,90,43,0.07)' } as any,
});

interface CompactHelperCardProps {
  helper: HelperProfile;
  onPress: () => void;
  matchScore?: number;
  matchReasons?: string[];
}

export function CompactHelperCard({ helper, onPress, matchScore, matchReasons }: CompactHelperCardProps) {
  const [showMatch, setShowMatch] = useState(false);
  const location = [helper.municipality, helper.province].filter(Boolean).join(', ');
  const roles = helper.jobs?.filter(Boolean) ?? [];
  const specialties = roles.length > 0 ? roles : helper.categories ?? [];
  const nearby = helper.distance != null && helper.distance <= 20;
  const distanceText = helper.distance == null
    ? null
    : helper.distance < 1
      ? `${Math.round(helper.distance * 1000)} m away`
      : `${helper.distance.toFixed(1)} km away`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Photo */}
      <View style={styles.imageWrap}>
        {helper.profile_image ? (
          <Image source={{ uri: helper.profile_image }} style={styles.image} />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="person" size={30} color={CARAMEL} />
          </View>
        )}
        {helper.availability_status === 'Available' && (
          <View style={styles.availBadge} accessibilityLabel="Available for work">
            <View style={styles.availDot} />
            <Text style={styles.availText}>AVAILABLE</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{helper.first_name}</Text>

        {matchScore != null && matchScore > 0 && (
          <TouchableOpacity
            style={styles.matchBadge}
            onPress={() => setShowMatch(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.matchText}>{matchScore}% MATCH</Text>
            <Text style={styles.matchHint}>WHY?</Text>
          </TouchableOpacity>
        )}

        {(distanceText || location) && (
          <View style={[styles.locationRow, { borderLeftColor: nearby ? GREEN : CARAMEL }]}>
            {distanceText ? (
              <View style={[styles.locationMark, { backgroundColor: nearby ? SUCCESS_BG : WARNING_BG }]}>
                <Ionicons name="location" size={13} color={nearby ? GREEN : '#92400E'} />
              </View>
            ) : null}
            <View style={styles.locationInfo}>
              {distanceText ? (
                <Text style={[styles.distanceText, { color: nearby ? GREEN : '#92400E' }]}>{distanceText}</Text>
              ) : null}
              {location ? <Text style={styles.locationText} numberOfLines={1}>{location}</Text> : null}
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="briefcase-outline" size={12} color={BROWN} />
            <Text style={styles.statText}>
              {helper.experience_years
                ? `${helper.experience_years} yr${helper.experience_years === 1 ? '' : 's'} experience`
                : 'Experience not listed'}
            </Text>
          </View>
          {(helper.rating_count ?? 0) > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="star" size={11} color={GOLD} />
              <Text style={styles.statText}>{Number(helper.rating_average).toFixed(1)}</Text>
            </View>
          )}
        </View>

        {specialties.length > 0 && (
          <View style={styles.roleRow}>
            <View style={styles.roleMark} />
            {specialties.slice(0, 1).map((role) => (
              <Text key={role} style={styles.roleText} numberOfLines={1}>{role}</Text>
            ))}
            {specialties.length > 1 && <Text style={styles.moreRoles}>+{specialties.length - 1}</Text>}
          </View>
        )}
      </View>

      <MatchBreakdownModal
        visible={showMatch}
        onClose={() => setShowMatch(false)}
        score={matchScore ?? 0}
        reasons={matchReasons ?? []}
        jobTitle={helper.first_name}
        themeKey="parent"
        subjectLabel="helper"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 4,
    ...CARD_SHADOW,
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 120 },
  imageFallback: {
    width: '100%', height: 120,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  availBadge: {
    position: 'absolute', bottom: 7, left: 7,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: SURFACE, borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 4,
  },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  availText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, color: GREEN, letterSpacing: 0.4 },

  info: { padding: 10, gap: 5 },
  name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: DARK },
  matchBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F1F8F3',
    borderLeftWidth: 3, borderLeftColor: GREEN,
    paddingHorizontal: 7, paddingVertical: 4,
  },
  matchText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: DARK, letterSpacing: 0.3 },
  matchHint: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 8, color: GREEN, letterSpacing: 0.5 },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#FFF8EF', borderLeftWidth: 3,
    paddingHorizontal: 7, paddingVertical: 6,
  },
  locationMark: { width: 25, height: 25, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  locationInfo: { flex: 1, minWidth: 0 },
  distanceText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5 },
  locationText: { fontFamily: FontFamily.fredokaRegular, fontSize: 9.5, color: DARK },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: DARK },

  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0, paddingTop: 2 },
  roleMark: { width: 3, height: 15, backgroundColor: CARAMEL },
  roleText: { flex: 1, minWidth: 0, fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: DARK },
  moreRoles: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9.5, color: BROWN },
});
