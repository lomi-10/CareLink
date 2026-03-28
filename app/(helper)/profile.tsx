// app/(helper)/profile.tsx
// Helper Profile Screen - Modularized & Clean
// Main orchestration file - delegates to components and hooks

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// styles
import { styles } from "./profile.styles"

// Custom Hooks
import { useHelperProfile } from '@/hooks/useHelperProfile';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';

// Components
import { Sidebar } from '@/components/helper/home/Sidebar';
import {
  ProfileHeader,
  MobileProfileHeader,
  InfoCard,
  DocumentsCard,
  DocumentViewer,
  MobileMenu,
} from '@/components/helper/profile';

// Common Components
import {NotificationModal, LoadingSpinner, ConfirmationModal} from '@/components/common/';
import EditHelperProfileModal from '@/components/profile/EditProfileModal';
import HelperDocumentModal from '@/components/profile/DocumentManagementModal';

export default function HelperProfile() {
  const router = useRouter();
  const navigation = useNavigation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Logout state
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);
  const initiateLogout = () => {
    setIsMobileMenuOpen(false); // Close the side menu if it's open
    setConfirmLogoutVisible(true); // Pop up your nice notification!
  };

  const executeLogout = () => {
    setConfirmLogoutVisible(false);
    setSuccessLogoutVisible(true);
  }

  const renderLogoutModals = () => (
    <>
      <ConfirmationModal
        visible={confirmLogoutVisible}
        title="Confirm Logout"
        message="Are you sure you want to log out of your account?"
        confirmText="Logout"
        cancelText="Cancel"
        type="danger"
        onConfirm={executeLogout}
        onCancel={() => setConfirmLogoutVisible(false)}
      />
      <NotificationModal
        visible={successLogoutVisible}
        message="Logged Out successfully."
        type='success'
        autoClose={true}
        duration={1500}
        onClose={() => {
          setSuccessLogoutVisible(false);
          handleLogout();
        }}
      />
    </>
  );

  // Custom hooks
  const { handleLogout } = useAuth();
  const {
    profileData,
    loading,
    error,
    refresh,
    getFullName,
    getVerificationBadge,
    getDocument,
  } = useHelperProfile();
  const { isDesktop } = useResponsive();

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<{
    url: string;
    type: 'image' | 'pdf';
  } | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  // Show error modal if error exists
  React.useEffect(() => {
    if (error) {
      setErrorModalVisible(true);
    }
  }, [error]);

  // Handlers
  const handleViewFile = (doc: any) => {
    if (!doc.url) return;
    const isPdf = doc.file_path.toLowerCase().endsWith('.pdf');
    setViewingFile({ url: doc.url, type: isPdf ? 'pdf' : 'image' });
  };

  // Show loading spinner
  if (loading) {
    return <LoadingSpinner visible={true} message="Loading profile..." />;
  }

  // No profile data
  if (!profileData) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-circle-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>No profile data found</Text>
        <TouchableOpacity
          style={styles.createProfileBtn}
          onPress={() => setIsEditModalOpen(true)}
        >
          <Text style={styles.createProfileText}>Setup Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { user, profile } = profileData;
  const badge = getVerificationBadge();

  // Get documents
  const barangayClearance = getDocument('Barangay Clearance');
  const validId = getDocument('Valid ID');
  const policeClearance = getDocument('Police Clearance');
  const tesdaNc2 = getDocument('TESDA NC2');

  // Prepare personal info items
  const personalInfoItems = [
    { label: 'Gender', value: profile?.gender || 'Not specified' },
    { label: 'Date of Birth', value: profile?.date_of_birth || 'Not specified' },
    { label: 'Age', value: profile?.age ? `${profile.age} years old` : 'Not specified' },
    { label: 'Civil Status', value: profile?.civil_status || 'Not specified' },
    { label: 'Religion', value: profile?.religion || 'Not specified' },
    { label: 'Education Level', value: profile?.education_level || 'Not specified' },
    { label: 'Contact Number', value: profile?.contact_number || 'Not specified' },
  ];

  // Prepare work info items
  const workInfoItems = [
    { label: 'Employment Type', value: profile?.employment_type || 'Not specified' },
    { label: 'Work Schedule', value: profile?.work_schedule || 'Not specified' },
    { label: 'Years of Experience', value: profile?.years_experience ? `${profile.years_experience} years` : 'Entry Level' },
    { label: 'Expected Salary', value: profile?.expected_salary ? `₱${profile.expected_salary} / ${profile?.salary_period || 'month'}` : 'Negotiable' },
  ];

  // Prepare specialties items (Using the new mapped data from the hook!)
  const specialtiesItems = [
    { label: 'Job Categories', value: profileData?.mappedSpecialties?.jobs?.join(', ') || 'None selected' },
    { label: 'Skills', value: profileData?.mappedSpecialties?.skills?.join(', ') || 'None selected' },
    { label: 'Languages', value: profileData?.mappedSpecialties?.languages?.join(', ') || 'None selected' },
  ];

  // DESKTOP LAYOUT
  if (isDesktop) {
    return (
      <View style={[styles.container, {flexDirection: 'row'}]}>
        {/* Modals */}
        <NotificationModal
          visible={errorModalVisible}
          message={error || ''}
          type="error"
          onClose={() => setErrorModalVisible(false)}
        />

        <EditHelperProfileModal
          visible={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSaveSuccess={refresh}
        />

        <HelperDocumentModal
          visible={isDocumentModalOpen}
          onClose={() => setIsDocumentModalOpen(false)}
          onSaveSuccess={refresh}
        />

        <DocumentViewer
          visible={!!viewingFile}
          fileUrl={viewingFile?.url || null}
          fileType={viewingFile?.type || 'image'}
          onClose={() => setViewingFile(null)}
        />

        <Sidebar onLogout={initiateLogout} />

        <View style={styles.mainContent}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
          >
            {/* Page Header */}
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>My Profile</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditModalOpen(true)}
              >
                <Ionicons name="pencil" size={18} color="#fff" />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            <ProfileHeader
              profileImage={profile?.profile_image}
              fullName={getFullName()}
              bio={profile?.bio}
              badge={badge}
              onEditProfile={() => setIsEditModalOpen(true)}
              onManageDocuments={() => setIsDocumentModalOpen(true)}
            />

            <InfoCard
              icon="person-outline"
              iconColor="#FF9500"
              title="Personal Information"
              items={personalInfoItems}
            />

            <InfoCard
              icon="briefcase-outline"
              iconColor="#007AFF"
              title="Work Preferences"
              items={workInfoItems}
            />

            <InfoCard
              icon="star-outline"
              iconColor="#FF2D55"
              title="Specialties & Skills"
              items={specialtiesItems}
            />

            <InfoCard
              icon="location-outline"
              iconColor="#34C759"
              title="Address"
              items={[
                {
                  label: 'Full Address',
                  value: `${profile?.street || ''} ${profile?.barangay || ''}, ${
                    profile?.city || ''
                  }, ${profile?.province || ''}`,
                },
              ]}
            />

            <DocumentsCard
              barangayClearance={barangayClearance}
              validId={validId}
              policeClearance={policeClearance}
              tesdaNc2={tesdaNc2}
              onViewFile={handleViewFile}
              onManageDocuments={() => setIsDocumentModalOpen(true)}
            />
          </ScrollView>
          {renderLogoutModals()}
        </View>
      </View>
    );
  }

  // MOBILE LAYOUT
  return (
    <SafeAreaView style={styles.container}>
      {/* Modals */}
      <NotificationModal
        visible={errorModalVisible}
        message={error || ''}
        type="error"
        onClose={() => setErrorModalVisible(false)}
      />

      <EditHelperProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaveSuccess={refresh}
      />

      <HelperDocumentModal
        visible={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        onSaveSuccess={refresh}
      />

      <DocumentViewer
        visible={!!viewingFile}
        fileUrl={viewingFile?.url || null}
        fileType={viewingFile?.type || 'image'}
        onClose={() => setViewingFile(null)}
      />

      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsMobileMenuOpen(true)}
        >
          <Ionicons name="menu" size={28} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.mobileTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.editIconButton}
          onPress={() => setIsEditModalOpen(true)}
        >
          <Ionicons name="pencil" size={24} color="#FF9500" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.mobileScrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      >
        <MobileProfileHeader
          profileImage={profile?.profile_image}
          fullName={getFullName()}
          bio={profile?.bio} // <-- DON'T FORGET THIS FIX!
          badge={badge}
          onEditProfile={() => setIsEditModalOpen(true)}
          onManageDocuments={() => setIsDocumentModalOpen(true)}
        />

        <InfoCard
          icon="person-outline"
          iconColor="#FF9500"
          title="Personal Information"
          items={personalInfoItems}
        />

        <InfoCard
          icon="briefcase-outline"
          iconColor="#007AFF"
          title="Work Preferences"
          items={workInfoItems}
        />

        {/* ADD THIS RIGHT HERE FOR MOBILE */}
        <InfoCard
          icon="star-outline"
          iconColor="#FF2D55"
          title="Specialties & Skills"
          items={specialtiesItems}
        />

        <DocumentsCard
          barangayClearance={barangayClearance}
          validId={validId}
          policeClearance={policeClearance}
          tesdaNc2={tesdaNc2}
          onViewFile={handleViewFile}
          onManageDocuments={() => setIsDocumentModalOpen(true)}
        />
      </ScrollView>
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        handleLogout={initiateLogout}
      />
      {renderLogoutModals()}
    </SafeAreaView>
  );
}