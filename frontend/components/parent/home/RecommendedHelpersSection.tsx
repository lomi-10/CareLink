// components/parent/home/RecommendedHelpersSection.tsx
// "Recommended Helpers for You" horizontal scroll section.
// PHP: parent/recommended_helpers.php (via useParentRecommendations hook)

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { useParentRecommendations, useParentJobs } from '@/hooks/parent';
import { computeHelperJobMatch, pickPrimaryOpenJob } from '@/lib/parentHelperMatch';
import { RecommendedHelperCard } from './RecommendedHelperCard';
import { BROWN, DARK } from './parentWarmTheme';

// ─── Component ────────────────────────────────────────────────────────────────

export function RecommendedHelpersSection() {
  const router = useRouter();
  const { recommendations, loading } = useParentRecommendations();
  const { jobs } = useParentJobs();
  const referenceJob = useMemo(() => pickPrimaryOpenJob(jobs), [jobs]);

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="small" color={BROWN} />
      </View>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <View style={s.section}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Recommended Helpers for You</Text>
        <TouchableOpacity
          style={s.seeAllBtn}
          onPress={() => router.push('/(parent)/browse')}
          activeOpacity={0.7}
        >
          <Text style={s.seeAllText}>See all</Text>
          <Ionicons name="chevron-forward" size={13} color={BROWN} />
        </TouchableOpacity>
      </View>

      {/* Horizontal scroll of cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {recommendations.slice(0, 6).map((helper, idx) => {
          // Same computeHelperJobMatch formula used on Browse Helpers / Work Management,
          // so the percentage matches across screens. Falls back to the backend's
          // hiring-history score only when the parent has no open job to compare against.
          const match = referenceJob ? computeHelperJobMatch(helper, referenceJob) : null;
          const pct = match ? match.score : Math.max(60, Math.round(helper.match_score));
          return (
            <RecommendedHelperCard
              key={helper.user_id}
              helper={helper}
              isTopMatch={idx === 0}
              matchPercentage={pct}
              topReason={match?.reasons?.[0]}
              onPress={() => router.push('/(parent)/browse')}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  section:     { marginBottom: 20 },
  loadingWrap: { height: 60, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 18,
    color: DARK,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: BROWN,
  },

  scroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
});
