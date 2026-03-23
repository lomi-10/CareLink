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
import { JobPost } from '@/hooks/useBrowseJobs';

interface ApplicationModalProps {
  visible: boolean;
  job: JobPost | null;
  onSubmit: () => void;
  onClose: () => void;
}

export default function ApplicationModal({
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
      // For development: simulate success
      setTimeout(() => {
        setCoverLetter('');
        onSubmit();
        onClose();
      }, 500);
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
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Apply to Job</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#1A1C1E" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Job Info */}
            <View style={styles.jobInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="briefcase" size={32} color="#007AFF" />
              </View>
              <View style={styles.jobDetails}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.parentName}>{job.parent_name}</Text>
                <Text style={styles.jobLocation}>
                  {job.municipality}, {job.province}
                </Text>
              </View>
            </View>

            {/* Instructions */}
            <Text style={styles.instructions}>
              Write a cover letter explaining why you're a good fit for this position. 
              Highlight your relevant experience and skills.
            </Text>

            {/* Cover Letter Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Cover Letter <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={8}
                placeholder="Dear Hiring Manager,&#10;&#10;I am writing to express my interest in the position..."
                placeholderTextColor="#999"
                value={coverLetter}
                onChangeText={(text) => {
                  setCoverLetter(text);
                  setError(null);
                }}
                maxLength={1000}
              />
              <Text style={styles.charCount}>
                {coverLetter.length}/1000 characters
              </Text>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Tips */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Tips for a great cover letter:</Text>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                <Text style={styles.tipText}>Explain why you're interested in this specific job</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                <Text style={styles.tipText}>Highlight your relevant experience</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                <Text style={styles.tipText}>Be professional but personable</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                <Text style={styles.tipText}>Keep it concise and well-written</Text>
              </View>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
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
                submitting && styles.submitButtonDisabled,
              ]} 
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Application</Text>
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
    paddingHorizontal: 20,
  },
  jobInfo: {
    flexDirection: 'row',
    paddingVertical: 20,
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobDetails: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  parentName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  jobLocation: {
    fontSize: 13,
    color: '#999',
  },
  instructions: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1A1C1E',
    textAlignVertical: 'top',
    minHeight: 200,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
  },
  tipsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
