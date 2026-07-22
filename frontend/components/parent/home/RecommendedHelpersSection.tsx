// components/parent/home/RecommendedHelpersSection.tsx
// "Recommended Helpers for You" horizontal scroll section.
// PHP: parent/recommended_helpers.php (via useParentRecommendations hook)

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { useParentRecommendations, useParentJobs } from '@/hooks/parent';
import { computeHelperJobMatch, pickPrimaryOpenJob, bestJobForHelper } from '@/lib/parentHelperMatch';
import { RecommendedHelperCard } from './RecommendedHelperCard';
import { BROWN, DARK } from './parentWarmTheme';

// ─── Component ────────────────────────────────────────────────────────────────

export function RecommendedHelpersSection() {
  const router = useRouter();
  const { recommendations, loading } = useParentRecommendations();
  const { jobs } = useParentJobs();
  const referenceJob = useMemo(() => pickPrimaryOpenJob(jobs), [jobs]);

  // Rank by the SAME score we display (client matcher), so the Top Match badge
  // always sits on the genuinely highest-scoring helper — not the backend's
  // history-based order. Keeps dashboard and Browse in the same order too.
  const ranked = useMemo(
    () => recommendations
      .map((helper) => ({ helper, match: computeHelperJobMatch(helper, bestJobForHelper(helper, jobs)) }))
      .sort((a, b) => b.match.score - a.match.score),
    [recommendations, jobs],
  );

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="small" color={BROWN} />
      </View>
    );
  }

  const sectionTitle = referenceJob ? 'Best Match for Your Job' : 'Top Helpers in Ormoc';

  if (recommendations.length === 0) {
    return (
      <View style={s.section}>
        <View style={s.header}>
          <Text style={s.title}>{sectionTitle}</Text>
        </View>
        <View style={s.emptyWrap}>
          <Text style={s.emptyText}>
            No strong matches found yet. Try posting a job or broadening your required skills and salary range.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.section}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>{sectionTitle}</Text>
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
        {ranked.slice(0, 6).map(({ helper, match }, idx) => (
          <RecommendedHelperCard
            key={helper.user_id}
            helper={helper}
            isTopMatch={idx === 0}
            matchPercentage={match.score}
            topReason={match?.reasons?.[0]}
            matchReasons={match.reasons}
            onPress={() => router.push('/(parent)/browse')}
          />
        ))}
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

  emptyWrap: {
    paddingHorizontal: 16,
  },
  emptyText: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 13,
    color: BROWN,
    lineHeight: 18,
  },
});
