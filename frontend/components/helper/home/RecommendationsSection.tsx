// components/helper/home/RecommendationsSection.tsx
// "Recommended for you" horizontal scroll section.
// PHP: helper/recommendations.php (via useRecommendations hook)

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { useRecommendations } from '@/hooks/helper';
import { RecommendedJobCard } from './RecommendedJobCard';

// ─── Component ────────────────────────────────────────────────────────────────

export function RecommendationsSection() {
  const router = useRouter();
  const { recommendations, loading, toggleSaveJob } = useRecommendations();

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="small" color="#E86019" />
      </View>
    );
  }

  if (recommendations.length === 0) {
    return (
      <View style={s.section}>
        <View style={s.header}>
          <Text style={s.title}>Recommended for you</Text>
        </View>
        <View style={s.emptyWrap}>
          <Text style={s.emptyText}>
            No strong matches yet. Try adding more skills or job roles to your profile, or broaden your salary range.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.section}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Recommended for you</Text>
        <TouchableOpacity
          style={s.seeAllBtn}
          onPress={() => router.push('/(helper)/browse')}
          activeOpacity={0.7}
        >
          <Text style={s.seeAllText}>See all</Text>
          <Ionicons name="chevron-forward" size={13} color="#E86019" />
        </TouchableOpacity>
      </View>

      {/* Horizontal scroll of cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {recommendations.slice(0, 6).map((job, idx) => (
          <RecommendedJobCard
            key={job.job_post_id}
            job={job}
            isTopMatch={idx === 0}
            matchPercentage={Math.round(Number(job.match_score ?? 0))}
            isNew={!!job.is_new}
            onPress={() => router.push('/(helper)/browse')}
            onSave={() => toggleSaveJob(job.job_post_id)}
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
    color: '#2A1608',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: '#E86019',
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
    color: '#7A5C3E',
    lineHeight: 18,
  },
});
