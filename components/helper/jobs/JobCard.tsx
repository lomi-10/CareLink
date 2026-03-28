// components/helper/jobs/JobCard.tsx
// Full job card for desktop 3-column grid

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

interface JobCardProps {
  job: JobPost;
  onPress: () => void;
  onApply: () => void;
  onToggleSave?: (jobId: string) => void;
}

export function JobCard({ job, onPress, onApply, onToggleSave }: JobCardProps) {
  const getSalaryDisplay = () => {
    if (job.salary_period === 'Daily') {
      return `₱${job.salary_offered.toLocaleString()}/day`;
    }
    return `₱${job.salary_offered.toLocaleString()}/month`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="briefcase" size={40} color="#007AFF" />
        </View>


        <View style={styles.headerRight}>
        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={(e) => {
            e.stopPropagation();
            onToggleSave?.(job.job_post_id); // Add this prop to interface
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={job.is_saved ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={job.is_saved ? "#007AFF" : "#666"} 
          />
        </TouchableOpacity>

        {job.match_score && job.match_score >= 70 && (
          <View style={styles.matchBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.matchText}>{job.match_score}% Match</Text>
          </View>
        )}
      </View>
      </View>

      {/* Job Title */}
      <Text style={styles.title} numberOfLines={2}>
        {job.title}
      </Text>

      {/* Parent Info */}
      <View style={styles.parentInfo}>
        <Text style={styles.parentName}>{job.parent_name}</Text>
        {job.parent_verified && (
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
        )}
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        {job.categories.slice(0, 3).map((category, index) => (
          <View key={index} style={styles.categoryChip}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        ))}
      </View>

      {/* Salary */}
      <View style={styles.salaryContainer}>
        <Text style={styles.salary}>{getSalaryDisplay()}</Text>
        <View style={styles.employmentBadge}>
          <Text style={styles.employmentText}>{job.work_schedule}</Text>
        </View>
      </View>

      {/* Key Info */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Ionicons name="home-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{job.employment_type}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText} numberOfLines={1}>
            {job.municipality}, {job.province}
          </Text>
        </View>
        {job.distance && (
          <View style={styles.infoRow}>
            <Ionicons name="navigate" size={16} color="#007AFF" />
            <Text style={[styles.infoText, { color: '#007AFF' }]}>
              {job.distance.toFixed(1)} km away
            </Text>
          </View>
        )}
      </View>

      {/* Match Reasons */}
      {job.match_reasons && job.match_reasons.length > 0 && (
        <View style={styles.matchReasons}>
          {job.match_reasons.slice(0, 2).map((reason, index) => (
            <View key={index} style={styles.matchReasonItem}>
              <Ionicons name="checkmark" size={14} color="#34C759" />
              <Text style={styles.matchReasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.postedText}>Posted {job.posted_at}</Text>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={(e) => {
            e.stopPropagation();
            onApply();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  matchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34C759',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
    lineHeight: 24,
  },
  parentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  parentName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  categoryChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  salary: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  employmentBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  employmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  infoSection: {
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  matchReasons: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    gap: 6,
    marginBottom: 16,
  },
  matchReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchReasonText: {
    fontSize: 13,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  postedText: {
    fontSize: 13,
    color: '#999',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
