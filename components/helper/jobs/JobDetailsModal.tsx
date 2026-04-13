// components/helper/jobs/JobDetailsModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ParentProfileModal } from './ParentProfileModal'; 

interface JobDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  job: any; 
}

export function JobDetailsModal({ visible, onClose, onApply, job }: JobDetailsModalProps) {
  const [showParentProfile, setShowParentProfile] = useState(false);

  if (!job) return null;

  const displayCategory = job.custom_category || job.category_name || (job.categories && job.categories[0]) || 'General';
  const isTrue = (val: any) => val === 1 || val === '1' || val === true;

  const BASE_API_URL = 'http://localhost/carelink_api';
  const getProfileUrl = (filename: string | null | undefined) => {
    if (!filename) return null;
    if (filename.includes('http')) return filename;
    return `${BASE_API_URL}/uploads/profiles/${filename}`;
  };

  // NEW: Safely extract skills whether it's an array or a comma-separated string
  const displaySkills = Array.isArray(job.skills) && job.skills.length > 0 
    ? job.skills 
    : (typeof job.skill_names === 'string' && job.skill_names.trim() !== ''
        ? job.skill_names.split(',').map((s: string) => s.trim()) 
        : []);

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.modalContainer, styles.responsiveModal]}>
            
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.modalTitle} numberOfLines={2}>{job.title}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.categoryPill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                    <Ionicons name="shield-checkmark" size={14} color="#059669" />
                    <Text style={[styles.categoryText, { color: '#059669' }]}>PESO Verified</Text>
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
              
              {/* --- CLICKABLE EMPLOYER MINI PROFILE --- */}
              <TouchableOpacity style={styles.employerSection} onPress={() => setShowParentProfile(true)} activeOpacity={0.7}>
                {job.parent_profile_image ? (
                  <Image source={{ uri: getProfileUrl(job.parent_profile_image) as string }} style={styles.avatarPlaceholder} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={24} color="#007AFF" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.employerName}>{job.parent_name || 'Verified Employer'}</Text>
                  <Text style={styles.locationText}>
                    <Ionicons name="location" size={12} color="#6B7280" /> {job.parent_municipality || job.municipality}, {job.parent_province || job.province}
                    {job.distance ? ` • ${job.distance} km away` : ''}
                  </Text>
                </View>
                <View style={styles.viewProfileArrow}>
                  <Text style={styles.viewProfileText}>View Profile</Text>
                  <Ionicons name="chevron-forward" size={16} color="#1D4ED8" />
                </View>
              </TouchableOpacity>

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
                  {job.work_hours && (
                    <View style={styles.detailItem}>
                      <Ionicons name="alarm-outline" size={18} color="#4B5563" />
                      <View>
                        <Text style={styles.detailLabel}>Working Hours</Text>
                        <Text style={styles.detailValue}>{job.work_hours}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Job Description</Text>
                <Text style={styles.bodyText}>
                  {job.description || "No specific description provided for this job."}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Required Skills & Preferences</Text>
                <View style={styles.skillsContainer}>
                  {/* NEW: Using displaySkills logic */}
                  {displaySkills.length > 0 ? (
                    <View style={styles.skillGroup}>
                      <Text style={styles.subLabel}>Key Skills:</Text>
                      <View style={styles.skillBadgeRow}>
                        {displaySkills.map((skill: string, i: number) => (
                          <View key={i} style={styles.skillBadge}>
                            <Text style={styles.skillBadgeText}>{skill}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.bodyText}>No specific skills required.</Text>
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Candidate Requirements</Text>
                <View style={styles.listContainer}>
                  <View style={styles.requirementRow}>
                    <View style={styles.reqIconBox}><Ionicons name="person-outline" size={18} color="#1D4ED8" /></View>
                    <View>
                      <Text style={styles.reqLabel}>Age Bracket</Text>
                      <Text style={styles.reqValue}>
                        {job.min_age && job.max_age ? `${job.min_age} - ${job.max_age} years old` : 'Any age'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requirementRow}>
                    <View style={styles.reqIconBox}><Ionicons name="star-outline" size={18} color="#1D4ED8" /></View>
                    <View>
                      <Text style={styles.reqLabel}>Experience</Text>
                      <Text style={styles.reqValue}>
                        {job.min_experience_years ? `At least ${job.min_experience_years} year(s)` : 'No minimum experience'}
                      </Text>
                    </View>
                  </View>
                  {isTrue(job.require_police_clearance) && (
                    <View style={styles.verifiedReq}>
                      <Ionicons name="shield-checkmark" size={18} color="#059669" />
                      <Text style={styles.verifiedReqText}>Police Clearance Required</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Compensation & Benefits</Text>
                <View style={styles.salaryHighlight}>
                  <Text style={styles.salaryLabel}>Offered Salary</Text>
                  <Text style={styles.salaryValue}>₱{Number(job.salary_offered).toLocaleString()}</Text>
                  <Text style={styles.salaryPeriod}>per {job.salary_period === 'Monthly' ? 'Month' : 'Day'}</Text>
                </View>
                <View style={styles.perksGrid}>
                  {isTrue(job.provides_meals) && (
                    <View style={styles.perkBadge}><Ionicons name="restaurant" size={14} color="#D97706" /><Text style={styles.perkText}>Free Meals</Text></View>
                  )}
                  {isTrue(job.provides_accommodation) && (
                    <View style={styles.perkBadge}><Ionicons name="home" size={14} color="#D97706" /><Text style={styles.perkText}>Accommodation</Text></View>
                  )}
                </View>
              </View>

            </ScrollView>

            <SafeAreaView style={styles.footer}>
              <TouchableOpacity style={styles.applyBtn} onPress={onApply} activeOpacity={0.8}>
                <Ionicons name="paper-plane" size={20} color="#fff" />
                <Text style={styles.applyBtnText}>Apply for this Position</Text>
              </TouchableOpacity>
            </SafeAreaView>

          </View>
        </View>
      </Modal>

      <ParentProfileModal 
        visible={showParentProfile} 
        onClose={() => setShowParentProfile(false)} 
        parentData={job} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContainer: { width: '100%', maxWidth: 650, maxHeight: '90%', backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  responsiveModal: { width: Platform.OS === 'web' ? '85%' : '100%' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#fff' },
  headerTitleContainer: { flex: 1, paddingRight: 16 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12, letterSpacing: -0.5 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryPill: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#DBEAFE' },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#1D4ED8' },
  closeBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },
  
  employerSection: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32, backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#DBEAFE' },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  employerName: { fontSize: 17, fontWeight: '800', color: '#1E3A8A', marginBottom: 2 },
  locationText: { fontSize: 13, color: '#3B82F6', fontWeight: '500' },
  viewProfileArrow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  viewProfileText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8', marginRight: 4 },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8, letterSpacing: -0.3 },
  bodyText: { fontSize: 15, lineHeight: 24, color: '#4B5563' },
  
  detailsList: { gap: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  
  skillsContainer: { gap: 16 },
  skillGroup: { gap: 8 },
  subLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  skillBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  skillBadgeText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },

  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 8 },
  reqIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  reqLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  reqValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  verifiedReq: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#D1FAE5', marginBottom: 8 },
  verifiedReqText: { fontSize: 14, fontWeight: '700', color: '#059669' },

  salaryHighlight: { backgroundColor: '#1D4ED8', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  salaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  salaryValue: { color: '#fff', fontSize: 28, fontWeight: '800' },
  salaryPeriod: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  perksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  perkBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FEF3C7' },
  perkText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff' },
  applyBtn: { backgroundColor: '#1D4ED8', paddingVertical: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  listContainer: { gap: 4 },
});