// components/helper/applications/ApplicationCard.tsx
// Card displaying application status and details

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Application } from '@/hooks/useMyApplications';

interface ApplicationCardProps {
  application: Application;
  onPress: () => void;
  onWithdraw: () => void;
}

export default function ApplicationCard({ 
  application, 
  onPress, 
  onWithdraw 
}: ApplicationCardProps) {
  
  // Status color and icon
  const getStatusStyle = () => {
    switch (application.status) {
      case 'Pending':
        return { color: '#FF9500', icon: 'time-outline', bg: '#FFF4E5' };
      case 'Reviewed':
        return { color: '#007AFF', icon: 'eye-outline', bg: '#E3F2FD' };
      case 'Shortlisted':
        return { color: '#007AFF', icon: 'checkmark-circle-outline', bg: '#E3F2FD' };
      case 'Interview Scheduled':
        return { color: '#9C27B0', icon: 'calendar-outline', bg: '#F3E5F5' };
      case 'Accepted':
        return { color: '#34C759', icon: 'checkmark-circle', bg: '#E8F5E9' };
      case 'Rejected':
        return { color: '#FF3B30', icon: 'close-circle-outline', bg: '#FFEBEE' };
      case 'Withdrawn':
        return { color: '#999', icon: 'remove-circle-outline', bg: '#F5F5F5' };
      default:
        return { color: '#666', icon: 'help-circle-outline', bg: '#F0F0F0' };
    }
  };

  const statusStyle = getStatusStyle();

  const canWithdraw = ['Pending', 'Reviewed'].includes(application.status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Ionicons name={statusStyle.icon as any} size={16} color={statusStyle.color} />
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {application.status}
          </Text>
        </View>
        
        {canWithdraw && (
          <TouchableOpacity
            style={styles.withdrawButton}
            onPress={(e) => {
              e.stopPropagation();
              onWithdraw();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Job Info */}
      <Text style={styles.jobTitle} numberOfLines={1}>
        {application.job_title}
      </Text>
      
      <View style={styles.parentInfo}>
        <Text style={styles.parentName}>{application.parent_name}</Text>
        {application.parent_verified && (
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
        )}
      </View>

      {/* Details Row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="cash-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            ₱{application.salary_offered.toLocaleString()}/{application.salary_period === 'Daily' ? 'day' : 'mo'}
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {application.municipality}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.timeInfo}>
          <Ionicons name="time-outline" size={14} color="#999" />
          <Text style={styles.timeText}>Applied {application.applied_at}</Text>
        </View>
        
        {application.reviewed_at && (
          <View style={styles.timeInfo}>
            <Ionicons name="eye-outline" size={14} color="#999" />
            <Text style={styles.timeText}>Reviewed {application.reviewed_at}</Text>
          </View>
        )}
      </View>

      {/* Parent Notes (for rejected) */}
      {application.status === 'Rejected' && application.parent_notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Feedback:</Text>
          <Text style={styles.notesText} numberOfLines={2}>
            {application.parent_notes}
          </Text>
        </View>
      )}

      {/* Job Status Warning */}
      {application.job_status !== 'Open' && (
        <View style={styles.warningContainer}>
          <Ionicons name="alert-circle" size={16} color="#FF9500" />
          <Text style={styles.warningText}>
            This position has been {application.job_status.toLowerCase()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  withdrawButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  withdrawText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 6,
  },
  parentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  parentName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  warningText: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '600',
  },
});
