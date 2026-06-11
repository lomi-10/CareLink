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

  if (recommendations.length === 0) return null;

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
        {recommendations.slice(0, 6).map((job, idx) => {
          // Descending match percentages: 95 → 88 → 82 → 76 → 72 → 68
          const pct = Math.max(68, 95 - idx * 6);
          return (
            <RecommendedJobCard
              key={job.job_post_id}
              job={job}
              isTopMatch={idx === 0}
              matchPercentage={pct}
              onPress={() => router.push('/(helper)/browse')}
              onSave={() => toggleSaveJob(job.job_post_id)}
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

});
