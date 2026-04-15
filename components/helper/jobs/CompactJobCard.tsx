// components/helper/jobs/CompactJobCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { JobPost } from '@/hooks/helper';
import { theme } from '@/constants/theme';

interface CompactJobCardProps {
  job: JobPost;
  onPress: () => void;
  onToggleSave?: (jobId: string) => void;
}

export function CompactJobCard({ job, onPress, onToggleSave }: CompactJobCardProps) {
  const displayCategory = job.category_name
    || (job.categories && job.categories[0])
    || 'General';

  return (
    <TouchableOpacity style={s.container} onPress={onPress} activeOpacity={0.9}>

      {/* Save button */}
      <TouchableOpacity
        style={s.saveBtn}
        onPress={(e) => { e.stopPropagation(); onToggleSave?.(job.job_post_id); }}
        hitSlop={8}
      >
        <Ionicons
          name={job.is_saved ? 'bookmark' : 'bookmark-outline'}
          size={16}
          color={job.is_saved ? theme.color.parent : theme.color.subtle}
        />
      </TouchableOpacity>

      {/* Badges */}
      <View style={s.badgeRow}>
        <View style={s.pesoBadge}>
          <Ionicons name="shield-checkmark" size={10} color={theme.color.helper} />
          <Text style={s.pesoBadgeText}>Verified</Text>
        </View>
        <View style={s.catBadge}>
          <Text style={s.catBadgeText} numberOfLines={1}>{displayCategory}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={s.title} numberOfLines={2}>{job.title}</Text>

      {/* Details */}
      <View style={s.details}>
        <View style={s.detailRow}>
          <Ionicons name="cash-outline" size={12} color={theme.color.success} />
          <Text style={[s.detailText, { color: theme.color.success, fontWeight: '700' }]}>
            ₱{Number(job.salary_offered).toLocaleString()}
          </Text>
        </View>
        <View style={s.detailRow}>
          <Ionicons name="location-outline" size={12} color={theme.color.muted} />
          <Text style={s.detailText} numberOfLines={1}>{job.municipality}</Text>
        </View>
      </View>

      {/* Employer */}
      <View style={s.employerRow}>
        <View style={s.employerAvatar}>
          <Text style={s.employerAvatarText}>
            {job.parent_name ? job.parent_name.charAt(0).toUpperCase() : 'E'}
          </Text>
        </View>
        <Text style={s.employerName} numberOfLines={1}>{job.parent_name || 'Employer'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: theme.color.line,
    position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  saveBtn: { position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 4 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8, paddingRight: 22 },
  pesoBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: theme.color.helperSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: theme.color.helper + '33' },
  pesoBadgeText: { fontSize: 9, fontWeight: '800', color: theme.color.helper, textTransform: 'uppercase' },
  catBadge: { backgroundColor: theme.color.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: theme.color.line },
  catBadgeText: { fontSize: 9, fontWeight: '700', color: theme.color.muted, textTransform: 'uppercase' },

  title: { fontSize: 13, fontWeight: '800', color: theme.color.ink, marginBottom: 8, lineHeight: 18, minHeight: 36 },

  details: { gap: 4, marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 11, color: theme.color.inkMuted, flex: 1 },

  employerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: theme.color.line, paddingTop: 8 },
  employerAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.color.helperSoft, alignItems: 'center', justifyContent: 'center' },
  employerAvatarText: { fontSize: 10, fontWeight: '800', color: theme.color.helper },
  employerName: { flex: 1, fontSize: 11, color: theme.color.muted, fontWeight: '600' },
});
