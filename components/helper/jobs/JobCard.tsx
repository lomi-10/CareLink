// components/helper/jobs/JobCard.tsx
// Full job card for desktop 3-column grid

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { JobPost } from '@/hooks/helper';

interface JobCardProps {
  job: JobPost;
  onPress: () => void;
  onApply: () => void;
  onToggleSave?: (jobId: string) => void;
}

export function JobCard({ job, onPress, onApply, onToggleSave }: JobCardProps) {
  const displayCategory = job.category_name || (job.categories && job.categories[0]) || 'General';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
          <View style={styles.badgeRow}>
            
            {/* NEW: PESO VERIFIED BADGE */}
            <View style={[styles.categoryPill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Ionicons name="shield-checkmark" size={12} color="#059669" />
              <Text style={[styles.categoryText, { color: '#059669' }]}>PESO Verified</Text>
            </View>

            {displayCategory && (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{displayCategory}</Text>
              </View>
            )}
            {job.match_score && job.match_score >= 70 && (
              <View style={[styles.categoryPill, { backgroundColor: '#F0FDF4', borderColor: '#D1FAE5' }]}>
                <Text style={[styles.categoryText, { color: '#059669' }]}>{job.match_score}% Match</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={(e) => { e.stopPropagation(); onToggleSave?.(job.job_post_id); }}>
          <Ionicons name={job.is_saved ? "bookmark" : "bookmark-outline"} size={22} color={job.is_saved ? "#007AFF" : "#9CA3AF"} />
        </TouchableOpacity>
      </View>

      {/* --- QUICK DETAILS --- */}
      <View style={styles.quickDetails}>
        <View style={styles.quickItem}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.quickValue} numberOfLines={1}>{job.municipality}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.quickItem}>
          <Ionicons name="cash-outline" size={16} color="#6B7280" />
          <Text style={styles.quickValue}>₱{Number(job.salary_offered).toLocaleString()}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.quickItem}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.quickValue}>{job.employment_type}</Text>
        </View>
      </View>

      <Text style={styles.summary} numberOfLines={2}>{job.description}</Text>

      {/* --- EMPLOYER INFO --- */}
      <View style={styles.employerRow}>
        <View style={styles.employerLeft}>
          <View style={styles.avatarMini}>
            <Text style={styles.avatarText}>{job.parent_name ? job.parent_name.charAt(0).toUpperCase() : 'E'}</Text>
          </View>
          <View>
            <Text style={styles.employerName}>{job.parent_name || 'Employer'}</Text>
            <Text style={styles.postedTime}>Posted {job.posted_at ? new Date(job.posted_at).toLocaleDateString() : 'Recently'}</Text>
          </View>
        </View>
      </View>

      {/* --- ACTIONS --- */}
      <View style={styles.actionsFooter}>
        <TouchableOpacity style={styles.viewBtn} onPress={(e) => { e.stopPropagation(); onPress(); }}>
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyBtn} onPress={(e) => { e.stopPropagation(); onApply(); }}>
          <Text style={styles.applyBtnText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  titleContainer: { flex: 1, paddingRight: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 10, letterSpacing: -0.3 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryPill: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#DBEAFE' },
  categoryText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  saveBtn: { padding: 4 },
  quickDetails: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 16, gap: 12 },
  quickItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
  divider: { width: 1, height: 14, backgroundColor: '#E5E7EB' },
  summary: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  employerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  employerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarMini: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 10, fontWeight: '700', color: '#1D4ED8' },
  employerName: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  postedTime: { fontSize: 12, color: '#9CA3AF' },
  actionsFooter: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  viewBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  viewBtnText: { color: '#4B5563', fontSize: 14, fontWeight: '700' },
  applyBtn: { flex: 1, backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' }
});