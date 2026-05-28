// components/helper/jobs/CompactJobCard.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { JobPost } from '@/hooks/helper';
import type { ThemeColor } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';

function createCompactJobCardStyles(c: ThemeColor) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.surfaceElevated,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.line,
      position: 'relative',
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    saveBtn: { position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 4 },

    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8, paddingRight: 22 },
    pesoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.helperSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: c.helper + '33',
    },
    pesoBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: c.helper,
      textTransform: 'uppercase',
    },
    catBadge: {
      backgroundColor: c.surface,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: c.line,
    },
    catBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: c.muted,
      textTransform: 'uppercase',
    },
    matchBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.warningSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: c.warning + '44',
    },
    matchBadgeText: {
      fontSize: 9,
      fontWeight: '900',
      color: c.warning,
    },

    title: {
      fontSize: 13,
      fontWeight: '800',
      color: c.ink,
      marginBottom: 8,
      lineHeight: 18,
      minHeight: 36,
    },

    details: { gap: 4, marginBottom: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    detailText: { fontSize: 11, color: c.inkMuted, flex: 1 },

    employerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderTopWidth: 1,
      borderTopColor: c.line,
      paddingTop: 8,
    },
    employerAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.helperSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    employerAvatarText: { fontSize: 10, fontWeight: '800', color: c.helper },
    employerName: { flex: 1, fontSize: 11, color: c.inkMuted, fontWeight: '600' },
  });
}

interface CompactJobCardProps {
  job: JobPost;
  onPress: () => void;
  onToggleSave?: (jobId: string) => void;
}

export function CompactJobCard({ job, onPress, onToggleSave }: CompactJobCardProps) {
  const { color: c } = useHelperTheme();
  const s = useMemo(() => createCompactJobCardStyles(c), [c]);

  const displayCategory =
    job.category_name || (job.categories && job.categories[0]) || 'General';
  const matchPct = Math.min(100, Math.max(0, Math.round(Number(job.match_score ?? 0))));

  return (
    <TouchableOpacity style={s.container} onPress={onPress} activeOpacity={0.9}>
      <TouchableOpacity
        style={s.saveBtn}
        onPress={(e) => {
          e.stopPropagation();
          onToggleSave?.(job.job_post_id);
        }}
        hitSlop={8}
      >
        <Ionicons
          name={job.is_saved ? 'bookmark' : 'bookmark-outline'}
          size={16}
          color={job.is_saved ? c.parent : c.subtle}
        />
      </TouchableOpacity>

      <View style={s.badgeRow}>
        <View style={s.pesoBadge}>
          <Ionicons name="shield-checkmark" size={10} color={c.helper} />
          <Text style={s.pesoBadgeText}>Verified</Text>
        </View>
        <View style={s.catBadge}>
          <Text style={s.catBadgeText} numberOfLines={1}>
            {displayCategory}
          </Text>
        </View>
        <View style={s.matchBadge}>
          <Ionicons name="pulse-outline" size={10} color={c.warning} />
          <Text style={s.matchBadgeText}>{matchPct}% match</Text>
        </View>
      </View>

      <Text style={s.title} numberOfLines={2}>
        {job.title}
      </Text>

      <View style={s.details}>
        <View style={s.detailRow}>
          <Ionicons name="cash-outline" size={12} color={c.success} />
          <Text style={[s.detailText, { color: c.success, fontWeight: '700' }]}>
            ₱{Number(job.salary_offered).toLocaleString()}
          </Text>
        </View>
        <View style={s.detailRow}>
          <Ionicons name="location-outline" size={12} color={c.muted} />
          <Text style={s.detailText} numberOfLines={1}>
            {job.municipality}
          </Text>
        </View>
      </View>

      <View style={s.employerRow}>
        <View style={s.employerAvatar}>
          <Text style={s.employerAvatarText}>
            {job.parent_name ? job.parent_name.charAt(0).toUpperCase() : 'E'}
          </Text>
        </View>
        <Text style={s.employerName} numberOfLines={1}>
          {job.parent_name || 'Employer'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
