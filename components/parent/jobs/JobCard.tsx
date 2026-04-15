// components/parent/jobs/JobCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JobStatusBadge } from './JobStatusBadge';
import type { JobPost } from '@/hooks/parent';
import { theme } from '@/constants/theme';

interface JobCardProps {
  job: JobPost;
  onViewDetails: () => void;
  onViewApplications: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: string) => void;
}

export function JobCard({
  job,
  onViewDetails,
  onViewApplications,
  onEdit,
  onDelete,
  onUpdateStatus,
}: JobCardProps) {
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const displayCategory = job.custom_category || job.category_name;
  const isPending  = job.status === 'Pending';
  const isRejected = job.status === 'Rejected';
  const jobNames: string[] = (job as any).job_names ?? [];

  return (
    <TouchableOpacity
      style={[styles.container, isPending && styles.containerPending, isRejected && styles.containerRejected]}
      onPress={onViewDetails}
      activeOpacity={0.9}
    >
      {/* ── Pending PESO notice ── */}
      {isPending && (
        <View style={styles.pesoBanner}>
          <Ionicons name="hourglass-outline" size={14} color={theme.color.warning} />
          <Text style={styles.pesoBannerText}>Awaiting PESO Verification</Text>
        </View>
      )}
      {isRejected && (
        <View style={[styles.pesoBanner, styles.pesoBannerRejected]}>
          <Ionicons name="close-circle-outline" size={14} color={theme.color.danger} />
          <Text style={[styles.pesoBannerText, { color: theme.color.danger }]}>Rejected by PESO — revise and resubmit</Text>
        </View>
      )}

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
          <View style={styles.badgeRow}>
            {displayCategory && (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{displayCategory}</Text>
              </View>
            )}
            <JobStatusBadge status={job.status} />
          </View>
        </View>
      </View>

      {/* ── Category / Job type row ── */}
      <View style={styles.catJobRow}>
        {displayCategory && (
          <View style={styles.catJobItem}>
            <Ionicons name="grid-outline" size={12} color={theme.color.muted} />
            <Text style={styles.catJobLabel}>Category:</Text>
            <Text style={styles.catJobValue}>{displayCategory}</Text>
          </View>
        )}
        {jobNames.length > 0 && (
          <View style={styles.catJobItem}>
            <Ionicons name="briefcase-outline" size={12} color={theme.color.muted} />
            <Text style={styles.catJobLabel}>Job:</Text>
            <Text style={styles.catJobValue} numberOfLines={1}>{jobNames.join(', ')}</Text>
          </View>
        )}
      </View>

      {/* ── Quick details bar ── */}
      <View style={styles.quickDetails}>
        <View style={styles.quickItem}>
          <Ionicons name="cash-outline" size={15} color={theme.color.success} />
          <Text style={[styles.quickValue, { color: theme.color.success }]}>
            ₱{Number(job.salary_offered).toLocaleString()}
          </Text>
        </View>
        <View style={styles.dot} />
        <View style={styles.quickItem}>
          <Ionicons name="location-outline" size={15} color={theme.color.parent} />
          <Text style={styles.quickValue} numberOfLines={1}>
            {[job.barangay, job.municipality].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={styles.dot} />
        <View style={styles.quickItem}>
          <Ionicons name="time-outline" size={15} color={theme.color.muted} />
          <Text style={styles.quickValue}>{getTimeAgo(job.posted_at)}</Text>
        </View>
      </View>

      {/* ── Description snippet ── */}
      <Text style={styles.summary} numberOfLines={2}>
        {job.description || 'No description provided.'}
      </Text>

      {/* ── Applicants CTA ── */}
      {job.status === 'Open' && job.application_count > 0 ? (
        <TouchableOpacity
          style={styles.applicationsBar}
          onPress={(e) => { e.stopPropagation(); onViewApplications(); }}
          activeOpacity={0.75}
        >
          <View style={styles.applicantsLeft}>
            {/* stacked initials */}
            <View style={styles.avatarStack}>
              {['A', 'B', 'C'].map((l, i) => (
                <View key={l} style={[styles.avatarMini, { marginLeft: i === 0 ? 0 : -8, backgroundColor: [theme.color.parentSoft, theme.color.helperSoft, theme.color.warningSoft][i] }]}>
                  <Text style={[styles.avatarText, { color: [theme.color.parent, theme.color.helper, theme.color.warning][i] }]}>{l}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.applicationsText}>
              <Text style={{ fontWeight: '800' }}>{job.application_count}</Text>
              {' '}{job.application_count === 1 ? 'Applicant' : 'Applicants'}
            </Text>
            {job.new_application_count > 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <View style={styles.viewAppsBtn}>
            <Text style={styles.viewAppsBtnText}>View</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.color.parent} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={{ height: 10 }} />
      )}

      {/* ── Footer actions ── */}
      <View style={styles.footer}>
        <View style={styles.leftActions}>
          {job.status === 'Open' || job.status === 'Pending' ? (
            <>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={(e) => { e.stopPropagation(); onEdit(); }}
                activeOpacity={0.75}
              >
                <Ionicons name="create-outline" size={15} color={theme.color.parent} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              {job.status === 'Open' && (
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={(e) => { e.stopPropagation(); onUpdateStatus('Closed'); }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              )}
            </>
          ) : job.status === 'Closed' ? (
            <TouchableOpacity
              style={styles.reopenBtn}
              onPress={(e) => { e.stopPropagation(); onUpdateStatus('Open'); }}
              activeOpacity={0.75}
            >
              <Ionicons name="refresh-outline" size={15} color={theme.color.success} />
              <Text style={styles.reopenBtnText}>Reopen</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.filledTag}>
              <Ionicons name="checkmark-circle" size={15} color={theme.color.success} />
              <Text style={styles.filledTagText}>Filled</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(e) => { e.stopPropagation(); onDelete(); }}
          activeOpacity={0.75}
        >
          <Ionicons name="trash-outline" size={17} color={theme.color.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  containerPending: {
    borderColor: theme.color.warning + '55',
    borderLeftWidth: 4,
    borderLeftColor: theme.color.warning,
  },
  containerRejected: {
    borderColor: theme.color.danger + '44',
    borderLeftWidth: 4,
    borderLeftColor: theme.color.danger,
  },

  pesoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.color.warningSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  pesoBannerRejected: { backgroundColor: theme.color.dangerSoft },
  pesoBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.warning,
    flex: 1,
  },

  header: { marginBottom: 12 },
  titleContainer: { gap: 6 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.color.ink,
    letterSpacing: -0.4,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryPill: {
    backgroundColor: theme.color.parentSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.color.parent + '33',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.color.parent,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  catJobRow:   { flexDirection: 'column', gap: 4, marginBottom: 10 },
  catJobItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catJobLabel: { fontSize: 11, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase', letterSpacing: 0.3 },
  catJobValue: { flex: 1, fontSize: 12, fontWeight: '600', color: theme.color.inkMuted },

  quickDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 10,
    flexWrap: 'wrap',
  },
  quickItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  quickValue: { fontSize: 12, fontWeight: '600', color: theme.color.inkMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.color.line },

  summary: {
    fontSize: 13,
    color: theme.color.muted,
    lineHeight: 19,
    marginBottom: 14,
  },

  applicationsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.color.parentSoft,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.color.parent + '22',
  },
  applicantsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.color.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 9, fontWeight: '800' },
  applicationsText: { fontSize: 12, color: theme.color.parent },
  newBadge: {
    backgroundColor: theme.color.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  viewAppsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  viewAppsBtnText: { fontSize: 12, fontWeight: '700', color: theme.color.parent },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.color.line,
    paddingTop: 12,
    marginTop: 2,
  },
  leftActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.color.parentSoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: theme.color.parent },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  closeBtnText: { fontSize: 13, fontWeight: '600', color: theme.color.muted },
  reopenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.color.helperSoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  reopenBtnText: { fontSize: 13, fontWeight: '700', color: theme.color.success },
  filledTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.color.helperSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filledTagText: { fontSize: 13, fontWeight: '600', color: theme.color.success },
  deleteBtn: {
    padding: 8,
    backgroundColor: theme.color.dangerSoft,
    borderRadius: 8,
  },
});
