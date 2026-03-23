// components/helper/jobs/JobDetailsModal.tsx
// Modal to view complete job posting details

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
import { JobPost } from '@/hooks/useBrowseJobs';

interface JobDetailsModalProps {
  visible: boolean;
  job: JobPost | null;
  onApply: () => void;
  onClose: () => void;
}

export default function JobDetailsModal({
  visible,
  job,
  onApply,
  onClose,
}: JobDetailsModalProps) {
  if (!job) return null;

  const getSalaryDisplay = () => {
    if (job.salary_period === 'Daily') {
      return `₱${job.salary_offered.toLocaleString()}/day`;
    }
    return `₱${job.salary_offered.toLocaleString()}/month`;
  };

  const InfoRow = ({ 
    icon, 
    label, 
    value 
  }: { 
    icon: string; 
    label: string; 
    value: string | number | boolean | undefined;
  }) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={20} color="#666" />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>
          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value || 'Not specified')}
        </Text>
      </View>
    </View>
  );

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
            <Text style={styles.headerTitle}>Job Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#1A1C1E" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Job Header */}
            <View style={styles.jobHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="briefcase" size={48} color="#007AFF" />
              </View>
              <Text style={styles.jobTitle}>{job.title}</Text>
              
              {/* Parent Info */}
              <View style={styles.parentInfo}>
                <Text style={styles.parentName}>{job.parent_name}</Text>
                {job.parent_verified && (
                  <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                )}
              </View>

              {/* Location */}
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.locationText}>
                  {job.municipality}, {job.province}
                </Text>
                {job.distance && (
                  <Text style={styles.distanceText}>
                    • {job.distance.toFixed(1)} km away
                  </Text>
                )}
              </View>

              {/* Match Score */}
              {job.match_score && job.match_score >= 70 && (
                <View style={styles.matchContainer}>
                  <Text style={styles.matchScore}>🎯 {job.match_score}% Match</Text>
                  {job.match_reasons && job.match_reasons.map((reason, idx) => (
                    <View key={idx} style={styles.matchReasonRow}>
                      <Ionicons name="checkmark" size={16} color="#34C759" />
                      <Text style={styles.matchReasonText}>{reason}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Compensation */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Compensation</Text>
              <Text style={styles.salaryLarge}>{getSalaryDisplay()}</Text>
              <InfoRow icon="time-outline" label="Work Schedule" value={job.work_schedule} />
              <InfoRow icon="home-outline" label="Employment Type" value={job.employment_type} />
            </View>

            {/* Job Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Description</Text>
              <Text style={styles.description}>{job.description}</Text>
            </View>

            {/* Requirements */}
            {(job.min_age || job.min_experience_years || job.require_police_clearance || job.prefer_tesda_nc2) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Requirements</Text>
                {job.min_age && <InfoRow icon="person-outline" label="Age Range" value={`${job.min_age}-${job.max_age || 'Any'} years`} />}
                {job.min_experience_years && <InfoRow icon="briefcase-outline" label="Experience" value={`${job.min_experience_years}+ years`} />}
                <InfoRow icon="document-text-outline" label="Police Clearance" value={job.require_police_clearance} />
                <InfoRow icon="school-outline" label="TESDA NC II" value={job.prefer_tesda_nc2} />
              </View>
            )}

            {/* Benefits */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Benefits</Text>
              <View style={styles.benefitsGrid}>
                {job.provides_meals && <BenefitChip icon="restaurant" label="Meals Provided" />}
                {job.provides_accommodation && <BenefitChip icon="home" label="Accommodation" />}
                {job.provides_sss && <BenefitChip icon="shield-checkmark" label="SSS" />}
                {job.provides_philhealth && <BenefitChip icon="medical" label="PhilHealth" />}
                {job.provides_pagibig && <BenefitChip icon="business" label="Pag-IBIG" />}
                {job.vacation_days && job.vacation_days > 0 && (
                  <BenefitChip icon="sunny" label={`${job.vacation_days} Vacation Days`} />
                )}
                {job.sick_days && job.sick_days > 0 && (
                  <BenefitChip icon="medkit" label={`${job.sick_days} Sick Days`} />
                )}
              </View>
            </View>

            {/* Work Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Work Details</Text>
              {job.start_date && <InfoRow icon="calendar-outline" label="Start Date" value={job.start_date} />}
              {job.work_hours && <InfoRow icon="time-outline" label="Work Hours" value={job.work_hours} />}
              {job.days_off && job.days_off.length > 0 && (
                <InfoRow icon="calendar-clear-outline" label="Days Off" value={job.days_off.join(', ')} />
              )}
              {job.contract_duration && <InfoRow icon="document-outline" label="Contract Duration" value={job.contract_duration} />}
              {job.probation_period && <InfoRow icon="timer-outline" label="Probation Period" value={job.probation_period} />}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.postedText}>Posted {job.posted_at}</Text>
            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={onApply}
              activeOpacity={0.7}
            >
              <Text style={styles.applyButtonText}>Apply to this Job</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const BenefitChip = ({ icon, label }: { icon: string; label: string }) => (
  <View style={styles.benefitChip}>
    <Ionicons name={icon as any} size={16} color="#007AFF" />
    <Text style={styles.benefitText}>{label}</Text>
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
  jobHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  parentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  parentName: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  distanceText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  matchContainer: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  matchScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
    marginBottom: 8,
  },
  matchReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  matchReasonText: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 8,
    backgroundColor: '#F8F9FA',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 16,
  },
  salaryLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  benefitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  postedText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
