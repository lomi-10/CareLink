// components/parent/browse/HelperCard.tsx — Desktop 3-col grid card (warm palette)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, CARAMEL, GOLD, DARK, MUTED, DIVIDER, ICON_BG, SURFACE, GREEN, SUCCESS_BG,
} from '@/components/parent/home/parentWarmTheme';
import type { HelperProfile } from '@/hooks/parent';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 2 },
  default: { boxShadow: '0 4px 14px rgba(139,90,43,0.08)' } as any,
});

interface HelperCardProps {
  helper: HelperProfile;
  onPress: () => void;
  onInvite?: () => void;
  matchScore?: number;
  matchReasons?: string[];
}

export function HelperCard({ helper, onPress, onInvite, matchScore, matchReasons }: HelperCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Photo */}
      <View style={styles.imageWrap}>
        {helper.profile_image ? (
          <Image source={{ uri: helper.profile_image }} style={styles.image} />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="person" size={38} color={CARAMEL} />
          </View>
        )}

        {/* Availability dot */}
        {helper.availability_status === 'Available' && (
          <View style={styles.availDot} />
        )}

        {/* PESO badge */}
        {helper.verification_status === 'Verified' && (
          <View style={styles.pesoBadge}>
            <Ionicons name="shield-checkmark" size={11} color={GREEN} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{helper.full_name}</Text>
          {matchScore != null && matchScore > 0 && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>{matchScore}%</Text>
            </View>
          )}
        </View>

        {/* Exp + distance */}
        <View style={styles.metaRow}>
          {helper.experience_years != null && (
            <View style={styles.metaItem}>
              <Ionicons name="briefcase-outline" size={12} color={MUTED} />
              <Text style={styles.metaText}>{helper.experience_years} yrs exp</Text>
            </View>
          )}
          {helper.distance != null && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={MUTED} />
              <Text style={styles.metaText}>
                {helper.distance < 1
                  ? `${(helper.distance * 1000).toFixed(0)}m`
                  : `${helper.distance.toFixed(1)} km`} away
              </Text>
            </View>
          )}
        </View>

        {/* Rating */}
        {(helper.rating_count ?? 0) > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={GOLD} />
            <Text style={styles.ratingText}>
              {Number(helper.rating_average).toFixed(1)}
              <Text style={styles.ratingCount}> ({helper.rating_count})</Text>
            </Text>
          </View>
        )}

        {/* Category chips */}
        {helper.categories?.length > 0 && (
          <View style={styles.chipsRow}>
            {helper.categories.slice(0, 2).map((cat, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{cat}</Text>
              </View>
            ))}
            {helper.categories.length > 2 && (
              <Text style={styles.moreChips}>+{helper.categories.length - 2}</Text>
            )}
          </View>
        )}

        {/* Why this match */}
        {matchScore != null && matchScore > 0 && matchReasons?.[0] && (
          <View style={styles.reasonRow}>
            <Ionicons name="sparkles-outline" size={12} color={CARAMEL} />
            <Text style={styles.reasonText} numberOfLines={1}>{matchReasons[0]}</Text>
          </View>
        )}

        {/* Availability text */}
        {helper.availability_status === 'Available' && (
          <Text style={styles.availText}>Available: Immediately</Text>
        )}

        {/* Invite button */}
        {onInvite && (
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={(e) => { e.stopPropagation(); onInvite(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="paper-plane-outline" size={14} color={BROWN} />
            <Text style={styles.inviteBtnText}>Invite to Apply</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 4,
    ...CARD_SHADOW,
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 160 },
  imageFallback: {
    width: '100%', height: 160,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  availDot: {
    position: 'absolute', bottom: 10, left: 10,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: GREEN,
    borderWidth: 2, borderColor: SURFACE,
  },
  pesoBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: SUCCESS_BG,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: GREEN,
  },

  info: { padding: 14, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: DARK, flex: 1 },
  matchBadge: {
    backgroundColor: SUCCESS_BG,
    borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  matchText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: GREEN },

  metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  ratingCount: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: ICON_BG, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: BROWN },
  moreChips: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, alignSelf: 'center' },

  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reasonText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, flexShrink: 1, fontStyle: 'italic' },

  availText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: GREEN },

  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 4,
    borderWidth: 1.5, borderColor: CARAMEL,
    borderRadius: 10, paddingVertical: 9,
  },
  inviteBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: BROWN },
});
