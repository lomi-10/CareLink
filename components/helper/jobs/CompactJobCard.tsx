// components/helper/jobs/CompactJobCard.tsx
// Compact job card for mobile 2-column grid

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JobPost } from '@/hooks/useBrowseJobs';

interface CompactJobCardProps {
  job: JobPost;
  onPress: () => void;
}

export default function CompactJobCard({ job, onPress }: CompactJobCardProps) {
  const getSalaryDisplay = () => {
    if (job.salary_period === 'Daily') {
      return `₱${job.salary_offered.toLocaleString()}/day`;
    }
    return `₱${job.salary_offered.toLocaleString()}/mo`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Match Score Badge */}
      {job.match_score && job.match_score >= 70 && (
        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>{job.match_score}% Match</Text>
        </View>
      )}

      {/* Job Icon */}
      <View style={styles.iconContainer}>
        <Ionicons name="briefcase" size={32} color="#007AFF" />
      </View>

      {/* Job Title */}
      <Text style={styles.title} numberOfLines={2}>
        {job.title}
      </Text>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        {job.categories.slice(0, 2).map((category, index) => (
          <View key={index} style={styles.categoryChip}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {category}
            </Text>
          </View>
        ))}
      </View>

      {/* Salary */}
      <Text style={styles.salary}>{getSalaryDisplay()}</Text>

      {/* Employment Type */}
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={14} color="#666" />
        <Text style={styles.infoText}>{job.work_schedule}</Text>
      </View>

      {/* Location */}
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={14} color="#666" />
        <Text style={styles.infoText} numberOfLines={1}>
          {job.municipality}
        </Text>
      </View>

      {/* Distance */}
      {job.distance && (
        <View style={styles.distanceContainer}>
          <Ionicons name="navigate" size={12} color="#007AFF" />
          <Text style={styles.distanceText}>{job.distance.toFixed(1)} km</Text>
        </View>
      )}

      {/* Posted Time */}
      <Text style={styles.postedText}>{job.posted_at}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  matchBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
    lineHeight: 18,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '100%',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  salary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  postedText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
});
