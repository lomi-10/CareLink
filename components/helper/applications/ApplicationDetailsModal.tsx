// components/helper/applications/ApplicationDetailsModal.tsx
// Modal to view complete application details

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Application } from '@/hooks/useMyApplications';

interface ApplicationDetailsModalProps {
  visible: boolean;
  application: Application | null;
  onWithdraw: () => void;
  onClose: () => void;
}

export default function ApplicationDetailsModal({
  visible,
  application,
  onWithdraw,
  onClose,
}: ApplicationDetailsModalProps) {
  if (!application) return null;

  // Status styling
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Application Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#1A1C1E" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Status Banner */}
            <View style={[styles.statusBanner, { backgroundColor: statusStyle.bg }]}>
              <Ionicons name={statusStyle.icon as any} size={32} color={statusStyle.color} />
              <View style={styles.statusInfo}>
                <Text style={[styles.statusText, { color: statusStyle.color }]}>
                  {application.status}
                </Text>
                <Text style={styles.statusSubtext}>
                  Applied {application.applied_at}
                  {application.reviewed_at && ` • Reviewed ${application.reviewed_at}`}
                </Text>
              </View>
            </View>

            {/* Job Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Position</Text>
              <Text style={styles.jobTitle}>{application.job_title}</Text>
              
              <View style={styles.parentInfo}>
                <Text style={styles.parentName}>{application.parent_name}</Text>
                {application.parent_verified && (
                  <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                )}
                {application.parent_rating && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FF9500" />
                    <Text style={styles.ratingText}>{application.parent_rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.infoGrid}>
                <InfoItem 
                  icon="cash-outline" 
                  label="Salary" 
                  value={`₱${application.salary_offered.toLocaleString()}/${application.salary_period === 'Daily' ? 'day' : 'month'}`} 
                />
                <InfoItem 
                  icon="time-outline" 
                  label="Schedule" 
                  value={application.work_schedule} 
                />
                <InfoItem 
                  icon="home-outline" 
                  label="Type" 
                  value={application.employment_type} 
                />
                <InfoItem 
                  icon="location-outline" 
                  label="Location" 
                  value={`${application.municipality}, ${application.province}`} 
                />
              </View>
            </View>

            {/* Job Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Description</Text>
              <Text style={styles.description}>{application.job_description}</Text>
            </View>

            {/* Cover Letter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Cover Letter</Text>
              <View style={styles.coverLetterContainer}>
                <Text style={styles.coverLetter}>{application.cover_letter}</Text>
              </View>
            </View>

            {/* Parent Feedback (if rejected) */}
            {application.status === 'Rejected' && application.parent_notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Feedback from Employer</Text>
                <View style={styles.feedbackContainer}>
                  <Ionicons name="chatbox-ellipses-outline" size={20} color="#666" />
                  <Text style={styles.feedbackText}>{application.parent_notes}</Text>
                </View>
              </View>
            )}

            {/* Next Steps (based on status) */}
            {application.status === 'Pending' && (
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>⏳ Application Pending</Text>
                <Text style={styles.tipsText}>
                  Your application is being reviewed by the employer. You will be notified of any updates.
                </Text>
              </View>
            )}

            {application.status === 'Reviewed' && (
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>👀 Under Review</Text>
                <Text style={styles.tipsText}>
                  The employer has reviewed your application. You may be contacted for an interview soon.
                </Text>
              </View>
            )}

            {application.status === 'Shortlisted' && (
              <View style={[styles.tipsContainer, { backgroundColor: '#E3F2FD' }]}>
                <Text style={[styles.tipsTitle, { color: '#007AFF' }]}>🎯 Shortlisted!</Text>
                <Text style={styles.tipsText}>
                  Congratulations! You've been shortlisted for this position. The employer may contact you for an interview.
                </Text>
              </View>
            )}

            {application.status === 'Interview Scheduled' && (
              <View style={[styles.tipsContainer, { backgroundColor: '#F3E5F5' }]}>
                <Text style={[styles.tipsTitle, { color: '#9C27B0' }]}>📅 Interview Scheduled</Text>
                <Text style={styles.tipsText}>
                  Your interview has been scheduled. Check your messages for details about date, time, and location.
                </Text>
              </View>
            )}

            {application.status === 'Accepted' && (
              <View style={[styles.tipsContainer, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[styles.tipsTitle, { color: '#34C759' }]}>🎉 Congratulations!</Text>
                <Text style={styles.tipsText}>
                  Your application has been accepted! The employer will contact you to discuss next steps and contract details.
                </Text>
              </View>
            )}

            {/* Job Status Warning */}
            {application.job_status !== 'Open' && (
              <View style={styles.warningContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF9500" />
                <Text style={styles.warningText}>
                  This position has been {application.job_status.toLowerCase()}
                </Text>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          {canWithdraw && (
            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.withdrawButton} 
                onPress={onWithdraw}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={20} color="#FF3B30" />
                <Text style={styles.withdrawButtonText}>Withdraw Application</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const InfoItem = ({ 
  icon, 
  label, 
  value 
}: { 
  icon: string; 
  label: string; 
  value: string;
}) => (
  <View style={styles.infoItem}>
    <Ionicons name={icon as any} size={18} color="#666" />
    <View style={styles.infoItemContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 13,
    color: '#666',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  parentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  parentName: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoItemContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
  },
  coverLetterContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  coverLetter: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1A1C1E',
  },
  feedbackContainer: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
  },
  feedbackText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
  },
  tipsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9500',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: '#fff',
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
  },
});
