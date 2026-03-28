import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRecommendations } from '@/hooks/useRecommendations';
import { CompactJobCard } from '@/components/helper/jobs';
import { Ionicons } from '@expo/vector-icons';

export function RecommendationsSection() {
  const router = useRouter();
  const { recommendations, loading } = useRecommendations();

  if (loading || recommendations.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recommended for You</Text>
          <Text style={styles.subtitle}>Based on your profile and preferences</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(helper)/browse_jobs')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recommendations.slice(0, 3).map((job) => (
          <View key={job.job_post_id} style={styles.card}>
            <CompactJobCard
              job={job}
              onPress={() => {
                // Navigate to job details
              }}
            />
            {job.match_reasons && (
              <View style={styles.reasonsContainer}>
                <Text style={styles.reasonsTitle}>Why we recommend:</Text>
                {job.match_reasons.slice(0, 2).map((reason, idx) => (
                  <View key={idx} style={styles.reasonRow}>
                    <Ionicons name="checkmark" size={14} color="#34C759" />
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  scrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  card: {
    width: 280,
  },
  reasonsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  reasonsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 6,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  reasonText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
});