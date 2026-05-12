import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { fetchPendingReviews, type PendingReview } from '@/lib/reviewsApi';

type Props = {
  userType: 'parent' | 'helper';
  accentColor: string;
  softBg?: string;
  refreshToken?: number;
  onReviewPress: (item: PendingReview) => void;
};

export function PendingPlacementReviewsBanner({
  userType,
  accentColor,
  softBg,
  refreshToken = 0,
  onReviewPress,
}: Props) {
  const [pending, setPending] = useState<PendingReview[]>([]);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) {
        setPending([]);
        return;
      }
      const u = JSON.parse(raw) as { user_id?: string };
      const uid = Number(u.user_id);
      if (!uid) {
        setPending([]);
        return;
      }
      const res = await fetchPendingReviews(uid, userType);
      if (res.success && res.pending?.length) setPending(res.pending);
      else setPending([]);
    } catch {
      setPending([]);
    }
  }, [userType]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  if (pending.length === 0) return null;

  const first = pending[0];
  const more = pending.length > 1 ? ` · +${pending.length - 1} more` : '';
  const bg = softBg ?? accentColor + '18';

  return (
    <TouchableOpacity
      style={[styles.wrap, { backgroundColor: bg, borderColor: accentColor + '44' }]}
      onPress={() => onReviewPress(first)}
      activeOpacity={0.88}
    >
      <View style={[styles.iconCircle, { backgroundColor: accentColor + '22' }]}>
        <Ionicons name="star" size={22} color={accentColor} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>Rate your experience</Text>
        <Text style={styles.sub} numberOfLines={2}>
          {first.counterparty_name}
          {first.job_title ? ` · ${first.job_title}` : ''}
          {more}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={accentColor} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: { flex: 1, minWidth: 0 },
  chevron: { marginLeft: 8 },
  title: { fontSize: 15, fontWeight: '800', color: theme.color.ink, marginBottom: 2 },
  sub: { fontSize: 13, color: theme.color.muted, lineHeight: 18 },
});
