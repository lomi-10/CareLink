// app/(parent)/profile.tsx
// Parent Profile Screen - Modularized & Clean

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Custom Hooks
import { useParentProfile } from '@/hooks/parent';
import { useAuth, useResponsive } from '@/hooks/shared';

// Components
import { Sidebar, MobileMenu } from '@/components/parent/home';
import { InfoCard } from '@/components/helper/profile'; 
import { 
  ChildrenList, 
  DocumentsCard, 
  DocumentViewer,
  ElderlyList,
  ProfileHeader,
  MobileProfileHeader,
} from '@/components/parent/profile';
import { styles } from './profile.style';

// Common Components
import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/shared';
// STUDY: Parent modals live under components/parent/profile/ (role-aligned folder).
import EditParentProfileModal from '@/components/parent/profile/EditParentProfileModal';
import ParentDocumentModal from '@/components/parent/profile/ParentDocumentModal';

export default function ParentProfile() {
  const router = useRouter();
  const navigation = useNavigation();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const {
    profileData,
    loading,
    error,
    refresh,
    getFullName,
    getVerificationBadge,
    getDocument,
  } = useParentProfile();

  // State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  
  // Profile Modals State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ url: string; type: 'image' | 'pdf'; } | null>(null);
  
  // Logout Modals State
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

  React.useEffect(() => {
    if (error) setErrorModalVisible(true);
  }, [error]);

  const handleViewFile = (doc: any) => {
    if (!doc.url) return;
    const isPdf = doc.file_path.toLowerCase().endsWith('.pdf');
    setViewingFile({ url: doc.url, type: isPdf ? 'pdf' : 'image' });
  };

  // Logout Handlers
  const initiateLogout = () => {
    setIsMobileMenuOpen(false); 
    setConfirmLogoutVisible(true); 
  };

  const executeLogout = () => {
    setConfirmLogoutVisible(false);
    setSuccessLogoutVisible(true);
  };

  if (loading) return <LoadingSpinner visible={true} message="Loading profile..." />;

  if (!profileData) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-circle-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>No profile data found</Text>
        <TouchableOpacity style={styles.createProfileBtn} onPress={() => setIsEditModalOpen(true)}>
          <Text style={styles.createProfileText}>Setup Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { user, profile, household, children, elderly } = profileData;
  const badge = getVerificationBadge();
  const barangayClearance = getDocument('Barangay Clearance');
  const validId = getDocument('Valid ID');

  const personalInfoItems = [
    { label: 'Username', value: user?.username || 'Not specified' },
    { label: 'Email', value: user?.email || 'Not specified' },
    { label: 'Contact Number', value: profile?.contact_number || 'Not specified' },
  ];

  const householdInfoItems = [
    { label: 'Total Household Size', value: household?.household_size?.toString() || 'Not specified' },
    { label: 'Children', value: profileData.children_count?.toString() || '0' },
    { label: 'Elderly Members', value: profileData.elderly_count?.toString() || '0' },
    { label: 'Pets', value: household?.has_pets ? (household?.pet_details || 'Yes') : 'None' },
  ];

  const addressItems = [
    { label: 'Full Address', value: profile?.address || 'Not specified' },
    { label: 'Province', value: profile?.province || 'Not specified' },
    { label: 'Municipality', value: profile?.municipality || 'Not specified' },
    { label: 'Barangay', value: profile?.barangay || 'Not specified' },
    { label: 'Nearest Landmark', value: profile?.landmark || 'None specified' },
  ];

  // ==========================================
  // MODALS GROUPING
  // ==========================================
  const renderModals = () => (
    <>
      <NotificationModal visible={errorModalVisible} message={error || ''} type="error" onClose={() => setErrorModalVisible(false)} />
      
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out of your account?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose={true} duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      
      <EditParentProfileModal visible={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSaveSuccess={refresh} />
      <ParentDocumentModal visible={isDocumentModalOpen} onClose={() => setIsDocumentModalOpen(false)} onSaveSuccess={refresh} />
      
      <DocumentViewer visible={!!viewingFile} fileUrl={viewingFile?.url || null} fileType={viewingFile?.type || 'image'} onClose={() => setViewingFile(null)} />
    </>
  );

  // ==========================================
  // UI VARIABLE (The shared scrolling content)
  // ==========================================
  const profileContent = (
    <ScrollView 
      contentContainerStyle={isDesktop ? styles.scrollContent : styles.mobileScrollContent} 
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
    >
      {/* Show Desktop Header or Mobile Header based on screen size */}
      {isDesktop ? (
        <>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>My Profile</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditModalOpen(true)}>
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
        </>
      ) : (
        <MobileProfileHeader
          profileImage={profile?.profile_image}
          fullName={getFullName()}
          badge={badge}
          onEditProfile={() => setIsEditModalOpen(true)}
          onManageDocuments={() => setIsDocumentModalOpen(true)}
        />
      )}

      {/* Shared Info Cards */}
      <InfoCard icon="person-outline" iconColor="#007AFF" title="Personal Information" items={personalInfoItems} />
      
      <InfoCard icon="home-outline" iconColor="#34C759" title="Household Information" items={householdInfoItems}>
        <ChildrenList children={children} />
        <ElderlyList elderly={elderly} />
      </InfoCard>

      <InfoCard icon="location-outline" iconColor="#FF9500" title="Address Details" items={addressItems} />

      <DocumentsCard
        barangayClearance={barangayClearance}
        validId={validId}
        onViewFile={handleViewFile}
        onManageDocuments={() => setIsDocumentModalOpen(true)}
      />
    </ScrollView>
  );

  // ==========================================
  // DESKTOP RETURN
  // ==========================================
  if (isDesktop) {
    return (
      <View style={[styles.container, { flexDirection: 'row' }]}>
        {renderModals()}
        <Sidebar onLogout={initiateLogout} />
        <View style={styles.mainContent}>
          {profileContent}
        </View>
      </View>
    );
  }

  // ==========================================
  // MOBILE RETURN
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      {renderModals()}

      <View style={styles.mobileHeader}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsMobileMenuOpen(true)}>
          <Ionicons name="menu" size={28} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.mobileTitle}>My Profile</Text>
        <TouchableOpacity style={styles.editIconButton} onPress={() => setIsEditModalOpen(true)}>
          <Ionicons name="pencil" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {profileContent}

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}