// app/(helper)/profile.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, ScrollView, Text, Image, TouchableOpacity, 
  Platform, RefreshControl, Modal
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

// Custom Components
import AppHeader from '../../components/common/AppHeader';
import RightDrawer from '../../components/common/RightDrawer';
import EditProfileModal from '../../components/profile/EditProfileModal';
import DocumentManagementModal from '../../components/profile/DocumentManagementModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NotificationModal from '../../components/common/NotificationModal';

export default function HelperProfileScreen() {
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoutSuccessVisible, setLogoutSuccessVisible] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Error notification state
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Profile Data State
  const [userId, setUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

  // --- LIFECYCLE: Load data when screen appears ---
  useEffect(() => {
    loadUserProfile();
  }, []); // Empty dependency array - only run once on mount

  /**
   * Load user profile data from backend
   */
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      console.log("🔍 DEBUG: Starting Profile Load...");

      // Get user ID from AsyncStorage
      const userData = await AsyncStorage.getItem('user_data');
      
      console.log("📦 DEBUG: Raw User Data:", userData);

      if (!userData) {
        setErrorMessage("Error: You are not logged in. Please log in again.");
        setErrorModalVisible(true);
        setLoading(false);
        return;
      }

      // Safe JSON Parsing
      let parsed;
      try {
        parsed = JSON.parse(userData);
      } catch (e) {
        console.error("❌ JSON Parse Error:", e);
        setErrorMessage(`Error: Corrupted user data in storage. ${e}`);
        setErrorModalVisible(true);
        setLoading(false);
        return;
      }

      if (!parsed.user_id) {
        setErrorMessage("Error: User ID is missing from stored data.");
        setErrorModalVisible(true);
        setLoading(false);
        return;
      }

      setUserId(parsed.user_id);
      console.log("👤 DEBUG: Fetching for User ID:", parsed.user_id);

      // Fetch profile from backend
      const url = `${API_URL}/helper/get_profile.php?user_id=${parsed.user_id}`;
      console.log("🌐 DEBUG: Fetching from:", url);

      const response = await fetch(url);
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      // Get response text first to debug
      const responseText = await response.text();
      console.log("📄 DEBUG: Raw Response:", responseText);

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("❌ JSON Parse Error on response:", e);
        setErrorMessage(`Server returned invalid JSON. Response: ${responseText.substring(0, 200)}`);
        setErrorModalVisible(true);
        setLoading(false);
        return;
      }

      console.log("✅ DEBUG: Parsed API Response:", data);

      if (data.success) {
        setProfileData(data);
      } else {
        setErrorMessage(data.message || 'Failed to load profile data from server.');
        setErrorModalVisible(true);
      }
    } catch (error: any) {
      console.error('❌ Error loading profile:', error);
      setErrorMessage(`Network error: ${error.message || 'Unable to connect to server'}`);
      setErrorModalVisible(true);
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
   * Handle retry button click
   */
  const handleRetry = () => {
    setErrorModalVisible(false);
    setProfileData(null); // Clear any partial data
    loadUserProfile();
  };

  /**
   * Handle Logout with Delay and Notification
   */
  const handleLogout = async () => {
    // 1. Close the menu
    setIsMenuOpen(false);
    
    // 2. Clear all stored data
    await AsyncStorage.clear();
    
    // 3. Show the "Success" modal
    setLogoutSuccessVisible(true);

    // 4. Wait 1.5 seconds so user sees the message, THEN redirect
    setTimeout(() => {
      setLogoutSuccessVisible(false);
      router.replace('/(auth)/login');
    }, 1500);
  };

  /**
   * Get verification status badge
   */
  const getVerificationBadge = () => {
    const status = profileData?.profile?.verification_status || 'Unverified';
    
    switch (status) {
      case 'Verified':
        return { 
          icon: 'checkmark-circle', 
          text: 'PESO Verified', 
          style: styles.bgGreen 
        };
      case 'Pending':
        return { 
          icon: 'time', 
          text: 'PESO Pending', 
          style: styles.bgOrange 
        };
      case 'Rejected':
        return { 
          icon: 'close-circle', 
          text: 'Verification Failed', 
          style: styles.bgRed 
        };
      default:
        return { 
          icon: 'alert-circle', 
          text: 'Not Verified', 
          style: styles.bgGray 
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
        
        {/* ERROR NOTIFICATION MODAL */}
        <NotificationModal 
          visible={errorModalVisible}
          message={errorMessage}
          type="error"
          onClose={() => setErrorModalVisible(false)}
          autoClose={false}
        />

        {/* --- ADD THIS: LOGOUT SUCCESS MODAL --- */}
        <NotificationModal 
          visible={logoutSuccessVisible}
          message="You have been logged out successfully."
          type="success"
          onClose={() => {}} // Do nothing on close, let the timer handle it
          autoClose={false}
        />

        <AppHeader 
          title="My Profile" 
          menu={true} 
          onMenuPress={() => setIsMenuOpen(true)} 
        />
        
        <View style={styles.emptyState}>
          <Ionicons name="person-circle-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No profile data found</Text>
          <Text style={styles.emptySubtext}>
            Unable to load your profile. Please check your connection and try again.
          </Text>
          <TouchableOpacity 
            style={styles.createProfileBtn} 
            onPress={handleRetry}
          >
            <Text style={styles.createProfileText}>Retry Loading</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const badge = getVerificationBadge();
  const user = profileData.user;
  const profile = profileData.profile;
  const skills = profileData.skills || [];

  return (
    <View style={styles.screenContainer}>
      

      {/* ERROR NOTIFICATION MODAL */}
      <NotificationModal 
        visible={errorModalVisible}
        message={errorMessage}
        type="error"
        onClose={() => setErrorModalVisible(false)}
        autoClose={false}
      />

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
        onLogout={handleLogout} 
      />

      {/* EDIT PROFILE MODAL */}
      <EditProfileModal 
        visible={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        onSaveSuccess={handleProfileSaved}
      />

      {/* DOCUMENT MANAGEMENT MODAL */}
      <DocumentManagementModal 
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
            <View style={styles.avatarContainer}>
              {profile?.profile_image ? (
                <Image 
                  source={{ uri: profile.profile_image }} 
                  style={styles.avatar} 
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={60} color="#ccc" />
                </View>
              )}
            </View>

            <Text style={styles.nameText}>{user.name}</Text>
            {user.username && (
              <Text style={styles.usernameText}>@{user.username}</Text>
            )}
            
            <View style={[styles.statusBadge, badge.style]}>
              <Ionicons name={badge.icon as any} size={14} color="#fff" />
              <Text style={styles.statusText}>{badge.text}</Text>
            </View>

            {profile?.municipality && profile?.barangay && (
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={16} color="#666" />
                <Text style={styles.locationText}>
                  {profile.barangay}, {profile.municipality}
                </Text>
              </View>
            )}

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

          {/* 3. ABOUT ME SECTION */}
          {profile?.bio && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>About Me</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          )}

          {/* 4. PROFESSIONAL INFO */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Professional Information</Text>
            
            {profile?.experience_years && (
              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={20} color="#007AFF" />
                <Text style={styles.infoLabel}>Experience:</Text>
                <Text style={styles.infoValue}>
                  {profile.experience_years} {profile.experience_years === 1 ? 'year' : 'years'}
                </Text>
              </View>
            )}

            {profile?.work_type_preference && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color="#007AFF" />
                <Text style={styles.infoLabel}>Work Type:</Text>
                <Text style={styles.infoValue}>{profile.work_type_preference}</Text>
              </View>
            )}

            {profile?.availability_status && (
              <View style={styles.infoRow}>
                <Ionicons 
                  name={profile.availability_status === 'Available' ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={profile.availability_status === 'Available' ? '#28a745' : '#dc3545'} 
                />
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={[
                  styles.infoValue,
                  profile.availability_status === 'Available' ? styles.textGreen : styles.textRed
                ]}>
                  {profile.availability_status}
                </Text>
              </View>
            )}

            {profile?.languages_spoken && (
              <View style={styles.infoRow}>
                <Ionicons name="language-outline" size={20} color="#007AFF" />
                <Text style={styles.infoLabel}>Languages:</Text>
                <Text style={styles.infoValue}>{profile.languages_spoken}</Text>
              </View>
            )}
          </View>

          {/* 5. SKILLS & SPECIALTIES */}
          {skills.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Skills & Specialties</Text>
              <View style={styles.skillRow}>
                {skills.map((skill: any, index: number) => (
                  <View key={index} style={styles.skillChip}>
                    <Text style={styles.skillText}>{skill.skill_name}</Text>
                    {skill.proficiency_level && (
                      <Text style={styles.skillLevel}>
                        {skill.proficiency_level}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 6. SALARY EXPECTATION */}
          {(profile?.expected_salary_min || profile?.expected_salary_max) && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Salary Expectation</Text>
              <View style={styles.salaryRow}>
                <Ionicons name="cash-outline" size={24} color="#28a745" />
                <View style={styles.salaryInfo}>
                  <Text style={styles.salaryLabel}>Expected Monthly Salary</Text>
                  <Text style={styles.salaryValue}>
                    ₱ {formatNumber(profile.expected_salary_min)}
                    {profile.expected_salary_max && profile.expected_salary_min !== profile.expected_salary_max && 
                      ` - ₱ ${formatNumber(profile.expected_salary_max)}`
                    }
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 7. DOCUMENTS STATUS */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Verification Documents</Text>
            
            <DocumentStatusRow 
              icon="card-outline"
              title="PhilSys ID"
              status={profile?.government_id ? 'uploaded' : 'pending'}
            />

            <DocumentStatusRow 
              icon="shield-checkmark-outline"
              title="Barangay Clearance"
              status={profile?.barangay_clearance ? 'uploaded' : 'pending'}
            />

            <DocumentStatusRow 
              icon="document-text-outline"
              title="NBI/Police Clearance"
              status={profile?.nbi_clearance_image ? 'uploaded' : 'pending'}
              expiryDate={profile?.nbi_clearance_expiry}
            />

            <TouchableOpacity 
              style={styles.uploadDocsBtn}
              onPress={() => setIsDocumentModalOpen(true)}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
              <Text style={styles.uploadDocsBtnText}>
                {profile?.government_id ? 'Update Documents' : 'Upload Documents'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 8. RATING & REVIEWS */}
          {profile?.rating_count > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Rating & Reviews</Text>
              <View style={styles.ratingContainer}>
                <View style={styles.ratingScore}>
                  <Text style={styles.ratingNumber}>{profile.rating_average}</Text>
                  <View style={styles.starsRow}>
                    {renderStars(profile.rating_average)}
                  </View>
                  <Text style={styles.ratingCount}>
                    Based on {profile.rating_count} {profile.rating_count === 1 ? 'review' : 'reviews'}
                  </Text>
                </View>
              </View>
            </View>
          )}

        </ScrollView>
      </View>
    </View>
  );
}

// Helper Components and Functions...
interface DocumentStatusRowProps {
  icon: string;
  title: string;
  status: 'uploaded' | 'pending' | 'expired';
  expiryDate?: string | null;
}

function DocumentStatusRow({ icon, title, status, expiryDate }: DocumentStatusRowProps) {
  const getStatusConfig = () => {
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      if (expiry < now) {
        return { icon: 'close-circle', color: '#dc3545', text: 'Expired' };
      }
    }
    
    switch (status) {
      case 'uploaded':
        return { icon: 'checkmark-circle', color: '#28a745', text: 'Uploaded' };
      case 'expired':
        return { icon: 'close-circle', color: '#dc3545', text: 'Expired' };
      default:
        return { icon: 'alert-circle', color: '#ffc107', text: 'Not Uploaded' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={styles.docRow}>
      <View style={styles.docIcon}>
        <Ionicons name={icon as any} size={24} color="#007AFF" />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle}>{title}</Text>
        {expiryDate && status === 'uploaded' && (
          <Text style={styles.docExpiry}>
            Expires: {new Date(expiryDate).toLocaleDateString()}
          </Text>
        )}
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

function renderStars(rating: number) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Ionicons key={i} name="star" size={16} color="#FFC107" />);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<Ionicons key={i} name="star-half" size={16} color="#FFC107" />);
    } else {
      stars.push(<Ionicons key={i} name="star-outline" size={16} color="#FFC107" />);
    }
  }
  return stars;
}

function formatNumber(num: number): string {
  return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
}

// Styles remain the same...
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
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
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
  bgRed: { backgroundColor: '#dc3545' },
  bgGray: { backgroundColor: '#6c757d' },
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  bioText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
  },
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
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  textGreen: { color: '#28a745' },
  textRed: { color: '#dc3545' },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillChip: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  skillText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 13,
  },
  skillLevel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 10,
    gap: 12,
  },
  salaryInfo: {
    flex: 1,
  },
  salaryLabel: { 
    fontSize: 13, 
    color: '#666',
    marginBottom: 4,
  },
  salaryValue: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#28a745' 
  },
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
  docExpiry: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  ratingContainer: {
    alignItems: 'center',
  },
  ratingScore: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFC107',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 13,
    color: '#666',
  },
});