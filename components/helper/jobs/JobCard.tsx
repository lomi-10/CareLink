// components/helper/jobs/JobCard.tsx

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { JobPost } from '@/hooks/helper';
import type { ThemeColor } from '@/constants/theme';
import { theme } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';

function createJobCardStyles(c: ThemeColor) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.surfaceElevated,
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.line,
      ...theme.shadow.card,
    },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    titleWrap: { flex: 1, paddingRight: 12 },
    title: { fontSize: 17, fontWeight: '800', color: c.ink, marginBottom: 8, letterSpacing: -0.3 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

    pesoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.helperSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.helper + '33',
    },
    pesoBadgeText: { fontSize: 11, fontWeight: '700', color: c.helper },

    catPill: {
      backgroundColor: c.surface,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.line,
    },
    catText: { fontSize: 11, fontWeight: '600', color: c.muted },

    matchPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.warningSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.warning + '33',
    },
    matchText: { fontSize: 11, fontWeight: '700', color: c.warning },

    saveBtn: { padding: 2 },

    quickBar: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      backgroundColor: c.surface,
      padding: 9,
      borderRadius: 10,
      marginBottom: 12,
      gap: 8,
    },
    quickItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    quickText: { fontSize: 12, fontWeight: '600', color: c.inkMuted },
    dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: c.line },

    summary: { fontSize: 13, color: c.muted, lineHeight: 19, marginBottom: 14 },

    employerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    employerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.helperSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    employerAvatarText: { fontSize: 14, fontWeight: '800', color: c.helper },
    employerName: { fontSize: 13, fontWeight: '700', color: c.inkMuted },
    postedDate: { fontSize: 11, color: c.subtle, marginTop: 1 },

    catJobRow: { flexDirection: 'column', gap: 4, marginBottom: 10 },
    catJobItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    catJobLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.subtle,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    catJobValue: { flex: 1, fontSize: 12, fontWeight: '600', color: c.inkMuted },

    actions: {
      flexDirection: 'row',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: c.line,
      paddingTop: 14,
    },
    detailsBtn: {
      flex: 1,
      backgroundColor: c.surface,
      paddingVertical: 11,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.line,
    },
    detailsBtnText: { color: c.inkMuted, fontSize: 13, fontWeight: '700' },
    applyBtn: {
      flex: 1.3,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.helper,
      paddingVertical: 11,
      borderRadius: 10,
    },
    applyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  });
}

interface JobCardProps {
  job: JobPost;
  onPress: () => void;
  onApply: () => void;
  onToggleSave?: (jobId: string) => void;
}

export function JobCard({ job, onPress, onApply, onToggleSave }: JobCardProps) {
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createJobCardStyles(c), [c]);

  const displayCategory = job.category_name || (job.categories && job.categories[0]) || 'General';
  const jobNames: string[] = (job as any).job_names ?? (job as any).jobs ?? [];

  const hasGoodMatch = job.match_score && job.match_score >= 70;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {job.title}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.pesoBadge}>
              <Ionicons name="shield-checkmark" size={12} color={c.helper} />
              <Text style={styles.pesoBadgeText}>PESO Verified</Text>
            </View>

            <View style={styles.catPill}>
              <Text style={styles.catText}>{displayCategory}</Text>
            </View>

            {hasGoodMatch && (
              <View style={styles.matchPill}>
                <Ionicons name="flash" size={11} color={c.warning} />
                <Text style={styles.matchText}>{job.match_score}% Match</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={(e) => {
            e.stopPropagation();
            onToggleSave?.(job.job_post_id);
          }}
          hitSlop={8}
        >
          <Ionicons
            name={job.is_saved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={job.is_saved ? c.parent : c.subtle}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.catJobRow}>
        <View style={styles.catJobItem}>
          <Ionicons name="grid-outline" size={12} color={c.muted} />
          <Text style={styles.catJobLabel}>Category:</Text>
          <Text style={styles.catJobValue}>{displayCategory}</Text>
        </View>
        {jobNames.length > 0 && (
          <View style={styles.catJobItem}>
            <Ionicons name="briefcase-outline" size={12} color={c.muted} />
            <Text style={styles.catJobLabel}>Job:</Text>
            <Text style={styles.catJobValue} numberOfLines={1}>
              {jobNames.join(', ')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.quickBar}>
        <View style={styles.quickItem}>
          <Ionicons name="location-outline" size={13} color={c.muted} />
          <Text style={styles.quickText} numberOfLines={1}>
            {job.municipality}
          </Text>
        </View>
        <View style={styles.dot} />
        <View style={styles.quickItem}>
          <Ionicons name="cash-outline" size={13} color={c.success} />
          <Text style={[styles.quickText, { color: c.success, fontWeight: '700' }]}>
            ₱{Number(job.salary_offered).toLocaleString()}
          </Text>
        </View>
        <View style={styles.dot} />
        <View style={styles.quickItem}>
          <Ionicons name="briefcase-outline" size={13} color={c.muted} />
          <Text style={styles.quickText}>{job.employment_type}</Text>
        </View>
      </View>

      <Text style={styles.summary} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.employerRow}>
        <View style={styles.employerAvatar}>
          <Text style={styles.employerAvatarText}>
            {job.parent_name ? job.parent_name.charAt(0).toUpperCase() : 'E'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.employerName}>{job.parent_name || 'Verified Employer'}</Text>
          <Text style={styles.postedDate}>
            Posted{' '}
            {job.posted_at
              ? new Date(job.posted_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })
              : 'recently'}
            {job.distance ? `  ·  ~${job.distance} km` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={(e) => {
            e.stopPropagation();
            onPress();
          }}
          activeOpacity={0.75}
        >
          <Text style={styles.detailsBtnText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyBtn}
          onPress={(e) => {
            e.stopPropagation();
            onApply();
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane-outline" size={15} color="#fff" />
          <Text style={styles.applyBtnText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
