import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { ThemeColor } from '@/constants/theme';
import { useParentTheme } from '@/contexts/ParentThemeContext';
import { SectionHeader } from '@/components/helper/home';
import { useAuth } from '@/hooks/shared';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import { ActiveHelperCard } from './ActiveHelperCard';

function createActiveHelpersSectionStyles(c: ThemeColor) {
  return StyleSheet.create({
    wrap: { marginBottom: 8 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: 4,
    },
    seeAll: { fontSize: 14, fontWeight: '700', color: c.parent },
    hint: {
      fontSize: 13,
      color: c.muted,
      lineHeight: 20,
      marginBottom: 14,
      marginTop: -4,
    },
    hintBold: { fontWeight: '700', color: c.ink },
    empty: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.line,
      marginBottom: 8,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: c.ink, marginTop: 10 },
    emptySub: { fontSize: 13, color: c.muted, textAlign: 'center', marginTop: 6 },
    moreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      marginBottom: 8,
    },
    moreBtnText: { fontSize: 14, fontWeight: '700', color: c.parent },
  });
}

type Props = {
  /** When true, cards omit the mini weekly strip (e.g. narrow mobile). */
  compactCards?: boolean;
};

export function ActiveHelpersSection({ compactCards }: Props) {
  const router = useRouter();
  const { color: c } = useParentTheme();
  const styles = useMemo(() => createActiveHelpersSectionStyles(c), [c]);
  const { userData } = useAuth();
  const parentId = userData ? Number(userData.user_id) : 0;
  const { placements, loading, refresh } = useParentActivePlacements();

  if (!parentId) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <SectionHeader title="My active helpers" />
        {placements.length > 0 ? (
          <TouchableOpacity onPress={() => router.push('/(parent)/active_helpers')} hitSlop={8}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.hint}>
        Manage each helper you have hired. You can still post jobs and hire more helpers anytime — use{' '}
        <Text style={styles.hintBold}>My Job Posts</Text> or{' '}
        <Text style={styles.hintBold}>Applications</Text> below.
      </Text>

      {loading ? (
        <ActivityIndicator color={c.parent} style={{ marginVertical: 20 }} />
      ) : placements.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={36} color={c.subtle} />
          <Text style={styles.emptyTitle}>No active helpers yet</Text>
          <Text style={styles.emptySub}>
            When you hire someone, their profile and daily tools will appear here.
          </Text>
        </View>
      ) : (
        placements.slice(0, 3).map((p) => (
          <ActiveHelperCard
            key={p.application_id}
            placement={p}
            parentId={parentId}
            compact={compactCards}
            onPlacementChanged={refresh}
          />
        ))
      )}

      {placements.length > 3 ? (
        <TouchableOpacity style={styles.moreBtn} onPress={() => router.push('/(parent)/active_helpers')}>
          <Text style={styles.moreBtnText}>
            View all {placements.length} active helpers
          </Text>
          <Ionicons name="chevron-forward" size={18} color={c.parent} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
