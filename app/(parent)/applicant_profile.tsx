// app/(parent)/applicant_profile.tsx
// Applicant Profile - Review full details and take actions

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Components
import {NotificationModal, LoadingSpinner} from '@/components/common';
import API_URL from '@/constants/api';

interface ApplicantDetails {
  application_id: string;
  helper_id: string;
  helper_name: string;
  helper_photo?: string;
  helper_age?: number;
  helper_gender?: string;
  helper_experience_years?: number;
  helper_rating_average?: number;
  helper_rating_count?: number;
  helper_categories?: string[];
  helper_municipality?: string;
  helper_province?: string;
  helper_bio?: string;
  helper_contact_number?: string;
  helper_expected_salary?: number;
  helper_employment_type?: string;
  cover_letter?: string;
  status: string;
  applied_at: string;
  parent_notes?: string;
}

export default function ApplicantProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const applicationId = params.application_id as string;
  const helperId = params.helper_id as string;
  const jobId = params.job_id as string;

  const [applicant, setApplicant] = useState<ApplicantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [notification, setNotification] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error',
  });

  useEffect(() => {
    fetchApplicantDetails();
  }, []);

  const fetchApplicantDetails = async () => {
    try {
      setLoading(true);

      // Fetch full helper profile + application details
      const response = await fetch(
        `${API_URL}/parent/get_applicant_profile.php?application_id=${applicationId}&helper_id=${helperId}`
      );
      const data = await response.json();

      if (data.success) {
        setApplicant(data.applicant);
        setNotes(data.applicant.parent_notes || '');
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load applicant details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAndHire = async () => {
    Alert.alert(
      'Hire Helper',
      `Are you sure you want to hire ${applicant?.helper_name}? This will mark the job as filled and notify the helper.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hire',
          onPress: async () => {
            try {
              const userData = await AsyncStorage.getItem('user_data');
              if (!userData) return;
              const user = JSON.parse(userData);

              const response = await fetch(`${API_URL}/parent/hire_helper.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  application_id: applicationId,
                  job_post_id: jobId,
                  parent_id: user.user_id,
                  helper_id: helperId,
                }),
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert(
                  'Success!',
                  `You have successfully hired ${applicant?.helper_name}. The job has been marked as filled.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => router.push('/(parent)/jobs'),
                    },
                  ]
                );
              } else {
                throw new Error(data.message);
              }
            } catch (error: any) {
              setNotification({
                visible: true,
                message: error.message || 'Failed to hire helper',
                type: 'error',
              });
            }
          },
        },
      ]
    );
  };

  const handleShortlist = async () => {
    try {
      const response = await fetch(
        `${API_URL}/parent/update_application_status.php`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_id: applicationId,
            status: 'Shortlisted',
            parent_notes: notes,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotification({
          visible: true,
          message: 'Applicant shortlisted',
          type: 'success',
        });
        fetchApplicantDetails();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || 'Failed to shortlist',
        type: 'error',
      });
    }
  };

  const handleReject = async () => {
    Alert.alert(
      'Reject Applicant',
      `Are you sure you want to reject ${applicant?.helper_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_URL}/parent/update_application_status.php`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    application_id: applicationId,
                    status: 'Rejected',
                    parent_notes: notes,
                  }),
                }
              );

              const data = await response.json();

              if (data.success) {
                Alert.alert('Applicant Rejected', '', [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                throw new Error(data.message);
              }
            } catch (error: any) {
              setNotification({
                visible: true,
                message: error.message || 'Failed to reject',
                type: 'error',
              });
            }
          },
        },
      ]
    );
  };

  const handleSaveNotes = async () => {
    try {
      const response = await fetch(
        `${API_URL}/parent/update_application_status.php`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_id: applicationId,
            status: applicant?.status,
            parent_notes: notes,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotification({
          visible: true,
          message: 'Notes saved',
          type: 'success',
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || 'Failed to save notes',
        type: 'error',
      });
    }
  };

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading profile..." />;
  }

  if (!applicant) {
    return (
      <View style={styles.container}>
        <Text>Applicant not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, visible: false })}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Applicant Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {applicant.helper_photo ? (
            <Image
              source={{ uri: applicant.helper_photo }}
              style={styles.profilePhoto}
            />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Ionicons name="person" size={50} color="#ccc" />
            </View>
          )}

          <Text style={styles.name}>{applicant.helper_name}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              {applicant.helper_age} years old • {applicant.helper_gender}
            </Text>
          </View>

          {applicant.helper_rating_average !== undefined &&
            applicant.helper_rating_count &&
            applicant.helper_rating_count > 0 && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FF9500" />
                <Text style={styles.ratingText}>
                  {applicant.helper_rating_average.toFixed(1)} (
                  {applicant.helper_rating_count} reviews)
                </Text>
              </View>
            )}

          {/* Categories */}
          {applicant.helper_categories && applicant.helper_categories.length > 0 && (
            <View style={styles.categoriesRow}>
              {applicant.helper_categories.map((cat, idx) => (
                <View key={idx} style={styles.categoryPill}>
                  <Text style={styles.categoryText}>{cat}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.locationText}>
              {applicant.helper_municipality}, {applicant.helper_province}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              applicant.status === 'Shortlisted' && styles.statusShortlisted,
              applicant.status === 'Rejected' && styles.statusRejected,
            ]}
          >
            <Text style={styles.statusText}>{applicant.status}</Text>
          </View>
        </View>

        {/* Experience */}
        {applicant.helper_experience_years !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            <Text style={styles.sectionText}>
              {applicant.helper_experience_years} years of experience
            </Text>
          </View>
        )}

        {/* Expected Salary */}
        {applicant.helper_expected_salary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expected Salary</Text>
            <Text style={styles.sectionText}>
              ₱{applicant.helper_expected_salary.toLocaleString()}/month
            </Text>
          </View>
        )}

        {/* Bio */}
        {applicant.helper_bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.sectionText}>{applicant.helper_bio}</Text>
          </View>
        )}

        {/* Cover Letter */}
        {applicant.cover_letter && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cover Letter</Text>
            <Text style={styles.sectionText}>{applicant.cover_letter}</Text>
          </View>
        )}

        {/* Contact */}
        {applicant.helper_contact_number && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <Text style={styles.sectionText}>
              {applicant.helper_contact_number}
            </Text>
          </View>
        )}

        {/* Applied Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Applied</Text>
          <Text style={styles.sectionText}>
            {new Date(applicant.applied_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Private Notes */}
        <View style={styles.section}>
          <View style={styles.notesTitleRow}>
            <Text style={styles.sectionTitle}>Private Notes</Text>
            <TouchableOpacity onPress={handleSaveNotes} activeOpacity={0.7}>
              <Text style={styles.saveNotesButton}>Save</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="Add private notes about this applicant..."
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {applicant.status !== 'Accepted' && applicant.status !== 'Rejected' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={handleReject}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>

          {applicant.status !== 'Shortlisted' && (
            <TouchableOpacity
              style={styles.shortlistButton}
              onPress={handleShortlist}
              activeOpacity={0.7}
            >
              <Ionicons name="bookmark" size={20} color="#007AFF" />
              <Text style={styles.shortlistButtonText}>Shortlist</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.hireButton}
            onPress={handleAcceptAndHire}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.hireButtonText}>Hire</Text>
          </TouchableOpacity>
        </View>
      )}

      {applicant.status === 'Accepted' && (
        <View style={styles.hiredBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#34C759" />
          <Text style={styles.hiredText}>You hired this helper!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  infoRow: {
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusShortlisted: {
    backgroundColor: '#007AFF',
  },
  statusRejected: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  notesTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saveNotesButton: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1A1C1E',
    minHeight: 100,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF3B30',
  },
  shortlistButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  shortlistButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
  },
  hireButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#34C759',
  },
  hireButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  hiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    backgroundColor: '#E8F5E9',
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9',
  },
  hiredText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
  },
});
