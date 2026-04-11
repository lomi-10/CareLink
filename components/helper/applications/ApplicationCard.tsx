// components/helper/applications/ApplicationCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Application } from '@/hooks/helper';

interface ApplicationCardProps {
  application: Application;
  onPress: () => void;
  onWithdraw: () => void;
}

export default function ApplicationCard({ application, onPress, onWithdraw }: ApplicationCardProps) {
  
  const getStatusConfig = () => {
    switch (application.status) {
      case 'Pending': return { color: '#D97706', bg: '#FEF3C7', icon: 'time' as const, label: 'Pending Review' };
      case 'Reviewed': return { color: '#2563EB', bg: '#DBEAFE', icon: 'eye' as const, label: 'Reviewed' };
      case 'Shortlisted': return { color: '#7C3AED', bg: '#F3E8FF', icon: 'star' as const, label: 'Shortlisted' };
      case 'Interview Scheduled': return { color: '#059669', bg: '#D1FAE5', icon: 'calendar' as const, label: 'Interviewing' };
      case 'Accepted': return { color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle' as const, label: 'Hired!' };
      case 'Rejected': return { color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' as const, label: 'Not Selected' };
      case 'Withdrawn': return { color: '#6B7280', bg: '#F3F4F6', icon: 'arrow-undo' as const, label: 'Withdrawn' };
      default: return { color: '#6B7280', bg: '#F3F4F6', icon: 'information-circle' as const, label: application.status };
    }
  };

  const statusConfig = getStatusConfig();
  const canWithdraw = ['Pending', 'Reviewed', 'Shortlisted'].includes(application.status);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      {/* Header: Title & Status */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.jobTitle} numberOfLines={1}>{application.job_title}</Text>
          <Text style={styles.appliedDate}>Applied {formatDate(application.applied_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* Employer & Details Row */}
      <View style={styles.employerRow}>
        <View style={styles.employerLeft}>
          <View style={styles.avatarMini}>
            <Text style={styles.avatarText}>{application.parent_name ? application.parent_name.charAt(0).toUpperCase() : 'E'}</Text>
          </View>
          <Text style={styles.employerName} numberOfLines={1}>{application.parent_name}</Text>
        </View>
      </View>

      {/* Quick Info Grid */}
      <View style={styles.quickDetails}>
        <View style={styles.quickItem}>
          <Ionicons name="cash-outline" size={16} color="#6B7280" />
          <Text style={styles.quickValue}>₱{Number(application.salary_offered || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.quickItem}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.quickValue} numberOfLines={1}>{application.location || 'Location hidden'}</Text>
        </View>
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {canWithdraw && (
          <TouchableOpacity style={styles.withdrawBtn} onPress={(e) => { e.stopPropagation(); onWithdraw(); }}>
            <Text style={styles.withdrawBtnText}>Withdraw</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.viewBtn} onPress={(e) => { e.stopPropagation(); onPress(); }}>
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12 }, android: { elevation: 3 }, web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' } }) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  titleContainer: { flex: 1, paddingRight: 12 },
  jobTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4, letterSpacing: -0.3 },
  appliedDate: { fontSize: 13, color: '#6B7280' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  employerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  employerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  avatarMini: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800', color: '#1D4ED8' },
  employerName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  quickDetails: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 20, gap: 12 },
  quickItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  quickValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
  divider: { width: 1, height: 16, backgroundColor: '#E5E7EB' },
  footer: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  withdrawBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  withdrawBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },
  viewBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  viewBtnText: { color: '#4B5563', fontSize: 14, fontWeight: '700' }
});