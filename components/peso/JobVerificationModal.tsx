// components/peso/JobVerificationModal.tsx
import React, { useEffect, useState } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API_URL from '@/constants/api';
import { useJobReferences } from '@/hooks/shared';

// Import your custom modals!
import { ConfirmationModal } from '../shared/ConfirmationModal';
import { NotificationModal } from '../shared/NotificationModal';

interface JobVerificationModalProps {
  visible: boolean;
  jobId: number | null;
  onClose: () => void;
  onStatusChanged: () => void;
}

export function JobVerificationModal({ visible, jobId, onClose, onStatusChanged }: JobVerificationModalProps) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { languages } = useJobReferences();

  // Custom Modal States
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'Open' | 'Rejected' | null>(null);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as 'success'|'error' });

  useEffect(() => {
    if (visible && jobId) {
      fetchJobDetails();
    } else {
      setJob(null);
    }
  }, [visible, jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/peso/get_job_details.php?job_post_id=${jobId}`);
      const data = await res.json();
      if (data.success) setJob(data.data);
    } catch (error) {
      console.error("Error fetching details", error);
    } finally {
      setLoading(false);
    }
  };

  const promptConfirmation = (status: 'Open' | 'Rejected') => {
    setConfirmAction(status);
    setConfirmVisible(true);
  };

  const executeStatusUpdate = async () => {
    if (!confirmAction) return;
    setConfirmVisible(false);
    
    try {
      setProcessing(true);
      const res = await fetch(`${API_URL}/peso/update_job_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: jobId, status: confirmAction })
      });
      const data = await res.json();
      
      if (data.success) {
        setNotification({ 
          visible: true, 
          message: `Job post has been successfully ${confirmAction === 'Open' ? 'approved' : 'rejected'}.`, 
          type: 'success' 
        });
        onStatusChanged(); 
        setTimeout(() => onClose(), 2000); // Close after showing success
      } else {
        setNotification({ visible: true, message: data.message, type: 'error' });
      }
    } catch (error) {
      setNotification({ visible: true, message: "Network connection failed.", type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const displayLanguage = languages.find(l => l.language_id.toString() === job?.preferred_language_id?.toString())?.language_name || 'Any';
  const displayReligion = job?.preferred_religion || 'Any';
  const displayCategory = job?.custom_category || job?.category_name;
  const isTrue = (val: any) => val === 1 || val === '1' || val === true;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          {loading || !job ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#0284C7" />
            </View>
          ) : (
            <>
              {/* --- HEADER --- */}
              <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {job.title || 'Untitled Job'}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusBadge, job.status === 'Pending' ? styles.bgPending : job.status === 'Open' ? styles.bgSuccess : styles.bgError]}>
                      <Text style={styles.statusText}>{job.status === 'Open' ? 'Approved' : job.status}</Text>
                    </View>
                    {displayCategory && (
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryText}>{displayCategory}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* --- EMPLOYER SECTION --- */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Employer Information</Text>
                  <View style={styles.detailsList}>
                    <View style={styles.detailItem}>
                      <Ionicons name="person-circle" size={18} color="#0284C7" />
                      <View>
                        <Text style={styles.detailLabel}>Parent / Employer Name</Text>
                        <Text style={styles.detailValue}>{job.parent_name}</Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="location" size={18} color="#0284C7" />
                      <View>
                        <Text style={styles.detailLabel}>Address</Text>
                        <Text style={styles.detailValue}>{job.barangay} {job.municipality}, {job.province}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                {/* --- CORE DETAILS SECTION --- */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Role & Schedule</Text>
                  <View style={styles.detailsList}>
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={18} color="#4B5563" />
                      <View>
                        <Text style={styles.detailLabel}>Employment Type</Text>
                        <Text style={styles.detailValue}>{job.employment_type}</Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={18} color="#4B5563" />
                      <View>
                        <Text style={styles.detailLabel}>Work Schedule</Text>
                        <Text style={styles.detailValue}>{job.work_schedule}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* --- JOB DESCRIPTION --- */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Job Description</Text>
                  <Text style={styles.bodyText}>
                    {job.description || "No specific description provided for this job."}
                  </Text>
                </View>

                {/* --- REQUIREMENTS SECTION --- */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Candidate Requirements</Text>
                  <View style={styles.listContainer}>
                    <View style={styles.requirementRow}>
                      <View style={styles.reqIconBox}><Ionicons name="language" size={18} color="#1D4ED8" /></View>
                      <View>
                        <Text style={styles.reqLabel}>Preferred Language</Text>
                        <Text style={styles.reqValue}>{displayLanguage}</Text>
                      </View>
                    </View>
                    <View style={styles.requirementRow}>
                      <View style={styles.reqIconBox}><Ionicons name="person-outline" size={18} color="#1D4ED8" /></View>
                      <View>
                        <Text style={styles.reqLabel}>Age Bracket</Text>
                        <Text style={styles.reqValue}>
                          {job.min_age && job.max_age ? `${job.min_age} - ${job.max_age} years old` : 'Any age'}
                        </Text>
                      </View>
                    </View>
                    {isTrue(job.require_police_clearance) && (
                      <View style={styles.verifiedReq}>
                        <Ionicons name="shield-checkmark" size={18} color="#059669" />
                        <Text style={styles.verifiedReqText}>Police Clearance Required</Text>
                      </View>
                    )}
                    {isTrue(job.prefer_tesda_nc2) && (
                      <View style={[styles.verifiedReq, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
                        <Ionicons name="school" size={18} color="#1D4ED8" />
                        <Text style={[styles.verifiedReqText, { color: '#1D4ED8' }]}>TESDA NC II Preferred</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* --- BENEFITS & PERKS SECTION --- */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Compensation</Text>
                  <View style={styles.salaryHighlight}>
                    <Text style={styles.salaryLabel}>Offered Salary</Text>
                    <Text style={styles.salaryValue}>₱{Number(job.salary_offered).toLocaleString()}</Text>
                    <Text style={styles.salaryPeriod}>per {job.salary_period}</Text>
                  </View>
                </View>
              </ScrollView>

              {/* --- FOOTER ACTIONS --- */}
              <View style={styles.footer}>
                {!job || job.status !== 'Pending' ? (
                  <TouchableOpacity style={styles.closeFullBtn} onPress={onClose}>
                    <Text style={styles.closeFullBtnText}>Close Details</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn, processing && styles.disabledBtn]} 
                      onPress={() => promptConfirmation('Rejected')}
                      disabled={processing}
                    >
                      <Ionicons name="close-circle" size={20} color="#fff" />
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.approveBtn, processing && styles.disabledBtn]} 
                      onPress={() => promptConfirmation('Open')}
                      disabled={processing}
                    >
                      {processing ? <ActivityIndicator color="#fff" /> : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.btnText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

        </View>
      </View>

      {/* Reusable Modals integrated perfectly */}
      <ConfirmationModal
        visible={confirmVisible}
        title={confirmAction === 'Open' ? "Approve Job Post?" : "Reject Job Post?"}
        message={confirmAction === 'Open' ? "This will make the job visible to all verified helpers." : "This will send the post back to the parent."}
        confirmText={confirmAction === 'Open' ? "Yes, Approve" : "Yes, Reject"}
        type={confirmAction === 'Open' ? "success" : "danger"}
        onConfirm={executeStatusUpdate}
        onCancel={() => setConfirmVisible(false)}
      />

      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, visible: false })}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContainer: { width: '100%', maxWidth: 650, maxHeight: '90%', backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#fff' },
  headerTitleContainer: { flex: 1, paddingRight: 16 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12, letterSpacing: -0.5 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bgPending: { backgroundColor: '#FF9500' },
  bgSuccess: { backgroundColor: '#34C759' },
  bgError: { backgroundColor: '#EF4444' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  categoryPill: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#DBEAFE' },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#1D4ED8' },
  closeBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8, letterSpacing: -0.3 },
  bodyText: { fontSize: 15, lineHeight: 24, color: '#4B5563' },
  detailsList: { gap: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  listContainer: { gap: 12 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12 },
  reqIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  reqLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  reqValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  verifiedReq: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#D1FAE5' },
  verifiedReqText: { fontSize: 14, fontWeight: '700', color: '#059669' },
  salaryHighlight: { backgroundColor: '#1D4ED8', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  salaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  salaryValue: { color: '#fff', fontSize: 28, fontWeight: '800' },
  salaryPeriod: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  rejectBtn: { backgroundColor: '#EF4444' },
  approveBtn: { backgroundColor: '#059669' },
  disabledBtn: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  closeFullBtn: { backgroundColor: '#1F2937', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeFullBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' }
});