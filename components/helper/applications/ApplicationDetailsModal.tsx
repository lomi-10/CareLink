// components/helper/applications/ApplicationDetailsModal.tsx

import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Application } from '@/hooks/helper';

interface ApplicationDetailsModalProps {
  visible: boolean;
  application: Application | null;
  onWithdraw: () => void;
  onClose: () => void;
}

export default function ApplicationDetailsModal({ visible, application, onWithdraw, onClose }: ApplicationDetailsModalProps) {
  if (!application) return null;

  const getStatusConfig = () => {
    switch (application.status) {
      case 'Pending': return { color: '#D97706', bg: '#FEF3C7', icon: 'time' as const, title: 'Application Submitted', subtitle: 'Waiting for the employer to review your profile.' };
      case 'Reviewed': return { color: '#2563EB', bg: '#DBEAFE', icon: 'eye' as const, title: 'Under Review', subtitle: 'The employer has viewed your application.' };
      case 'Shortlisted': return { color: '#7C3AED', bg: '#F3E8FF', icon: 'star' as const, title: 'You are Shortlisted!', subtitle: 'You are among the top candidates. They may contact you soon.' };
      case 'Interview Scheduled': return { color: '#059669', bg: '#D1FAE5', icon: 'calendar' as const, title: 'Interview Scheduled', subtitle: 'Check your messages for interview details.' };
      case 'Accepted': return { color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle' as const, title: 'Congratulations!', subtitle: 'You have been hired for this position.' };
      case 'Rejected': return { color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' as const, title: 'Application Declined', subtitle: 'The employer has decided to move forward with other candidates.' };
      case 'Withdrawn': return { color: '#6B7280', bg: '#F3F4F6', icon: 'arrow-undo' as const, title: 'Application Withdrawn', subtitle: 'You withdrew this application.' };
      default: return { color: '#6B7280', bg: '#F3F4F6', icon: 'information-circle' as const, title: application.status, subtitle: '' };
    }
  };

  const statusConfig = getStatusConfig();
  const canWithdraw = ['Pending', 'Reviewed', 'Shortlisted'].includes(application.status);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          {/* --- HEADER --- */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.modalTitle} numberOfLines={2}>{application.job_title}</Text>
              <Text style={styles.employerName}>{application.parent_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* --- STATUS BANNER --- */}
            <View style={[styles.statusBanner, { backgroundColor: statusConfig.bg, borderColor: statusConfig.color + '40' }]}>
              <View style={[styles.statusIconBox, { backgroundColor: statusConfig.color + '20' }]}>
                <Ionicons name={statusConfig.icon} size={24} color={statusConfig.color} />
              </View>
              <View style={styles.statusBannerText}>
                <Text style={[styles.statusBannerTitle, { color: statusConfig.color }]}>{statusConfig.title}</Text>
                <Text style={[styles.statusBannerSubtitle, { color: statusConfig.color }]}>{statusConfig.subtitle}</Text>
              </View>
            </View>
            
            {/* --- QUICK INFO GRID --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Application Details</Text>
              <View style={styles.detailsList}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={18} color="#1D4ED8" />
                  <View>
                    <Text style={styles.detailLabel}>Applied On</Text>
                    <Text style={styles.detailValue}>{formatDate(application.applied_at)}</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="cash-outline" size={18} color="#1D4ED8" />
                  <View>
                    <Text style={styles.detailLabel}>Offered Salary</Text>
                    <Text style={styles.detailValue}>₱{Number(application.salary_offered || 0).toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* --- COVER LETTER SECTION --- */}
            {application.cover_letter ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Pitch / Cover Letter</Text>
                <View style={styles.coverLetterBox}>
                  <Text style={styles.coverLetterText}>{application.cover_letter}</Text>
                </View>
              </View>
            ) : null}

            {/* --- EMPLOYER FEEDBACK --- */}
            {application.message_from_parent ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Message from Employer</Text>
                <View style={styles.feedbackBox}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#059669" />
                  <Text style={styles.feedbackText}>{application.message_from_parent}</Text>
                </View>
              </View>
            ) : null}

          </ScrollView>

          {/* --- FOOTER ACTIONS --- */}
          <View style={styles.footer}>
            {canWithdraw && (
              <TouchableOpacity style={styles.withdrawBtn} onPress={onWithdraw}>
                <Text style={styles.withdrawBtnText}>Withdraw Application</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Close Details</Text>
            </TouchableOpacity>
          </View>
          
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContainer: { width: '100%', maxWidth: 650, maxHeight: '90%', backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#fff' },
  headerTitleContainer: { flex: 1, paddingRight: 16 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4, letterSpacing: -0.5 },
  employerName: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  closeBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 32, gap: 16 },
  statusIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  statusBannerText: { flex: 1 },
  statusBannerTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  statusBannerSubtitle: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8, letterSpacing: -0.3 },
  detailsList: { gap: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  coverLetterBox: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  coverLetterText: { fontSize: 15, lineHeight: 24, color: '#374151', fontStyle: 'italic' },
  feedbackBox: { flexDirection: 'row', backgroundColor: '#ECFDF5', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#A7F3D0', gap: 12 },
  feedbackText: { flex: 1, fontSize: 15, lineHeight: 24, color: '#065F46', fontWeight: '500' },
  footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff', gap: 12 },
  withdrawBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', alignItems: 'center' },
  withdrawBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
  doneBtn: { flex: 1, backgroundColor: '#1F2937', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});