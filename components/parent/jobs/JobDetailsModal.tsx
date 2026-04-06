// components/parent/jobs/JobDetailsModal.tsx

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JobStatusBadge } from './JobStatusBadge';
import type { JobPost } from '@/hooks/useParentJobs';

interface JobDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  job: JobPost | null;
}

export function JobDetailsModal({ visible, onClose, job }: JobDetailsModalProps) {
  if (!job) return null;

  const displayCategory = job.custom_category || job.category_name;

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Helper to safely check database tinyint (1 or 0)
  const isTrue = (val: any) => val === 1 || val === '1' || val === true;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    > 
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          {/* --- HEADER --- */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {job.title || job.custom_job_title || 'Untitled Job'}
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
            
            {/* --- QUICK INFO GRID --- */}
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <Ionicons name="cash-outline" size={20} color="#1D4ED8" />
                <Text style={styles.infoBoxLabel}>Salary</Text>
                <Text style={styles.infoBoxValue}>₱{Number(job.salary_offered).toLocaleString()} / {job.salary_period}</Text>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="briefcase-outline" size={20} color="#1D4ED8" />
                <Text style={styles.infoBoxLabel}>Type & Schedule</Text>
                <Text style={styles.infoBoxValue}>{job.employment_type}</Text>
                <Text style={styles.infoBoxSubValue}>{job.work_schedule}</Text>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="location-outline" size={20} color="#1D4ED8" />
                <Text style={styles.infoBoxLabel}>Location</Text>
                <Text style={styles.infoBoxValue}>{job.municipality}</Text>
                <Text style={styles.infoBoxSubValue}>{job.province}</Text>
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
            {(job.min_age || job.max_age || job.min_experience_years || isTrue(job.require_police_clearance) || isTrue(job.prefer_tesda_nc2)) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Candidate Requirements</Text>
                <View style={styles.listContainer}>
                  
                  {job.min_age && job.max_age ? (
                    <View style={styles.listItem}>
                      <Ionicons name="person-outline" size={16} color="#4B5563" />
                      <Text style={styles.bodyText}>Aged between {job.min_age} and {job.max_age} years old</Text>
                    </View>
                  ) : null}

                  {job.min_experience_years ? (
                    <View style={styles.listItem}>
                      <Ionicons name="star-outline" size={16} color="#4B5563" />
                      <Text style={styles.bodyText}>At least {job.min_experience_years} year(s) of experience</Text>
                    </View>
                  ) : null}

                  {isTrue(job.require_police_clearance) && (
                    <View style={styles.listItem}>
                      <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
                      <Text style={[styles.bodyText, { color: '#059669', fontWeight: '500' }]}>Police Clearance Required</Text>
                    </View>
                  )}

                  {isTrue(job.prefer_tesda_nc2) && (
                    <View style={styles.listItem}>
                      <Ionicons name="school-outline" size={16} color="#007AFF" />
                      <Text style={[styles.bodyText, { color: '#007AFF', fontWeight: '500' }]}>TESDA NC II Certification Preferred</Text>
                    </View>
                  )}

                </View>
              </View>
            )}

            {/* --- BENEFITS & PERKS SECTION --- */}
            {(job.benefits || isTrue(job.provides_meals) || isTrue(job.provides_accommodation) || isTrue(job.provides_sss) || isTrue(job.provides_philhealth) || isTrue(job.provides_pagibig) || Number(job.vacation_days) > 0 || Number(job.sick_days) > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Benefits & Perks</Text>
                
                {job.benefits ? (
                  <Text style={[styles.bodyText, { marginBottom: 12, fontStyle: 'italic' }]}>
                    "{job.benefits}"
                  </Text>
                ) : null}

                <View style={styles.perksGrid}>
                  {isTrue(job.provides_meals) && (
                    <View style={styles.perkBadge}><Ionicons name="restaurant" size={14} color="#D97706" /><Text style={styles.perkText}>Free Meals</Text></View>
                  )}
                  {isTrue(job.provides_accommodation) && (
                    <View style={styles.perkBadge}><Ionicons name="home" size={14} color="#D97706" /><Text style={styles.perkText}>Accommodation</Text></View>
                  )}
                  {isTrue(job.provides_sss) && (
                    <View style={styles.perkBadge}><Ionicons name="checkmark-circle" size={14} color="#059669" /><Text style={styles.perkText}>SSS Provided</Text></View>
                  )}
                  {isTrue(job.provides_philhealth) && (
                    <View style={styles.perkBadge}><Ionicons name="checkmark-circle" size={14} color="#059669" /><Text style={styles.perkText}>PhilHealth Provided</Text></View>
                  )}
                  {isTrue(job.provides_pagibig) && (
                    <View style={styles.perkBadge}><Ionicons name="checkmark-circle" size={14} color="#059669" /><Text style={styles.perkText}>Pag-IBIG Provided</Text></View>
                  )}
                  {Number(job.vacation_days) > 0 && (
                    <View style={styles.perkBadge}><Ionicons name="airplane" size={14} color="#1D4ED8" /><Text style={styles.perkText}>{job.vacation_days} Vacation Days</Text></View>
                  )}
                  {Number(job.sick_days) > 0 && (
                    <View style={styles.perkBadge}><Ionicons name="medkit" size={14} color="#EF4444" /><Text style={styles.perkText}>{job.sick_days} Sick Days</Text></View>
                  )}
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 650,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  headerTitleContainer: { flex: 1, paddingRight: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryPill: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#DBEAFE' },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#1D4ED8' },
  closeBtn: { padding: 4, backgroundColor: '#F3F4F6', borderRadius: 20 },
  scrollContent: { padding: 24 },
  
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 },
  infoBox: { flex: 1, minWidth: 150, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  infoBoxLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginTop: 8, marginBottom: 4 },
  infoBoxValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  infoBoxSubValue: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },
  bodyText: { fontSize: 15, lineHeight: 24, color: '#4B5563' },
  
  listContainer: { gap: 10 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  perksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  perkBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  perkText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  
  metadataContainer: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 8, marginTop: 8, marginBottom: 24 },
  metadataText: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff', alignItems: 'flex-end' },
  doneBtn: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});