// app/(helper)/profile.tsx
// Complete Helper Profile with Document Viewing
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
    View,
    Platform,
    Modal,
} from 'react-native';
import API_URL from '../../constants/api';

// Custom Components
import AppHeader from '../../components/common/AppHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NotificationModal from '../../components/common/NotificationModal';
import RightDrawer from '../../components/common/RightDrawer';
import DocumentManagementModal from '../../components/profile/DocumentManagementModal';
import EditProfileModal from '../../components/profile/EditProfileModal';

// ============================================================================
// DOCUMENT STATUS ROW COMPONENT
// ============================================================================

interface DocumentStatusRowProps {
  icon: string;
  title: string;
  status: 'uploaded' | 'pending' | 'verified' | 'rejected';
  required?: boolean;
  onPress: () => void;
}

function DocumentStatusRow({ icon, title, status, required = false, onPress }: DocumentStatusRowProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: 'checkmark-circle',
          color: '#2ECC71',
          text: 'Verified',
          bgColor: '#E8F8F0',
        };
      case 'uploaded':
      case 'pending':
        return {
          icon: 'time',
          color: '#FF9500',
          text: 'Pending Review',
          bgColor: '#FFF4E6',
        };
      case 'rejected':
        return {
          icon: 'close-circle',
          color: '#FF3B30',
          text: 'Rejected',
          bgColor: '#FFE8E6',
        };
      default:
        return {
          icon: 'alert-circle',
          color: '#ADB5BD',
          text: required ? 'Required' : 'Optional',
          bgColor: '#F8F9FA',
        };
    }
  };

  const config = getStatusConfig();
  const canView = status === 'uploaded' || status === 'pending' || status === 'verified' || status === 'rejected';

  return (
    <TouchableOpacity 
      style={styles.documentRow} 
      onPress={canView ? onPress : undefined}
      disabled={!canView}
    >
      <View style={styles.documentLeft}>
        <Ionicons name={icon as any} size={22} color="#007AFF" />
        <View style={styles.documentInfo}>
          <Text style={styles.documentTitle}>{title}</Text>
          {required && <Text style={styles.requiredBadge}>REQUIRED</Text>}
        </View>
      </View>
      <View style={[styles.documentStatus, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon as any} size={16} color={config.color} />
        <Text style={[styles.documentStatusText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN PROFILE COMPONENT
// ============================================================================

export default function HelperProfileScreen() {
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoutSuccessVisible, setLogoutSuccessVisible] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // File Viewer State
  const [viewingFile, setViewingFile] = useState<{url: string, type: string} | null>(null);
  
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user_data');
    setLogoutSuccessVisible(true);
    setTimeout(() => {
      setLogoutSuccessVisible(false);
      router.replace('/(auth)/login');
    }, 1000);
  };

  const handleProfileSaved = () => loadUserProfile();
  const handleDocumentsSaved = () => loadUserProfile();

  const getVerificationBadge = () => {
    const status = profileData?.profile?.verification_status || 'Unverified';
    
    switch (status) {
      case 'Verified': return { icon: 'shield-checkmark', text: 'PESO Verified', style: styles.bgGreen };
      case 'Pending': return { icon: 'time', text: 'Pending Review', style: styles.bgOrange };
      case 'Rejected': return { icon: 'close-circle', text: 'Verification Failed', style: styles.bgRed };
      default: return { icon: 'alert-circle', text: 'Not Verified', style: styles.bgGray };
    }
  };

  // Helper to find document status/URL
  const getDoc = (type: string) => {
    const doc = (profileData?.documents || []).find((d: any) => d.document_type === type);
    return {
      status: doc ? 
        (doc.status === 'Verified' ? 'verified' : 
         doc.status === 'Rejected' ? 'rejected' : 'uploaded') 
        : 'pending',
      url: doc?.file_url || null,
      file_path: doc?.file_path || '',
      document: doc || null
    };
  };

  const handleViewFile = (doc: any) => {
    if (!doc.url || !doc.file_path) {
      setErrorMessage('No file uploaded yet');
      setErrorModalVisible(true);
      return;
    }
    const isPdf = doc.file_path.toLowerCase().endsWith('.pdf');
    setViewingFile({ url: doc.url, type: isPdf ? 'pdf' : 'image' });
  };

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

      {/* File Viewer Modal */}
      <Modal visible={!!viewingFile} animationType="fade" transparent={true}>
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerContainer}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>Document Preview</Text>
              <TouchableOpacity onPress={() => setViewingFile(null)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            {viewingFile?.type === 'pdf' ? (
              <View style={styles.pdfPlaceholder}>
                <Ionicons name="document-text" size={80} color="#007AFF" />
                <Text style={styles.pdfText}>PDF Document</Text>
                <Text style={styles.pdfHint}>Open in browser to view</Text>
              </View>
            ) : (
              <Image source={{ uri: viewingFile?.url }} style={styles.viewerImage} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>

      {loading ? (
        <LoadingSpinner visible={loading} />
      ) : !profileData?.profile ? (
        <View style={styles.emptyState}>
          <Ionicons name="person-add" size={60} color="#CCC" />
          <Text style={styles.emptyText}>No Profile Yet</Text>
          <Text style={styles.emptySubtext}>Create your helper profile to get started</Text>
          <TouchableOpacity style={styles.createProfileBtn} onPress={() => setIsEditModalOpen(true)}>
            <Text style={styles.createProfileText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          style={Platform.OS === 'web' ? styles.webCenterContainer : undefined}
        >
          {/* PROFILE HEADER CARD */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.headerCover} />
            
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                {profileData.profile.profile_image ? (
                  <Image source={{ uri: profileData.profile.profile_image }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={50} color="#CCC" />
                  </View>
                )}
              </View>
              <View style={[styles.miniStatusBadge, 
                profileData.profile.availability_status === 'Available' ? styles.bgGreen :
                profileData.profile.availability_status === 'Employed' ? styles.bgOrange : styles.bgRed
              ]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.nameText}>
                {profileData.user.first_name} {profileData.user.last_name}
              </Text>
              <Text style={styles.usernameText}>@{profileData.user.username}</Text>
              
              {(() => {
                const badge = getVerificationBadge();
                return (
                  <View style={[styles.verificationBadge, badge.style]}>
                    <Text style={styles.verificationText}>{badge.text.toUpperCase()}</Text>
                  </View>
                );
              })()}
            </View>

            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{profileData.profile.rating_average || '0.0'}</Text>
                <Text style={styles.quickStatLabel}>Rating</Text>
              </View>
              <View style={[styles.quickStatItem, styles.quickStatBorder]}>
                <Text style={styles.quickStatValue}>{profileData.profile.rating_count || '0'}</Text>
                <Text style={styles.quickStatLabel}>Reviews</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{profileData.profile.experience_years || '0'}</Text>
                <Text style={styles.quickStatLabel}>Years Exp</Text>
              </View>
            </View>
          </View>

          {/* ACTION BUTTONS */}
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

          {/* PERSONAL INFO */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle" size={22} color="#007AFF" />
              <Text style={styles.cardTitle}>Personal Information</Text>
            </View>
            <InfoRow icon="call" label="Contact" value={profileData.profile.contact_number || 'N/A'} />
            <InfoRow icon="mail" label="Email" value={profileData.user.email || 'N/A'} />
            <InfoRow icon="calendar" label="Birth Date" value={profileData.profile.birth_date || 'N/A'} />
            <InfoRow icon="person" label="Gender" value={profileData.profile.gender || 'N/A'} />
            <InfoRow icon="heart" label="Civil Status" value={profileData.profile.civil_status || 'N/A'} />
            <InfoRow icon="book" label="Religion" value={profileData.profile.religion || 'N/A'} />
          </View>

          {/* ADDRESS */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={22} color="#FF3B30" />
              <Text style={styles.cardTitle}>Address</Text>
            </View>
            <InfoRow icon="map" label="Full Address" value={profileData.profile.address || 'N/A'} />
            <InfoRow icon="navigate" label="Landmark" value={profileData.profile.landmark || 'N/A'} />
          </View>

          {/* WORK PREFERENCES */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="briefcase" size={22} color="#007AFF" />
              <Text style={styles.cardTitle}>Work Preferences</Text>
            </View>
            <InfoRow icon="home" label="Employment Type" value={profileData.profile.employment_type || 'N/A'} />
            <InfoRow icon="time" label="Work Schedule" value={profileData.profile.work_schedule || 'N/A'} />
            <InfoRow icon="cash" label="Expected Salary" value={`₱${formatNumber(profileData.profile.expected_salary)} / ${profileData.profile.salary_period}`} />
            <InfoRow icon="checkmark-circle" label="Availability" value={profileData.profile.availability_status || 'N/A'} />
          </View>

          {/* BACKGROUND */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="school" size={22} color="#FFC107" />
              <Text style={styles.cardTitle}>Background</Text>
            </View>
            <InfoRow icon="book" label="Education" value={profileData.profile.education_level || 'N/A'} />
            <InfoRow icon="trophy" label="Experience" value={`${profileData.profile.experience_years || '0'} years`} />
            {profileData.profile.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.bioLabel}>About Me:</Text>
                <Text style={styles.bioText}>{profileData.profile.bio}</Text>
              </View>
            )}
          </View>

          {/* JOB SPECIALTIES */}
          {profileData.selected_jobs && profileData.selected_jobs.length > 0 && (
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="construct" size={22} color="#34C759" />
                <Text style={styles.cardTitle}>Job Specialties</Text>
              </View>
              <View style={styles.chipContainer}>
                {profileData.available_jobs
                  .filter((job: any) => profileData.selected_jobs.includes(job.job_id))
                  .map((job: any) => (
                    <View key={job.job_id} style={styles.chip}>
                      <Text style={styles.chipText}>{job.job_title}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* SKILLS */}
          {profileData.selected_skills && profileData.selected_skills.length > 0 && (
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="star" size={22} color="#FFC107" />
                <Text style={styles.cardTitle}>Skills & Abilities</Text>
              </View>
              <View style={styles.chipContainer}>
                {profileData.available_skills
                  .filter((skill: any) => profileData.selected_skills.includes(skill.skill_id))
                  .map((skill: any) => (
                    <View key={skill.skill_id} style={styles.chip}>
                      <Text style={styles.chipText}>{skill.skill_name}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* LANGUAGES */}
          {profileData.selected_languages && profileData.selected_languages.length > 0 && (
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="globe" size={22} color="#007AFF" />
                <Text style={styles.cardTitle}>Languages</Text>
              </View>
              <View style={styles.chipContainer}>
                {profileData.available_languages
                  .filter((lang: any) => profileData.selected_languages.includes(lang.language_id))
                  .map((lang: any) => (
                    <View key={lang.language_id} style={styles.chip}>
                      <Text style={styles.chipText}>{lang.language_name}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* VERIFICATION DOCUMENTS */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={22} color="#007AFF" />
              <Text style={styles.cardTitle}>Verification Documents</Text>
            </View>
            
            <DocumentStatusRow 
              icon="card-outline" 
              title="Valid ID" 
              status={getDoc('Valid ID').status as any} 
              required={true}
              onPress={() => handleViewFile(getDoc('Valid ID'))}
            />
            <DocumentStatusRow 
              icon="home-outline" 
              title="Barangay Clearance" 
              status={getDoc('Barangay Clearance').status as any} 
              required={true}
              onPress={() => handleViewFile(getDoc('Barangay Clearance'))}
            />
            <DocumentStatusRow 
              icon="document-text-outline" 
              title="Police Clearance" 
              status={getDoc('Police Clearance').status as any} 
              required={false}
              onPress={() => handleViewFile(getDoc('Police Clearance'))}
            />
            <DocumentStatusRow 
              icon="ribbon-outline" 
              title="TESDA NC2" 
              status={getDoc('TESDA NC2').status as any} 
              required={false}
              onPress={() => handleViewFile(getDoc('TESDA NC2'))}
            />
            
            <TouchableOpacity 
              style={styles.manageDocsBtn} 
              onPress={() => setIsDocumentModalOpen(true)}
            >
              <Ionicons name="cloud-upload" size={18} color="#007AFF" />
              <Text style={styles.manageDocsBtnText}>Update Documents</Text>
            </TouchableOpacity>
          </View>

          {/* RATING & REVIEWS */}
          {profileData.profile.rating_count > 0 && (
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="star-half" size={22} color="#FFC107" />
                <Text style={styles.cardTitle}>Rating & Reviews</Text>
              </View>
              <View style={styles.ratingOverview}>
                <View style={styles.ratingScore}>
                  <Text style={styles.ratingNumber}>{profileData.profile.rating_average}</Text>
                  <View style={styles.stars}>{renderStars(profileData.profile.rating_average)}</View>
                  <Text style={styles.ratingCount}>{profileData.profile.rating_count} reviews</Text>
                </View>
              </View>
            </View>
          )}

        </ScrollView>
      )}
    </View>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon as any} size={18} color="#6C757D" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function renderStars(rating: number) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < fullStars; i++) {
    stars.push(<Ionicons key={`full-${i}`} name="star" size={16} color="#FFC107" />);
  }
  if (hasHalfStar) {
    stars.push(<Ionicons key="half" name="star-half" size={16} color="#FFC107" />);
  }
  const emptyStars = 5 - stars.length;
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#FFC107" />);
  }
  return stars;
}

function formatNumber(num: any): string {
  if (!num) return "0";
  const n = typeof num === 'string' ? parseFloat(num) : num;
  return n.toLocaleString();
}

// ============================================================================
// STYLES
// ============================================================================

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
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 4,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
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
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1C1E',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  bioSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  bioLabel: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '600',
    marginBottom: 6,
  },
  bioText: {
    fontSize: 14,
    color: '#1A1C1E',
    lineHeight: 20,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  chipText: {
    color: '#1976D2',
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Document styles
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  documentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF3B30',
    letterSpacing: 0.5,
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  documentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  manageDocsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  manageDocsBtnText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // File Viewer
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: '#1A1C1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2A2C2E',
  },
  viewerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewerImage: {
    flex: 1,
    width: '100%',
  },
  pdfPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  pdfHint: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  
  // Rating
  ratingOverview: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  ratingScore: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: '#6C757D',
  },
});
