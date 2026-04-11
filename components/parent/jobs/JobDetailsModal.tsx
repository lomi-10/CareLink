// components/parent/jobs/JobDetailsModal.tsx

import type { JobPost } from '@/hooks/parent';
import { useJobReferences } from '@/hooks/shared';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { JobStatusBadge } from './JobStatusBadge';

interface JobDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  job: JobPost | null;
}

export function JobDetailsModal({ visible, onClose, job }: JobDetailsModalProps) {
  // Fetch references to map language IDs to readable text!
  const { languages } = useJobReferences();

  if (!job) return null;

  const displayCategory = job.custom_category || job.category_name;

  // Translate Language ID to actual Name
  const displayLanguage = languages.find(l => l.language_id.toString() === job.preferred_language_id?.toString())?.language_name || 'Any';
  const displayReligion = job.preferred_religion || 'Any';

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const isTrue = (val: any) => val === 1 || val === '1' || val === true;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}> 
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          {/* --- HEADER --- */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {job.title || 'Untitled Job'}
              </Text>
              
              <View style={styles.badgeRow}>
                <JobStatusBadge status={job.status} />
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

            {/* --- LOCATION SECTION --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.detailsList}>
                <View style={styles.detailItem}>
                  <Ionicons name="location" size={18} color="#1D4ED8" />
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
                {job.work_hours && (
                  <View style={styles.detailItem}>
                    <Ionicons name="alarm-outline" size={18} color="#4B5563" />
                    <View>
                      <Text style={styles.detailLabel}>Working Hours</Text>
                      <Text style={styles.detailValue}>{job.work_hours}</Text>
                    </View>
                  </View>
                )}
                {job.days_off && (
                  <View style={styles.detailItem}>
                    <Ionicons name="cafe-outline" size={18} color="#4B5563" />
                    <View>
                      <Text style={styles.detailLabel}>Days Off</Text>
                      <Text style={styles.detailValue}>
                        {(() => {
                          try {
                            if (!job.days_off) return 'Not specified';
                            const parsed = JSON.parse(job.days_off);
                            return Array.isArray(parsed) ? parsed.join(', ') : 'Not specified';
                          } catch (e) {
                            return 'Not specified';
                          }
                        })()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* --- JOB DESCRIPTION --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Description</Text>
              <Text style={styles.bodyText}>
                {job.description || "No specific description provided for this job."}
              </Text>
            </View>

            {/* --- SKILLS & PREFERENCES --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Required Skills & Preferences</Text>
              
              <View style={styles.preferencesGrid}>
                {job.preferred_religion && (
                  <View style={styles.prefItem}>
                    <Ionicons name="heart-outline" size={16} color="#4B5563" />
                    <Text style={styles.prefText}>Religion: {displayReligion}</Text>
                  </View>
                )}
                <View style={styles.prefItem}>
                  <Ionicons name="language-outline" size={16} color="#4B5563" />
                  {/* Fixed language display! */}
                  <Text style={styles.prefText}>Language: {displayLanguage}</Text>
                </View>
              </View>

              <View style={styles.skillsContainer}>
                {(job as any).skill_names && (
                  <View style={styles.skillGroup}>
                    <Text style={styles.subLabel}>Key Skills:</Text>
                    <View style={styles.skillBadgeRow}>
                      {(job as any).skill_names.split(',').map((skill: string, i: number) => (
                        <View key={i} style={styles.skillBadge}>
                          <Text style={styles.skillBadgeText}>{skill.trim()}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {(job as any).custom_skills && (
                  <View style={styles.skillGroup}>
                    <Text style={styles.subLabel}>Additional Requirements:</Text>
                    <Text style={styles.customSkillsText}>{(job as any).custom_skills}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* --- REQUIREMENTS SECTION --- */}
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
                {isTrue(job.provides_sss) && (
                  <View style={styles.perkBadge}><Ionicons name="checkmark-circle" size={14} color="#059669" /><Text style={styles.perkText}>SSS Contribution</Text></View>
                )}
                {isTrue(job.provides_philhealth) && (
                  <View style={styles.perkBadge}><Ionicons name="checkmark-circle" size={14} color="#059669" /><Text style={styles.perkText}>PhilHealth</Text></View>
                )}
                {isTrue(job.provides_pagibig) && (
                  <View style={styles.perkBadge}><Ionicons name="checkmark-circle" size={14} color="#059669" /><Text style={styles.perkText}>Pag-IBIG</Text></View>
                )}
                {Number(job.vacation_days) > 0 && (
                  <View style={styles.perkBadge}><Ionicons name="airplane" size={14} color="#1D4ED8" /><Text style={styles.perkText}>{job.vacation_days} Paid Leaves</Text></View>
                )}
                {Number(job.sick_days) > 0 && (
                  <View style={styles.perkBadge}><Ionicons name="medkit" size={14} color="#EF4444" /><Text style={styles.perkText}>{job.sick_days} Sick Leaves</Text></View>
                )}
              </View>

              {job.benefits ? (
                <View style={styles.otherBenefitsBox}>
                  <Text style={styles.subLabel}>Other Benefits:</Text>
                  <Text style={styles.bodyText}>{job.benefits}</Text>
                </View>
              ) : null}
            </View>

            {/* --- CONTRACT DETAILS --- */}
            {(job.contract_duration || job.probation_period) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contract Terms</Text>
                <View style={styles.contractGrid}>
                  <View style={styles.contractItem}>
                    <Text style={styles.contractLabel}>Duration</Text>
                    <Text style={styles.contractValue}>{job.contract_duration || 'Not specified'}</Text>
                  </View>
                  <View style={styles.contractItem}>
                    <Text style={styles.contractLabel}>Probation</Text>
                    <Text style={styles.contractValue}>{job.probation_period || 'None'}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* --- METADATA --- */}
            <View style={styles.metadataContainer}>
              <Text style={styles.metadataText}>
                <Text style={{ fontWeight: '600' }}>Posted:</Text> {formatDate(job.posted_at)}
              </Text>
              {job.filled_at && (
                <Text style={styles.metadataText}>
                  <Text style={{ fontWeight: '600' }}>Filled:</Text> {formatDate(job.filled_at)}
                </Text>
              )}
            </View>
          </ScrollView>

          {/* --- FOOTER --- */}
          <View style={styles.footer}>
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
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12, letterSpacing: -0.5 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
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
  preferencesGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  prefItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  prefText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  skillsContainer: { gap: 16 },
  skillGroup: { gap: 8 },
  subLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  skillBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  skillBadgeText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  customSkillsText: { fontSize: 14, color: '#4B5563', fontStyle: 'italic', lineHeight: 20 },
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
  perksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  perkBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FEF3C7' },
  perkText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  otherBenefitsBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12 },
  contractGrid: { flexDirection: 'row', gap: 12 },
  contractItem: { flex: 1, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, alignItems: 'center' },
  contractLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 },
  contractValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  metadataContainer: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingVertical: 24, marginBottom: 20 },
  metadataText: { fontSize: 13, color: '#9CA3AF', marginBottom: 4 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff' },
  doneBtn: { backgroundColor: '#1F2937', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});