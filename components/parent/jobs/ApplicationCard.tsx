// components/parent/jobs/ApplicationCard.tsx
// Individual application card for applications list

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { JobApplication } from '@/hooks/useJobApplications';

interface ApplicationCardProps {
  application: JobApplication;
  onViewProfile: () => void;
  onShortlist: () => void;
  onReject: () => void;
}

export function ApplicationCard({
  application,
  onViewProfile,
  onShortlist,
  onReject,
}: ApplicationCardProps) {
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = () => {
    switch (application.status) {
      case 'Pending':
        return '#FF9500';
      case 'Reviewed':
        return '#007AFF';
      case 'Shortlisted':
        return '#007AFF';
      case 'Accepted':
        return '#34C759';
      case 'Rejected':
        return '#FF3B30';
      default:
        return '#666';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onViewProfile}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Profile Photo */}
        {application.helper_photo ? (
          <Image
            source={{ uri: application.helper_photo }}
            style={styles.photo}
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person" size={24} color="#ccc" />
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {application.helper_name}
            </Text>
            {application.status === 'Pending' && (
              <View style={styles.newBadge}>
                <Text style={styles.newText}>NEW</Text>
              </View>
            )}
          </View>

          {/* Categories */}
          {application.helper_categories && application.helper_categories.length > 0 && (
            <View style={styles.categoriesRow}>
              {application.helper_categories.slice(0, 2).map((cat, idx) => (
                <View key={idx} style={styles.categoryPill}>
                  <Text style={styles.categoryText}>{cat}</Text>
                </View>
              ))}
              {application.helper_categories.length > 2 && (
                <Text style={styles.moreText}>
                  +{application.helper_categories.length - 2}
                </Text>
              )}
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {application.helper_experience_years !== undefined && (
              <View style={styles.stat}>
                <Ionicons name="briefcase-outline" size={12} color="#666" />
                <Text style={styles.statText}>
                  {application.helper_experience_years} yrs
                </Text>
              </View>
            )}

            {application.helper_rating_average !== undefined &&
              application.helper_rating_count &&
              application.helper_rating_count > 0 && (
                <View style={styles.stat}>
                  <Ionicons name="star" size={12} color="#FF9500" />
                  <Text style={styles.statText}>
                    {application.helper_rating_average.toFixed(1)} (
                    {application.helper_rating_count})
                  </Text>
                </View>
              )}

            {application.helper_municipality && (
              <View style={styles.stat}>
                <Ionicons name="location" size={12} color="#666" />
                <Text style={styles.statText} numberOfLines={1}>
                  {application.helper_municipality}
                </Text>
              </View>
            )}
          </View>

          {/* Applied Time */}
          <Text style={styles.timeText}>Applied {getTimeAgo(application.applied_at)}</Text>
        </View>
      </View>

      {/* Cover Letter Preview */}
      {application.cover_letter && (
        <View style={styles.coverLetterPreview}>
          <Text style={styles.coverLetterText} numberOfLines={2}>
            "{application.cover_letter}"
          </Text>
        </View>
      )}

      {/* Status and Actions */}
      <View style={styles.footer}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {application.status}
          </Text>
        </View>

        {application.status !== 'Accepted' && application.status !== 'Rejected' && (
          <View style={styles.actions}>
            {application.status !== 'Shortlisted' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onShortlist();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="bookmark-outline" size={16} color="#007AFF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onReject();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-outline" size={18} color="#FF3B30" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={onViewProfile}
              activeOpacity={0.7}
            >
              <Text style={styles.viewButtonText}>View</Text>
              <Ionicons name="chevron-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  photoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  newBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  categoryPill: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  moreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  coverLetterPreview: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  coverLetterText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButton: {
    flexDirection: 'row',
    width: 'auto',
    paddingHorizontal: 12,
    gap: 4,
    backgroundColor: '#007AFF',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
