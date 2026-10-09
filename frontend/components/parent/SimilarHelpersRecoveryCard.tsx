// components/parent/SimilarHelpersRecoveryCard.tsx
// Shown when a shortlisted/interviewed helper is hired by another employer.
// Surfaces up to 3 similar verified helpers so the parent is not left stranded.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import API_URL from '@/constants/api';
import { NotificationCard } from '@/components/shared/NotificationCard';
import type { RecommendedHelper } from '@/hooks/parent/useParentRecommendations';

type Props = {
  /** Prefer matches for the job the closed application belonged to. */
  jobPostId?: number | null;
  excludeHelperId?: number | null;
  accentColor?: string;
};

export function SimilarHelpersRecoveryCard({
  jobPostId,
  excludeHelperId,
  accentColor = theme.color.parent,
}: Props) {
  const router = useRouter();
  const [helpers, setHelpers] = useState<RecommendedHelper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const raw = await AsyncStorage.getItem('user_data');
        if (!raw) throw new Error('Not logged in');
        const user = JSON.parse(raw) as { user_id?: number | string };
        const uid = Number(user.user_id);
        if (!uid) throw new Error('Could not identify the signed-in employer.');

        const params = new URLSearchParams({
          parent_id: String(uid),
          requester_id: String(uid),
          limit: '6',
        });
        if (jobPostId) params.set('job_post_id', String(jobPostId));

        const res = await fetch(`${API_URL}/parent/recommended_helpers.php?${params}`);
        const data = await res.json();
        if (cancelled) return;
        if (!data.success) {
          throw new Error(data.message || 'Could not load similar helpers.');
        }

        const list = (data.recommendations ?? []) as RecommendedHelper[];
        setHelpers(
          list.filter(
            (h) => h.is_verified && Number(h.user_id) !== Number(excludeHelperId ?? 0),
          ),
        );
      } catch (err) {
        console.error('[SimilarHelpersRecoveryCard]', err);
        if (!cancelled) {
          setHelpers([]);
          setError(err instanceof Error ? err.message : 'Could not load similar helpers.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [jobPostId, excludeHelperId]);

  const top3 = useMemo(() => helpers.slice(0, 3), [helpers]);
  const count = top3.length;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={accentColor} />
      </View>
    );
  }

  if (error) {
    return (
      <NotificationCard
        tone="warning"
        title="Similar helpers are temporarily unavailable"
        message={error}
        action={{
          label: 'Browse helpers',
          onPress: () => router.push('/(parent)/browse'),
        }}
        style={styles.cardFlush}
      />
    );
  }

  if (count === 0) {
    return (
      <NotificationCard
        tone="info"
        icon="people-outline"
        title="Continue hiring"
        message="Browse other verified helpers available in your area to keep your search moving."
        action={{
          label: 'Browse helpers',
          onPress: () => router.push('/(parent)/browse'),
        }}
        style={styles.cardFlush}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <NotificationCard
        tone="info"
        icon="sparkles"
        title={`View ${count} Similar Verified Helper${count === 1 ? '' : 's'} Available in Your Area`}
        message="Based on your job post criteria — continue hiring without starting over."
        action={{
          label: 'See all matches',
          onPress: () => router.push('/(parent)/browse'),
        }}
        style={styles.cardFlush}
      />

      <View style={styles.row}>
        {top3.map((h) => (
          <TouchableOpacity
            key={h.user_id}
            style={styles.miniCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(parent)/browse')}
          >
            {h.profile_image ? (
              <Image source={{ uri: h.profile_image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.initials}>
                  {(h.first_name?.[0] ?? 'H').toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.name} numberOfLines={1}>
              {h.first_name}
            </Text>
            {h.is_verified ? (
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark" size={11} color={theme.color.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : (
              <Text style={styles.meta} numberOfLines={1}>
                {h.municipality || h.province || 'Nearby'}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  cardFlush: { marginBottom: 10 },
  loadingWrap: { paddingVertical: 16, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  miniCard: {
    flex: 1,
    backgroundColor: theme.color.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.color.line,
    padding: 10,
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
  },
  avatarFallback: {
    backgroundColor: theme.color.parentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '800',
    color: theme.color.parent,
    fontSize: 16,
  },
  name: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.color.ink,
    textAlign: 'center',
    width: '100%',
  },
  meta: {
    fontSize: 11,
    color: theme.color.muted,
    marginTop: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.color.success,
  },
});
