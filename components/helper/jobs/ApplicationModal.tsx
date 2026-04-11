// components/helper/jobs/ApplicationModal.tsx
// Modal to submit job application with cover letter

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import type { JobPost } from '@/hooks/helper';

interface ApplicationModalProps {
  visible: boolean;
  job: JobPost | null;
  onSubmit: () => void;
  onClose: () => void;
}

export function ApplicationModal({
  visible,
  job,
  onSubmit,
  onClose,
}: ApplicationModalProps) {
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!job) return;

    // STUDY: browse_jobs lists Pending + Open; applications only accepted for Open (apply_job.php).
    if (job.status !== 'Open') {
      setError('This job is still awaiting PESO verification. Applications open once the listing is approved.');
      return;
    }

    // Validate cover letter
    if (!coverLetter.trim()) {
      setError('Please write a cover letter to introduce yourself');
      return;
    }

    if (coverLetter.trim().length < 50) {
      setError('Cover letter should be at least 50 characters');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }

      const user = JSON.parse(userData);

      const response = await fetch(`${API_URL}/helper/apply_job.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_post_id: job.job_post_id,
          helper_id: user.user_id,
          cover_letter: coverLetter.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Clear form
        setCoverLetter('');
        onSubmit();
        onClose();
      } else {
        throw new Error(data.message || 'Failed to submit application');
      }
    } catch (err: any) {
      console.log('Backend error:', err.message);
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (!job) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, styles.responsiveModal]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Apply for Position</Text>
              <Text style={styles.headerSubtitle}>Submit your application to the employer</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Job Info Card */}
            <View style={styles.jobInfoCard}>
              <View style={styles.iconContainer}>
                <Ionicons name="briefcase" size={24} color="#007AFF" />
              </View>
              <View style={styles.jobDetails}>
                <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                <View style={styles.employerRow}>
                  <Text style={styles.parentName}>{job.parent_name}</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.jobLocation}>{job.municipality}</Text>
                </View>
              </View>
            </View>

            {/* Application Form */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Cover Letter</Text>
              <Text style={styles.instructions}>
                Introduce yourself and explain why you're a great fit for this role. 
                Employers love to see your personality and relevant skills.
              </Text>

              <View style={[styles.inputContainer, error && styles.inputContainerError]}>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={10}
                  placeholder="Tell the employer about your experience and why you're interested..."
                  placeholderTextColor="#9CA3AF"
                  value={coverLetter}
                  onChangeText={(text) => {
                    setCoverLetter(text);
                    setError(null);
                  }}
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <View style={styles.inputFooter}>
                  <Text style={[styles.charCount, coverLetter.length < 50 && styles.charCountWarning]}>
                    {coverLetter.length}/1000 characters (min 50)
                  </Text>
                </View>
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>

            {/* Helpful Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>Tips for a successful application:</Text>
              <View style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>Mention specific skills related to the job category.</Text>
              </View>
              <View style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>Double-check your spelling and grammar.</Text>
              </View>
              <View style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>Highlight any certifications like TESDA NC II.</Text>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (submitting || coverLetter.length < 50) && styles.submitButtonDisabled,
              ]} 
              onPress={handleSubmit}
              disabled={submitting || coverLetter.length < 50}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
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
    backgroundColor: '#fff',
    borderRadius: 24,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 600,
    overflow: 'hidden',
  },
  responsiveModal: {
    width: Platform.OS === 'web' ? '85%' : '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  content: {
    padding: 24,
  },
  jobInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobDetails: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  employerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  parentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  dot: {
    color: '#9CA3AF',
  },
  jobLocation: {
    fontSize: 13,
    color: '#6B7280',
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  textArea: {
    padding: 16,
    fontSize: 15,
    color: '#111827',
    minHeight: 200,
    lineHeight: 22,
  },
  inputFooter: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'flex-end',
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  charCountWarning: {
    color: '#D97706',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  tipsSection: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0EA5E9',
  },
  tipText: {
    fontSize: 13,
    color: '#0C4A6E',
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#1D4ED8',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
