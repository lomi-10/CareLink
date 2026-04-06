// components/parent/jobs/JobCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JobStatusBadge } from './JobStatusBadge';
import type { JobPost } from '@/hooks/useParentJobs';

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
    <View style={styles.container}>
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {job.title}
          </Text>
          {displayCategory && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{displayCategory}</Text>
            </View>
          )}
        </View>
        <View style={styles.statusContainer}>
          <JobStatusBadge status={job.status} />
        </View>
      </View>

      {/* --- MODERN DETAIL PILLS --- */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailBadge}>
          <Ionicons name="cash-outline" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            ₱{job.salary_offered.toLocaleString()} / {job.salary_period}
          </Text>
        </View>

        <View style={styles.detailBadge}>
          <Ionicons name="briefcase-outline" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {job.employment_type} • {job.work_schedule}
          </Text>
        </View>

        <View style={styles.detailBadge}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {job.municipality}, {job.province}
          </Text>
        </View>

        <View style={styles.detailBadge}>
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text style={styles.detailText}>Posted {getTimeAgo(job.posted_at)}</Text>
        </View>
      </View>

      {/* --- APPLICATIONS CTA --- */}
      {job.status === 'Open' && job.application_count > 0 && (
        <TouchableOpacity
          style={styles.applicationsBar}
          onPress={onViewApplications}
          activeOpacity={0.7}
        >
          <View style={styles.applicationsLeft}>
            <View style={styles.applicationsIconWrapper}>
              <Ionicons name="people" size={18} color="#1D4ED8" />
            </View>
            <Text style={styles.applicationsText}>
              {job.application_count} {job.application_count === 1 ? 'Applicant' : 'Applicants'}
            </Text>
            {job.new_application_count > 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>
                  {job.new_application_count} New
                </Text>
              </View>
            )}
          </View>
          <Ionicons name="arrow-forward" size={18} color="#1D4ED8" />
        </TouchableOpacity>
      )}

      {/* --- ACTIONS FOOTER --- */}
      <View style={styles.actionsFooter}>
        <View style={styles.leftActions}>
          {/* ALWAYS VISIBLE VIEW BUTTON */}
          <TouchableOpacity style={styles.actionBtn} onPress={onViewDetails} activeOpacity={0.7}>
            <Ionicons name="eye-outline" size={16} color="#4B5563" />
            <Text style={styles.actionBtnText}>View</Text>
          </TouchableOpacity>

          {job.status === 'Open' && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={onEdit} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={16} color="#4B5563" />
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => onUpdateStatus('Closed')} activeOpacity={0.7}>
                <Ionicons name="close-circle-outline" size={16} color="#D97706" />
                <Text style={[styles.actionBtnText, { color: '#D97706' }]}>Close Job</Text>
              </TouchableOpacity>
            </>
          )}

          {job.status === 'Closed' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => onUpdateStatus('Open')} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={16} color="#059669" />
              <Text style={[styles.actionBtnText, { color: '#059669' }]}>Reopen</Text>
            </TouchableOpacity>
          )}

          {job.status === 'Filled' && job.filled_at && (
            <View style={styles.filledBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.filledText}>
                Filled on {new Date(job.filled_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ... Keep all the same styles from the previous code block ...
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 8,
  },
  statusContainer: {
    paddingTop: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 24,
  },
  categoryPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  applicationsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  applicationsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  applicationsIconWrapper: {
    backgroundColor: '#DBEAFE',
    padding: 6,
    borderRadius: 8,
  },
  applicationsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  newBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
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
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  filledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filledText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
});