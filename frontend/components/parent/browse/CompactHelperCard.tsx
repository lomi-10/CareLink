// components/parent/browse/CompactHelperCard.tsx — Mobile 2-col grid card (warm palette)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BROWN, CARAMEL, GOLD, DARK, MUTED, DIVIDER, ICON_BG, SURFACE, GREEN, SUCCESS_BG,
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
  matchReason?: string;
}

export function CompactHelperCard({ helper, onPress, matchScore, matchReason }: CompactHelperCardProps) {
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
          <View style={styles.availDot} />
        )}
        {helper.verification_status === 'Verified' && (
          <View style={styles.pesoBadge}>
            <Ionicons name="shield-checkmark" size={10} color={GREEN} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{helper.first_name}</Text>

        {matchScore != null && matchScore > 0 && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{matchScore}% match</Text>
          </View>
        )}

        {helper.experience_years != null && (
          <View style={styles.metaRow}>
            <Ionicons name="briefcase-outline" size={11} color={MUTED} />
            <Text style={styles.metaText}>{helper.experience_years} yrs</Text>
          </View>
        )}

        {(helper.rating_count ?? 0) > 0 && (
          <View style={styles.metaRow}>
            <Ionicons name="star" size={11} color={GOLD} />
            <Text style={styles.metaText}>{Number(helper.rating_average).toFixed(1)}</Text>
          </View>
        )}

        {helper.categories?.length > 0 && (
          <View style={styles.chipsRow}>
            {helper.categories.slice(0, 1).map((cat, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>{cat}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Why this match */}
        {matchScore != null && matchScore > 0 && matchReason && (
          <View style={styles.reasonRow}>
            <Ionicons name="sparkles-outline" size={11} color={CARAMEL} />
            <Text style={styles.reasonText} numberOfLines={1}>{matchReason}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
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
  availDot: {
    position: 'absolute', bottom: 7, left: 7,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: GREEN, borderWidth: 2, borderColor: SURFACE,
  },
  pesoBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: SUCCESS_BG,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: GREEN,
  },

  info: { padding: 10, gap: 5 },
  name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: DARK },
  matchBadge: {
    backgroundColor: SUCCESS_BG, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start',
  },
  matchText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: GREEN },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: MUTED },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  chip: { backgroundColor: ICON_BG, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: BROWN },

  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reasonText: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: MUTED, flexShrink: 1, fontStyle: 'italic' },
});
