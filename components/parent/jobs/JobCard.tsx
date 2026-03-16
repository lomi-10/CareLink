// components/parent/jobs/JobCard.tsx
// Individual job card for My Posted Jobs screen

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JobStatusBadge } from './JobStatusBadge';
import type { JobPost } from '@/hooks/useParentJobs';

interface JobCardProps {
  job: JobPost;
  onViewApplications: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: string) => void;
}

export function JobCard({
  job,
  onViewApplications,
  onEdit,
  onDelete,
  onUpdateStatus,
}: JobCardProps) {
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {job.title}
          </Text>
          <JobStatusBadge status={job.status} />
        </View>

        {job.category_name && (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{job.category_name}</Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={14} color="#666" />
          <Text style={styles.detailText}>
            ₱{job.salary_offered.toLocaleString()}/{job.salary_period}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.detailText}>
            {job.employment_type} • {job.work_schedule}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.detailText}>
            {job.municipality}, {job.province}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color="#666" />
          <Text style={styles.detailText}>Posted {getTimeAgo(job.posted_at)}</Text>
        </View>
      </View>

      {/* Applications Count */}
      {job.status === 'Open' && job.application_count > 0 && (
        <TouchableOpacity
          style={styles.applicationsBar}
          onPress={onViewApplications}
          activeOpacity={0.7}
        >
          <View style={styles.applicationsLeft}>
            <Ionicons name="people" size={18} color="#007AFF" />
            <Text style={styles.applicationsText}>
              {job.application_count}{' '}
              {job.application_count === 1 ? 'application' : 'applications'}
            </Text>
            {job.new_application_count > 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>
                  {job.new_application_count} new
                </Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#007AFF" />
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {job.status === 'Open' && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onViewApplications}
              activeOpacity={0.7}
            >
              <Ionicons name="people-outline" size={16} color="#007AFF" />
              <Text style={styles.actionButtonText}>Applications</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEdit}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color="#007AFF" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onUpdateStatus('Closed')}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={16} color="#FF9500" />
              <Text style={[styles.actionButtonText, { color: '#FF9500' }]}>
                Close
              </Text>
            </TouchableOpacity>
          </>
        )}

        {job.status === 'Filled' && job.filled_at && (
          <View style={styles.filledInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.filledText}>
              Filled on {new Date(job.filled_at).toLocaleDateString()}
            </Text>
          </View>
        )}

        {job.status === 'Closed' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onUpdateStatus('Open')}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color="#007AFF" />
            <Text style={styles.actionButtonText}>Reopen</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  categoryPill: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  details: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  applicationsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  applicationsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applicationsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  newBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  deleteButton: {
    marginLeft: 'auto',
  },
  filledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filledText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
  },
});
