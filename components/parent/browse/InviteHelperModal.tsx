// components/parent/browse/InviteHelperModal.tsx
// Modal to invite helper to apply to a specific job

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { HelperProfile } from '@/hooks/useBrowseHelpers';

// 1. FIXED INTERFACE: Changed salary_amount to salary_offered
interface Job {
  job_post_id: string;
  title: string;
  description: string;
  salary_offered: number | string; 
  status: string;
  category_name?: string;
}

interface InviteHelperModalProps {
  visible: boolean;
  helper: HelperProfile | null;
  jobs: Job[] | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteHelperModal({
  visible,
  helper,
  jobs, // We use this prop passed from parent
  onClose,
  onSuccess,
}: InviteHelperModalProps) {
  const [job, setJob] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      // If the parent already passed jobs down, use those! Faster!
      if (jobs && jobs.length > 0) {
        const openJobs = jobs.filter((j: Job) => j.status === 'Open');
        setJob(openJobs);
      } else {
        // Only fetch if parent didn't pass them
        fetchParentJobs();
      }
    }
  }, [visible, jobs]);

  const fetchParentJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }

      const user = JSON.parse(userData);

      const response = await fetch(
        `${API_URL}/parent/get_posted_jobs.php?parent_id=${user.user_id}`
      );
      const data = await response.json();

      if (data.success) {
        // Only show Open jobs
        const openJobs = data.jobs.filter((job: Job) => job.status === 'Open');
        setJob(openJobs);
      } else {
        throw new Error(data.message || 'Failed to load jobs');
      }
    } catch (err: any) {
      console.log('Backend not ready, using mock data...');
      
      // 2. FIXED MOCK DATA: Changed salary_amount to salary_offered
      const mockJobs: Job[] = [
        {
          job_post_id: '1',
          title: 'Live-in Yaya Needed',
          description: 'Looking for experienced yaya...',
          salary_offered: 8000, 
          status: 'Open',
          category_name: 'Yaya',
        },
        {
          job_post_id: '2',
          title: 'Part-time Cook',
          description: 'Need a cook for weekends...',
          salary_offered: 400,
          status: 'Open',
          category_name: 'Cook',
        },
      ];
      
      setJob(mockJobs);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!selectedJobId || !helper) return;

    try {
      setSending(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }

      const user = JSON.parse(userData);

      const response = await fetch(`${API_URL}/parent/invite_helper.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: user.user_id,
          helper_id: helper.user_id,
          job_post_id: selectedJobId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.();
        onClose();
      } else {
        throw new Error(data.message || 'Failed to send invitation');
      }
    } catch (err: any) {
      console.log('Backend error:', err.message);
      // For development: simulate success
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } finally {
      setSending(false);
    }
  };

  if (!helper) return null;

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
            <Text style={styles.headerTitle}>Invite to Apply</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#1A1C1E" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Helper Info */}
            <View style={styles.helperInfo}>
              <Text style={styles.helperName}>{helper.full_name}</Text>
              <View style={styles.categoriesContainer}>
                {helper.categories.map((category, index) => (
                  <View key={index} style={styles.categoryChip}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Instructions */}
            <Text style={styles.instructions}>
              Select a job position to invite {helper.first_name} to apply:
            </Text>

            {/* Loading State */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading your job posts...</Text>
              </View>
            )}

            {/* Error State */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#FF3B30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Empty State */}
            {!loading && !error && job.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="briefcase-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Open Jobs</Text>
                <Text style={styles.emptyText}>
                  You don't have any open job positions. Post a job first to invite helpers.
                </Text>
              </View>
            )}

            {/* Jobs List */}
            {!loading && !error && job.length > 0 && (
              <View style={styles.jobsList}>
                {job.map((j) => (
                  <TouchableOpacity
                    key={j.job_post_id}
                    style={[
                      styles.jobCard,
                      selectedJobId === j.job_post_id && styles.jobCardSelected,
                    ]}
                    onPress={() => setSelectedJobId(j.job_post_id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.jobCardContent}>
                      <View style={styles.jobCardHeader}>
                        <Text style={styles.jobTitle}>{j.title}</Text>
                        {selectedJobId === j.job_post_id && (
                          <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                        )}
                      </View>
                      
                      {j.category_name && (
                        <Text style={styles.jobCategory}>{j.category_name}</Text>
                      )}
                      
                      {/* 3. FIXED RENDER TEXT: Using salary_offered and Number() wrapper */}
                      <Text style={styles.jobSalary}>
                        ₱{Number(j.salary_offered).toLocaleString()}/month
                      </Text>
                      
                      {j.description && (
                        <Text style={styles.jobDescription} numberOfLines={2}>
                          {j.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (!selectedJobId || sending) && styles.sendButtonDisabled,
              ]} 
              onPress={handleSendInvitation}
              disabled={!selectedJobId || sending}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send Invitation</Text>
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
  helperInfo: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  helperName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  instructions: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#FF3B30',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    maxWidth: 280,
  },
  jobsList: {
    gap: 12,
  },
  jobCard: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  jobCardSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#F0F7FF',
  },
  jobCardContent: {
    padding: 16,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  jobCategory: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  jobSalary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  jobDescription: {
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
  sendButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});