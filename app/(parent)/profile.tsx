// app/(parent)/profile.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, ScrollView, Text, Image, TouchableOpacity, 
  Platform, RefreshControl, Alert 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

// Custom Components
import AppHeader from '../../components/common/AppHeader';
import RightDrawer from '../../components/common/RightDrawer';
import EditParentProfileModal from '../../components/profile/EditParentProfileModal';
import ParentDocumentModal from '../../components/profile/ParentDocumentModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ParentProfileScreen() {
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Profile Data State
  const [userId, setUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

  // --- LIFECYCLE ---
  useEffect(() => {
    loadUserProfile();
  }, []);

  /**
   * Load parent profile data from backend
   */
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        router.replace('/(auth)/login');
        return;
      }

      const parsed = JSON.parse(userData);
      setUserId(parsed.user_id);

      // Fetch profile from backend
      const response = await fetch(`${API_URL}/parent/get_profile.php?user_id=${parsed.user_id}`);
      const data = await response.json();

      if (data.success) {
        setProfileData(data);
      } else {
        Alert.alert('Error', 'Failed to load profile data');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh profile data
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  /**
   * Handle successful profile update
   */
  const handleProfileSaved = () => {
    loadUserProfile();
  };

  /**
   * Handle successful document upload
   */
  const handleDocumentsSaved = () => {
    loadUserProfile();
  };

  /**
   * Get verification status badge
   */
  const getVerificationBadge = () => {
    const verified = profileData?.profile?.verified || 0;
    
    if (verified === 1) {
      return { 
        icon: 'checkmark-circle', 
        text: 'Verified Parent', 
        style: styles.bgGreen 
      };
    } else {
      return { 
        icon: 'time', 
        text: 'Pending Verification', 
        style: styles.bgOrange 
      };
    }
  };

  // --- LOADING STATE ---
  if (loading) {
    return <LoadingSpinner visible={true} message="Loading profile..." />;
  }

  // --- NO PROFILE DATA ---
  if (!profileData) {
    return (
      <View style={styles.screenContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader 
          title="My Profile" 
          menu={true} 
          onMenuPress={() => setIsMenuOpen(true)} 
        />
        <View style={styles.emptyState}>
          <Ionicons name="person-circle-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No profile data found</Text>
          <TouchableOpacity 
            style={styles.createProfileBtn} 
            onPress={() => setIsEditModalOpen(true)}
          >
            <Text style={styles.createProfileText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const badge = getVerificationBadge();
  const user = profileData.user;
  const profile = profileData.profile;

  return (
    <View style={styles.screenContainer}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <AppHeader 
        title="My Profile" 
        menu={true} 
        onMenuPress={() => setIsMenuOpen(true)} 
      />

      {/* NAVIGATION DRAWER */}
      <RightDrawer 
        visible={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onLogout={() => router.replace('/(auth)/login')} 
      />

      {/* EDIT PROFILE MODAL */}
      <EditParentProfileModal 
        visible={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        onSaveSuccess={handleProfileSaved}
      />

      {/* DOCUMENT MODAL */}
      <ParentDocumentModal 
        visible={isDocumentModalOpen} 
        onClose={() => setIsDocumentModalOpen(false)}
        onSaveSuccess={handleDocumentsSaved}
      />

      {/* --- MAIN CONTENT --- */}
      <View style={styles.webCenterContainer}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >

          {/* 1. PROFILE HEADER CARD */}
          <View style={styles.profileHeaderCard}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {profile?.profile_image ? (
                <Image 
                  source={{ uri: profile.profile_image }} 
                  style={styles.avatar} 
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="home" size={60} color="#ccc" />
                </View>
              )}
            </View>

            {/* Name */}
            <Text style={styles.nameText}>{user.name}</Text>
            {user.username && (
              <Text style={styles.usernameText}>@{user.username}</Text>
            )}
            
            {/* Verification Badge */}
            <View style={[styles.statusBadge, badge.style]}>
              <Ionicons name={badge.icon as any} size={14} color="#fff" />
              <Text style={styles.statusText}>{badge.text}</Text>
            </View>

            {/* Location */}
            {profile?.municipality && profile?.barangay && (
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={16} color="#666" />
                <Text style={styles.locationText}>
                  {profile.barangay}, {profile.municipality}
                </Text>
              </View>
            )}

            {/* Contact Info */}
            <View style={styles.contactInfo}>
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={16} color="#666" />
                <Text style={styles.contactText}>{user.email}</Text>
              </View>
              {user.contact && (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={16} color="#666" />
                  <Text style={styles.contactText}>{user.contact}</Text>
                </View>
              )}
            </View>
          </View>

          {/* 2. QUICK ACTIONS */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setIsEditModalOpen(true)}
            >
              <Ionicons name="create-outline" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setIsDocumentModalOpen(true)}
            >
              <Ionicons name="document-text-outline" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Manage Documents</Text>
            </TouchableOpacity>
          </View>

          {/* 3. HOUSEHOLD INFORMATION */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Household Information</Text>
            
            {/* Address */}
            {profile?.address && (
              <View style={styles.infoRow}>
                <Ionicons name="home-outline" size={20} color="#007AFF" />
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{profile.address}</Text>
              </View>
            )}

            {/* Household Size */}
            {profile?.household_size && (
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={20} color="#007AFF" />
                <Text style={styles.infoLabel}>Household Size:</Text>
                <Text style={styles.infoValue}>{profile.household_size} members</Text>
              </View>
            )}

            {/* Has Children */}
            {profile?.has_children !== null && (
              <View style={styles.infoRow}>
                <Ionicons 
                  name={profile.has_children ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={profile.has_children ? "#28a745" : "#dc3545"} 
                />
                <Text style={styles.infoLabel}>Children:</Text>
                <Text style={styles.infoValue}>
                  {profile.has_children ? 'Yes' : 'No'}
                  {profile.children_ages && ` (Ages: ${profile.children_ages})`}
                </Text>
              </View>
            )}

            {/* Has Elderly */}
            {profile?.has_elderly !== null && (
              <View style={styles.infoRow}>
                <Ionicons 
                  name={profile.has_elderly ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={profile.has_elderly ? "#28a745" : "#dc3545"} 
                />
                <Text style={styles.infoLabel}>Elderly Members:</Text>
                <Text style={styles.infoValue}>{profile.has_elderly ? 'Yes' : 'No'}</Text>
              </View>
            )}

            {/* Has Pets */}
            {profile?.has_pets !== null && (
              <View style={styles.infoRow}>
                <Ionicons 
                  name={profile.has_pets ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={profile.has_pets ? "#28a745" : "#dc3545"} 
                />
                <Text style={styles.infoLabel}>Pets:</Text>
                <Text style={styles.infoValue}>
                  {profile.has_pets ? 'Yes' : 'No'}
                  {profile.pet_details && ` (${profile.pet_details})`}
                </Text>
              </View>
            )}
          </View>

          {/* 4. VERIFICATION DOCUMENTS */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Verification Documents</Text>
            <Text style={styles.cardSubtitle}>
              Upload your valid ID to verify your identity
            </Text>
            
            {/* Valid ID Status */}
            <DocumentStatusRow 
              icon="card-outline"
              title="Valid ID (PhilSys/Government ID)"
              status={profile?.valid_id ? 'uploaded' : 'pending'}
            />

            {/* Action Button */}
            <TouchableOpacity 
              style={styles.uploadDocsBtn}
              onPress={() => setIsDocumentModalOpen(true)}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
              <Text style={styles.uploadDocsBtnText}>
                {profile?.valid_id ? 'Update Document' : 'Upload Document'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 5. JOB POSTINGS SUMMARY */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>My Job Postings</Text>
              <TouchableOpacity onPress={() => router.push('/(parent)/jobs')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{profileData.job_stats?.active || 0}</Text>
                <Text style={styles.statLabel}>Active Jobs</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{profileData.job_stats?.filled || 0}</Text>
                <Text style={styles.statLabel}>Filled</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{profileData.job_stats?.total || 0}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

/**
 * HELPER COMPONENT: Document Status Row
 */
interface DocumentStatusRowProps {
  icon: string;
  title: string;
  status: 'uploaded' | 'pending';
}

function DocumentStatusRow({ icon, title, status }: DocumentStatusRowProps) {
  const statusConfig = status === 'uploaded' 
    ? { icon: 'checkmark-circle', color: '#28a745', text: 'Uploaded' }
    : { icon: 'alert-circle', color: '#ffc107', text: 'Not Uploaded' };

  return (
    <View style={styles.docRow}>
      <View style={styles.docIcon}>
        <Ionicons name={icon as any} size={24} color="#007AFF" />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle}>{title}</Text>
      </View>
      <View style={styles.docStatus}>
        <Ionicons name={statusConfig.icon as any} size={20} color={statusConfig.color} />
        <Text style={[styles.docStatusText, { color: statusConfig.color }]}>
          {statusConfig.text}
        </Text>
      </View>
    </View>
  );
}

// --- STYLES (Same as helper profile) ---
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  webCenterContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  
  // EMPTY STATE
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  createProfileBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  createProfileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // PROFILE HEADER CARD
  profileHeaderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#007AFF',
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#E0E0E0',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  usernameText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  bgGreen: { backgroundColor: '#28a745' },
  bgOrange: { backgroundColor: '#fd7e14' },
  statusText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: { 
    color: '#666', 
    fontSize: 14 
  },
  contactInfo: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
  },

  // ACTION BUTTONS
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // INFO CARDS
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },

  // INFO ROWS
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },

  // DOCUMENTS
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    gap: 12,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: { 
    fontSize: 15, 
    color: '#333',
    fontWeight: '600',
  },
  docStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  uploadDocsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  uploadDocsBtnText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // STATS
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});