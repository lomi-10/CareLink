// components/parent/jobs/JobCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JobStatusBadge } from './JobStatusBadge';
import type { JobPost } from '@/hooks/parent';

interface JobCardProps {
  job: JobPost;
  onViewDetails: () => void; // <-- NEW PROP ADDED
  onViewApplications: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: string) => void;
}

export function JobCard({
  job,
  onViewDetails, // <-- EXTRACTED HERE
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

  const displayCategory = job.custom_category || job.category_name;

  return (
    <TouchableOpacity style={styles.container} onPress={onViewDetails} activeOpacity={0.9}>
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {job.title}
          </Text>
          <View style={styles.badgeRow}>
            {displayCategory && (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>Category: {displayCategory}</Text>
              </View>
            )}
            <JobStatusBadge status={job.status} />
          </View>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={(e) => { e.stopPropagation(); /* show more menu if needed */ }}>
          <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* --- KEY DETAILS BAR --- */}
      <View style={styles.quickDetails}>
        <View style={styles.quickItem}>
          <Ionicons name="cash" size={16} color="#059669" />
          <Text style={styles.quickValue}>₱{Number(job.salary_offered).toLocaleString()}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.quickItem}>
          <Ionicons name="location" size={16} color="#1D4ED8" />
          <Text style={styles.quickValue}>{job.barangay} {job.municipality}, {job.province}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.quickItem}>
          <Ionicons name="time" size={16} color="#4B5563" />
          <Text style={styles.quickValue}>{getTimeAgo(job.posted_at)}</Text>
        </View>
      </View>

      {/* --- SUBTITLE / SUMMARY --- */}
      <Text style={styles.summary} numberOfLines={2}>
        {job.description || "Looking for a reliable helper to join our household..."}
      </Text>

      {/* --- APPLICATIONS CTA --- */}
      {job.status === 'Open' && job.application_count > 0 ? (
        <TouchableOpacity
          style={styles.applicationsBar}
          onPress={(e) => { e.stopPropagation(); onViewApplications(); }}
          activeOpacity={0.7}
        >
          <View style={styles.applicationsLeft}>
            <View style={styles.applicantsAvatars}>
               <View style={[styles.avatarMini, { backgroundColor: '#DBEAFE' }]}><Text style={styles.avatarText}>A</Text></View>
               <View style={[styles.avatarMini, { backgroundColor: '#D1FAE5', marginLeft: -8 }]}><Text style={styles.avatarText}>B</Text></View>
               <View style={[styles.avatarMini, { backgroundColor: '#FEF3C7', marginLeft: -8 }]}><Text style={styles.avatarText}>C</Text></View>
            </View>
            <Text style={styles.applicationsText}>
              <Text style={{ fontWeight: '700' }}>{job.application_count}</Text> {job.application_count === 1 ? 'Applicant' : 'Applicants'}
            </Text>
            {job.new_application_count > 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color="#1D4ED8" />
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}

      {/* --- ACTIONS FOOTER --- */}
      <View style={styles.actionsFooter}>
        <View style={styles.leftActions}>
          {job.status === 'Open' ? (
            <>
              <TouchableOpacity style={styles.primaryAction} onPress={(e) => { e.stopPropagation(); onEdit(); }} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={16} color="#1D4ED8" />
                <Text style={styles.primaryActionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryAction} onPress={(e) => { e.stopPropagation(); onUpdateStatus('Closed'); }} activeOpacity={0.7}>
                <Text style={styles.secondaryActionText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : job.status === 'Closed' ? (
            <TouchableOpacity style={styles.primaryAction} onPress={(e) => { e.stopPropagation(); onUpdateStatus('Open'); }} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={16} color="#059669" />
              <Text style={[styles.primaryActionText, { color: '#059669' }]}>Reopen</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.filledTag}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.filledTagText}>Job Filled</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={(e) => { e.stopPropagation(); onDelete(); }} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
  },
  menuBtn: {
    padding: 4,
  },
  quickDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: '#E5E7EB',
  },
  summary: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  applicationsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  applicationsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  applicantsAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  applicationsText: {
    fontSize: 13,
    color: '#1D4ED8',
  },
  newBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  spacer: {
    height: 12,
  },
  actionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  secondaryAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filledTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filledTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
});
  