// components/parent/jobs/JobCard.tsx

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JobStatusBadge } from './JobStatusBadge';
import type { JobPost } from '@/hooks/parent';
import { theme, type ThemeColor } from '@/constants/theme';
import { useParentTheme } from '@/contexts/ParentThemeContext';

function createJobCardStyles(t: ThemeColor) {
  return StyleSheet.create({
  container: {
    backgroundColor: t.surfaceElevated,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: t.line,
    ...theme.shadow.card,
  },
  containerPending: {
    borderColor: t.warning + '55',
    borderLeftWidth: 4,
    borderLeftColor: t.warning,
  },
  containerRejected: {
    borderColor: t.danger + '44',
    borderLeftWidth: 4,
    borderLeftColor: t.danger,
  },
  pesoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.warningSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  pesoBannerRejected: { backgroundColor: t.dangerSoft },
  pesoBannerText: { fontSize: 12, fontWeight: '700', color: t.warning, flex: 1 },
  header: { marginBottom: 12 },
  titleContainer: { gap: 6 },
  title: { fontSize: 18, fontWeight: '800', color: t.ink, letterSpacing: -0.4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryPill: {
    backgroundColor: t.parentSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: t.parent + '33',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: t.parent,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  catJobRow:   { flexDirection: 'column', gap: 4, marginBottom: 10 },
  catJobItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catJobLabel: { fontSize: 11, fontWeight: '700', color: t.subtle, textTransform: 'uppercase', letterSpacing: 0.3 },
  catJobValue: { flex: 1, fontSize: 12, fontWeight: '600', color: t.inkMuted },
  quickDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 10,
    flexWrap: 'wrap',
  },
  quickItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  quickValue: { fontSize: 12, fontWeight: '600', color: t.inkMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: t.line },
  summary: { fontSize: 13, color: t.muted, lineHeight: 19, marginBottom: 14 },
  applicationsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.parentSoft,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: t.parent + '22',
  },
  applicantsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarMini: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: t.surfaceElevated, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 9, fontWeight: '800' },
  applicationsText: { fontSize: 12, color: t.parent },
  newBadge: { backgroundColor: t.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  viewAppsBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: t.surfaceElevated,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 2,
  },
  viewAppsBtnText: { fontSize: 12, fontWeight: '700', color: t.parent },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: t.line, paddingTop: 12, marginTop: 2,
  },
  leftActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.parentSoft,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: t.parent },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  closeBtnText: { fontSize: 13, fontWeight: '600', color: t.muted },
  reopenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.helperSoft,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
  },
  reopenBtnText: { fontSize: 13, fontWeight: '700', color: t.success },
  filledTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.helperSoft,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  filledTagText: { fontSize: 13, fontWeight: '600', color: t.success },
  deleteBtn: { padding: 8, backgroundColor: t.dangerSoft, borderRadius: 8 },
  });
}

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
  const { color: t } = useParentTheme();
  const styles = useMemo(() => createJobCardStyles(t), [t]);
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
      {isPending && (
        <View style={styles.pesoBanner}>
          <Ionicons name="hourglass-outline" size={14} color={t.warning} />
          <Text style={styles.pesoBannerText}>Awaiting PESO Verification</Text>
        </View>
      )}
      {isRejected && (
        <View style={[styles.pesoBanner, styles.pesoBannerRejected]}>
          <Ionicons name="close-circle-outline" size={14} color={t.danger} />
          <Text style={[styles.pesoBannerText, { color: t.danger }]}>Rejected by PESO — revise and resubmit</Text>
        </View>
      )}

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

      <View style={styles.catJobRow}>
        {displayCategory && (
          <View style={styles.catJobItem}>
            <Ionicons name="grid-outline" size={12} color={t.muted} />
            <Text style={styles.catJobLabel}>Category:</Text>
            <Text style={styles.catJobValue}>{displayCategory}</Text>
          </View>
        )}
        {jobNames.length > 0 && (
          <View style={styles.catJobItem}>
            <Ionicons name="briefcase-outline" size={12} color={t.muted} />
            <Text style={styles.catJobLabel}>Job:</Text>
            <Text style={styles.catJobValue} numberOfLines={1}>{jobNames.join(', ')}</Text>
          </View>
        )}
      </View>

      <View style={styles.quickDetails}>
        <View style={styles.quickItem}>
          <Ionicons name="cash-outline" size={15} color={t.success} />
          <Text style={[styles.quickValue, { color: t.success }]}>
            ₱{Number(job.salary_offered).toLocaleString()}
          </Text>
        </View>
        <View style={styles.dot} />
        <View style={styles.quickItem}>
          <Ionicons name="location-outline" size={15} color={t.parent} />
          <Text style={styles.quickValue} numberOfLines={1}>
            {[job.barangay, job.municipality].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={styles.dot} />
        <View style={styles.quickItem}>
          <Ionicons name="time-outline" size={15} color={t.muted} />
          <Text style={styles.quickValue}>{getTimeAgo(job.posted_at)}</Text>
        </View>
      </View>

      <Text style={styles.summary} numberOfLines={2}>
        {job.description || 'No description provided.'}
      </Text>

      {job.status === 'Open' && job.application_count > 0 ? (
        <TouchableOpacity
          style={styles.applicationsBar}
          onPress={(e) => { e.stopPropagation(); onViewApplications(); }}
          activeOpacity={0.75}
        >
          <View style={styles.applicantsLeft}>
            <View style={styles.avatarStack}>
              {['A', 'B', 'C'].map((l, i) => (
                <View key={l} style={[styles.avatarMini, { marginLeft: i === 0 ? 0 : -8, backgroundColor: [t.parentSoft, t.helperSoft, t.warningSoft][i] }]}>
                  <Text style={[styles.avatarText, { color: [t.parent, t.helper, t.warning][i] }]}>{l}</Text>
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
            <Ionicons name="chevron-forward" size={14} color={t.parent} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={{ height: 10 }} />
      )}

      <View style={styles.footer}>
        <View style={styles.leftActions}>
          {job.status === 'Open' || job.status === 'Pending' ? (
            <>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={(e) => { e.stopPropagation(); onEdit(); }}
                activeOpacity={0.75}
              >
                <Ionicons name="create-outline" size={15} color={t.parent} />
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
              <Ionicons name="refresh-outline" size={15} color={t.success} />
              <Text style={styles.reopenBtnText}>Reopen</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.filledTag}>
              <Ionicons name="checkmark-circle" size={15} color={t.success} />
              <Text style={styles.filledTagText}>Filled</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(e) => { e.stopPropagation(); onDelete(); }}
          activeOpacity={0.75}
        >
          <Ionicons name="trash-outline" size={17} color={t.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
