// components/helper/jobs/CompactJobCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { JobPost } from '@/hooks/helper';

interface CompactJobCardProps {
  job: JobPost;
  onPress: () => void;
  onToggleSave?: (jobId: string) => void;
}

export function CompactJobCard({ job, onPress, onToggleSave }: CompactJobCardProps) {
  const displayCategory = job.category_name || (job.categories && job.categories[0]) || 'General';
  const isOpen = job.status === 'Open';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <TouchableOpacity style={styles.saveBtn} onPress={(e) => { e.stopPropagation(); onToggleSave?.(job.job_post_id); }}>
        <Ionicons name={job.is_saved ? "bookmark" : "bookmark-outline"} size={18} color={job.is_saved ? "#007AFF" : "#9CA3AF"} />
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={[styles.categoryBadge, isOpen ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' } : { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }, { borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
          <Ionicons name={isOpen ? 'shield-checkmark' : 'hourglass-outline'} size={10} color={isOpen ? '#059669' : '#B45309'} />
          <Text style={[styles.categoryText, { color: isOpen ? '#059669' : '#B45309' }]}>{isOpen ? 'Verified' : 'Pending'}</Text>
        </View>

        {displayCategory && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{displayCategory}</Text>
          </View>
        )}
      </View>

      <Text style={styles.title} numberOfLines={2}>{job.title}</Text>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={14} color="#6B7280" />
          <Text style={styles.detailText}>₱{Number(job.salary_offered).toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.detailText} numberOfLines={1}>{job.municipality}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, position: 'relative' },
  saveBtn: { position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingRight: 24, flexWrap: 'wrap' },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryText: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10, lineHeight: 20, height: 40 },
  details: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: '#4B5563', flex: 1 }
});