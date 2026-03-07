// app/(helper)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import API_URL from '../../constants/api';

// Custom Components
import AppHeader from '../../components/common/AppHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NotificationModal from '../../components/common/NotificationModal';
import RightDrawer from '../../components/common/RightDrawer';
import DocumentManagementModal from '../../components/profile/DocumentManagementModal';
import EditProfileModal from '../../components/profile/EditProfileModal';

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
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        setErrorMessage("Session Expired. Please log in.");
        setErrorModalVisible(true);
        setLoading(false);

        setTimeout(()=> {
          setErrorModalVisible(false);
          router.replace("/(auth)/login");
        }, 1500);
        return;
      }

      const parsed = JSON.parse(userData);
      setUserId(parsed.user_id);

      const url = `${API_URL}/helper/get_profile.php?user_id=${parsed.user_id}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`Server Error! Status: ${response.status}`);
      const responseText = await response.text();

      try{
        const data = JSON.parse(responseText);

        if (data.success) {
          setProfileData(data);
        } else {
          setErrorMessage(data.message || 'Failed to load profile data.');
          setErrorModalVisible(true);
        }
      }catch (parseError){
        console.error("Raw response was: ", responseText);
        throw new Error("Server sent invalid data format.");
      }
    } catch (error: any) {
      setErrorMessage(`Network error: ${error.message || 'Unable to connect to server'}`);
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  const handleProfileSaved = () => loadUserProfile();
  const handleDocumentsSaved = () => loadUserProfile();

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await AsyncStorage.clear();
    setLogoutSuccessVisible(true);
    setTimeout(() => {
      setLogoutSuccessVisible(false);
      router.replace('/(auth)/login');
    }, 1500);
  };

  const getVerificationBadge = () => {
    const status = profileData?.profile?.verification_status || 'Unverified';
    switch (status) {
      case 'Verified': return { icon: 'checkmark-circle', text: 'PESO Verified', style: styles.bgGreen };
      case 'Pending': return { icon: 'time', text: 'PESO Pending', style: styles.bgOrange };
      case 'Rejected': return { icon: 'close-circle', text: 'Verification Failed', style: styles.bgRed };
      default: return { icon: 'alert-circle', text: 'Not Verified', style: styles.bgGray };
    }
  };

  if (loading) return <LoadingSpinner visible={true} message="Loading profile..." />;

  if (!profileData) {
    return (
      <View style={styles.screenContainer}>
        <AppHeader title="My Profile" menu={true} onMenuPress={() => setIsMenuOpen(true)} />
        <View style={styles.emptyState}>
          <Ionicons name="person-circle-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No profile data found</Text>
          <TouchableOpacity style={styles.createProfileBtn} onPress={loadUserProfile}>
            <Text style={styles.createProfileText}>Retry Loading</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const badge = getVerificationBadge();
  const user = profileData.user;
  const profile = profileData.profile;
  
  // Get selected skills with names
  const availableSkills = profileData.available_skills || [];
  const selectedSkillIds = profileData.selected_skills || [];
  const skills = availableSkills.filter((s: any) => selectedSkillIds.includes(s.skill_id));
  
  // Get selected jobs with titles
  const availableJobs = profileData.available_jobs || [];
  const selectedJobIds = profileData.selected_jobs || [];
  const jobs = availableJobs.filter((j: any) => selectedJobIds.includes(j.job_id));
  
  // Custom skills and jobs from profile
  const customSkills = profileData.profile?.custom_skills ? JSON.parse(profileData.profile.custom_skills) : [];
  const customJobs = profileData.profile?.custom_jobs ? JSON.parse(profileData.profile.custom_jobs) : [];

  // Format full name
  const fullName = user ? `${user.first_name || ''} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name || ''}`.trim() : 'No Name';

  return (
    <View style={styles.screenContainer}>
      <NotificationModal visible={errorModalVisible} message={errorMessage} type="error" onClose={() => setErrorModalVisible(false)} />
      <NotificationModal visible={logoutSuccessVisible} message="Logged out successfully." type="success" onClose={() => {}} />

      <AppHeader title="My Profile" menu={true} onMenuPress={() => setIsMenuOpen(true)} />
      <RightDrawer 
        visible={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onLogout={handleLogout} 
        userType='helper'
      />

      <EditProfileModal 
        visible={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onSaveSuccess={handleProfileSaved} 
      />

      <DocumentManagementModal 
        visible={isDocumentModalOpen} 
        onClose={() => setIsDocumentModalOpen(false)} 
        onSaveSuccess={handleDocumentsSaved} 
      />

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
            <View style={styles.headerCover} />
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                {profile?.profile_image ? (
                  <Image source={{ uri: profile.profile_image }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={60} color="#ccc" />
                  </View>
                )}
              </View>
              <View style={[styles.miniStatusBadge, badge.style]}>
                <Ionicons name={badge.icon as any} size={12} color="#fff" />
              </View>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.nameText}>{fullName}</Text>
              {user.username && <Text style={styles.usernameText}>@{user.username}</Text>}
              
              <View style={[styles.verificationBadge, badge.style]}>
                <Text style={styles.verificationText}>{badge.text.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{profile?.experience_years || '0'}</Text>
                <Text style={styles.quickStatLabel}>Years Exp.</Text>
              </View>
              <View style={[styles.quickStatItem, styles.quickStatBorder]}>
                <Text style={styles.quickStatValue}>{profile?.rating_average || '0.0'}</Text>
                <Text style={styles.quickStatLabel}>Rating</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{profile?.rating_count || '0'}</Text>
                <Text style={styles.quickStatLabel}>Reviews</Text>
              </View>
            </View>
          </View>

          {/* 2. ACTION BUTTONS */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setIsEditModalOpen(true)}>
              <Ionicons name="create" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => setIsDocumentModalOpen(true)}>
              <Ionicons name="document-attach" size={20} color="#007AFF" />
              <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Documents</Text>
            </TouchableOpacity>
          </View>

          {/* 3. ABOUT ME */}
          {profile?.bio && (
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="information-circle" size={22} color="#007AFF" />
                <Text style={styles.cardTitle}>About Me</Text>
              </View>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          )}

          {/* 4. WORK PREFERENCES */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="briefcase" size={22} color="#007AFF" />
              <Text style={styles.cardTitle}>Work Preferences</Text>
            </View>
            
            <View style={styles.preferenceGrid}>
              <View style={styles.preferenceItem}>
                <Text style={styles.prefLabel}>Arrangement</Text>
                <Text style={styles.prefValue}>{profile?.employment_type || 'Any'}</Text>
              </View>
              <View style={styles.preferenceItem}>
                <Text style={styles.prefLabel}>Schedule</Text>
                <Text style={styles.prefValue}>{profile?.work_schedule || 'Full-time'}</Text>
              </View>
              <View style={styles.preferenceItem}>
                <Text style={styles.prefLabel}>Availability</Text>
                <View style={styles.statusRowCompact}>
                  <View style={[styles.statusDot, profile?.availability_status === 'Available' ? styles.dotGreen : styles.dotRed]} />
                  <Text style={styles.prefValue}>{profile?.availability_status || 'Available'}</Text>
                </View>
              </View>
              <View style={styles.preferenceItem}>
                <Text style={styles.prefLabel}>Expected Salary</Text>
                <Text style={styles.prefValue}>₱{formatNumber(profile?.expected_salary)}/{profile?.salary_period === 'Monthly' ? 'mo' : 'day'}</Text>
              </View>
            </View>
          </View>

          {/* 5. SPECIALTIES & SKILLS */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="star" size={22} color="#007AFF" />
              <Text style={styles.cardTitle}>Skills & Specialties</Text>
            </View>

            {/* Jobs */}
            {(jobs.length > 0 || customJobs.length > 0) && (
              <View style={styles.skillGroup}>
                <Text style={styles.skillGroupTitle}>Job Roles</Text>
                <View style={styles.skillRow}>
                  {jobs.map((job: any, index: number) => (
                    <View key={`job-${index}`} style={styles.jobChip}>
                      <Text style={styles.jobChipText}>{job.job_title}</Text>
                    </View>
                  ))}
                  {customJobs.map((job: string, index: number) => (
                    <View key={`custom-job-${index}`} style={[styles.jobChip, styles.customChip]}>
                      <Ionicons name="sparkles" size={12} color="#2E7D32" style={{marginRight: 4}} />
                      <Text style={[styles.jobChipText, styles.customChipText]}>{job}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Skills */}
            {(skills.length > 0 || customSkills.length > 0) && (
              <View style={styles.skillGroup}>
                <Text style={styles.skillGroupTitle}>Specific Skills</Text>
                <View style={styles.skillRow}>
                  {skills.map((skill: any, index: number) => (
                    <View key={`skill-${index}`} style={styles.skillChip}>
                      <Text style={styles.skillText}>{skill.skill_name}</Text>
                    </View>
                  ))}
                  {customSkills.map((skill: string, index: number) => (
                    <View key={`custom-skill-${index}`} style={[styles.skillChip, styles.customChip]}>
                      <Ionicons name="sparkles" size={12} color="#2E7D32" style={{marginRight: 4}} />
                      <Text style={[styles.skillText, styles.customChipText]}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* 6. PERSONAL DETAILS */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="person" size={22} color="#007AFF" />
              <Text style={styles.cardTitle}>Personal Details</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Gender</Text>
                <Text style={styles.detailValue}>{profile?.gender || '---'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Civil Status</Text>
                <Text style={styles.detailValue}>{profile?.civil_status || '---'}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Birth Date</Text>
                <Text style={styles.detailValue}>{profile?.birth_date || '---'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Religion</Text>
                <Text style={styles.detailValue}>{profile?.religion || '---'}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Education</Text>
                <Text style={styles.detailValue}>{profile?.education_level || '---'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Languages</Text>
                <Text style={styles.detailValue}>{profile?.languages_spoken || 'Tagalog, English'}</Text>
              </View>
            </View>
          </View>

          {/* 7. ADDRESS */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={22} color="#007AFF" />
              <Text style={styles.cardTitle}>Location Details</Text>
            </View>
            
            <View style={styles.addressContainer}>
              <Text style={styles.fullAddress}>{profile?.address || 'No address set'}</Text>
              {profile?.landmark && (
                <View style={styles.landmarkRow}>
                  <Ionicons name="flag" size={14} color="#666" />
                  <Text style={styles.landmarkText}>Landmark: {profile.landmark}</Text>
                </View>
              )}
              <View style={styles.locationMeta}>
                <Text style={styles.locationMetaText}>{profile?.barangay}, {profile?.municipality}, {profile?.province}</Text>
              </View>
            </View>
          </View>

          {/* 8. VERIFICATION DOCUMENTS */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={22} color="#007AFF" />
              <Text style={styles.cardTitle}>Verification Documents</Text>
            </View>
            <DocumentStatusRow icon="card-outline" title="Government ID" status={profile?.verification_status === 'Verified' ? 'uploaded' : 'pending'} />
            <DocumentStatusRow icon="home-outline" title="Barangay Clearance" status={profile?.verification_status === 'Verified' ? 'uploaded' : 'pending'} />
            <DocumentStatusRow icon="document-text-outline" title="Police Clearance" status={profile?.verification_status === 'Verified' ? 'uploaded' : 'pending'} />
            
            <TouchableOpacity style={styles.manageDocsBtn} onPress={() => setIsDocumentModalOpen(true)}>
              <Text style={styles.manageDocsBtnText}>Update Documents</Text>
            </TouchableOpacity>
          </View>

          {/* 9. RATING & REVIEWS */}
          {profile?.rating_count > 0 && (
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="star-half" size={22} color="#FFC107" />
                <Text style={styles.cardTitle}>Rating & Reviews</Text>
              </View>
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingNumber}>{profile.rating_average}</Text>
                <View style={styles.starsRow}>
                  {renderStars(profile.rating_average)}
                </View>
                <Text style={styles.ratingCount}>
                  Based on {profile.rating_count} {profile.rating_count === 1 ? 'review' : 'reviews'}
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
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
        return { icon: 'checkmark-circle', color: '#28a745', text: 'Verified' };
      case 'expired':
        return { icon: 'close-circle', color: '#dc3545', text: 'Expired' };
      default:
        return { icon: 'alert-circle', color: '#ffc107', text: 'Missing' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={styles.docRow}>
      <View style={styles.docIcon}>
        <Ionicons name={icon as any} size={20} color="#007AFF" />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle}>{title}</Text>
      </View>
      <View style={styles.docStatus}>
        <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
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

function formatNumber(num: any): string {
  if (!num) return "0";
  const n = typeof num === 'string' ? parseFloat(num) : num;
  return n.toLocaleString();
}

// Styles remain the same...
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  webCenterContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
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
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  headerCover: {
    height: 100,
    width: '100%',
    backgroundColor: '#007AFF',
    opacity: 0.1,
    position: 'absolute',
    top: 0,
  },
  avatarWrapper: {
    marginTop: 40,
    position: 'relative',
  },
  avatarContainer: {
    padding: 4,
    borderRadius: 60,
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniStatusBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerInfo: {
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  usernameText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
    marginBottom: 12,
  },
  verificationBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  verificationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  quickStatsRow: {
    flexDirection: 'row',
    marginTop: 24,
    paddingHorizontal: 20,
    width: '100%',
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#F1F3F5',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#6C757D',
    marginTop: 2,
    fontWeight: '500',
  },
  bgGreen: { backgroundColor: '#2ECC71' },
  bgOrange: { backgroundColor: '#FF9500' },
  bgRed: { backgroundColor: '#FF3B30' },
  bgGray: { backgroundColor: '#ADB5BD' },
  
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: '#007AFF',
  },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  bioText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 22,
  },
  
  preferenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  preferenceItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  prefLabel: {
    fontSize: 11,
    color: '#6C757D',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  prefValue: {
    fontSize: 14,
    color: '#1A1C1E',
    fontWeight: '700',
  },
  statusRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: { backgroundColor: '#2ECC71' },
  dotRed: { backgroundColor: '#FF3B30' },

  skillGroup: {
    marginBottom: 16,
  },
  skillGroupTitle: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '700',
    marginBottom: 10,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  jobChip: {
    backgroundColor: '#EBF5FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1E9FF',
  },
  jobChipText: {
    color: '#007AFF',
    fontWeight: '700',
    fontSize: 12,
  },
  skillChip: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  skillText: {
    color: '#495057',
    fontWeight: '600',
    fontSize: 12,
  },
  customChip: {
    backgroundColor: '#EBFBEE',
    borderColor: '#D3F9D8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  customChipText: {
    color: '#2E7D32',
  },

  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6C757D',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1C1E',
    fontWeight: '700',
  },

  addressContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  fullAddress: {
    fontSize: 14,
    color: '#1A1C1E',
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 8,
  },
  landmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  landmarkText: {
    fontSize: 12,
    color: '#6C757D',
    fontStyle: 'italic',
  },
  locationMeta: {
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    paddingTop: 8,
  },
  locationMetaText: {
    fontSize: 12,
    color: '#6C757D',
  },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: { 
    fontSize: 14, 
    color: '#1A1C1E',
    fontWeight: '600',
  },
  docStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  manageDocsBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
  },
  manageDocsBtnText: {
    color: '#495057',
    fontSize: 13,
    fontWeight: '700',
  },

  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  ratingNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FF9500',
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
  },
});