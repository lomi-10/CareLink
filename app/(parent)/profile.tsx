// app/(parent)/profile.tsx
// Parent Profile Screen - Modularized & Clean

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Custom Hooks
import { useParentProfile } from '@/hooks/useParentProfile';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';

// Components
import { Sidebar } from '@/components/parent/home/Sidebar';
import {
  ProfileHeader,
  MobileProfileHeader,
  InfoCard,
  DocumentsCard,
  DocumentViewer,
} from '@/components/helper/profile'; // Reusing helper components!
import { ChildrenList } from '@/components/parent/profile';

// Common Components
import LoadingSpinner from '@/components/common/LoadingSpinner';
import NotificationModal from '@/components/common/NotificationModal';
import EditParentProfileModal from '@/components/profile/EditParentProfileModal';
import ParentDocumentModal from '@/components/profile/ParentDocumentModal';

export default function ParentProfile() {
  const router = useRouter();
  const navigation = useNavigation();

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
  const { isDesktop } = useResponsive();

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<{
    url: string;
    type: 'image' | 'pdf';
  } | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  React.useEffect(() => {
    if (error) {
      setErrorModalVisible(true);
    }
  }, [error]);

  const handleViewFile = (doc: any) => {
    if (!doc.url) return;
    const isPdf = doc.file_path.toLowerCase().endsWith('.pdf');
    setViewingFile({ url: doc.url, type: isPdf ? 'pdf' : 'image' });
  };

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading profile..." />;
  }

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

  const { user, profile, household, children } = profileData;
  const badge = getVerificationBadge();

  // Get documents
  const barangayClearance = getDocument('Barangay Clearance');
  const validId = getDocument('Valid ID');

  // Prepare personal info items
  const personalInfoItems = [
    { label: 'Email', value: user?.email || 'Not specified' },
    { label: 'Contact Number', value: profile?.contact_number || 'Not specified' },
  ];

  // Prepare household info items
  const householdInfoItems = [
    {
      label: 'Household Size',
      value: household?.household_size?.toString() || 'Not specified',
    },
    {
      label: 'Number of Children',
      value: profileData.children_count?.toString() || '0',
    },
    { label: 'Pets', value: household?.has_pets ? 'Yes' : 'No' },
    { label: 'Special Needs', value: household?.special_needs_care ? 'Yes' : 'No' },
  ];

  // DESKTOP LAYOUT
  if (isDesktop) {
    return (
      <View style={styles.container}>
        <NotificationModal
          visible={errorModalVisible}
          message={error || ''}
          type="error"
          onClose={() => setErrorModalVisible(false)}
        />

        <EditParentProfileModal
          visible={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSaveSuccess={refresh}
        />

        <ParentDocumentModal
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

        <Sidebar onLogout={handleLogout} />

        <View style={styles.mainContent}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
          >
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
              iconColor="#007AFF"
              title="Personal Information"
              items={personalInfoItems}
            />

            <InfoCard
              icon="home-outline"
              iconColor="#34C759"
              title="Household Information"
              items={householdInfoItems}
            >
              <ChildrenList children={children} />
            </InfoCard>

            <InfoCard
              icon="location-outline"
              iconColor="#FF9500"
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
              policeClearance={{ status: 'pending', url: null, file_path: '' }}
              tesdaNc2={{ status: 'pending', url: null, file_path: '' }}
              onViewFile={handleViewFile}
              onManageDocuments={() => setIsDocumentModalOpen(true)}
            />
          </ScrollView>
        </View>
      </View>
    );
  }

  // MOBILE LAYOUT
  return (
    <View style={styles.container}>
      <NotificationModal
        visible={errorModalVisible}
        message={error || ''}
        type="error"
        onClose={() => setErrorModalVisible(false)}
      />

      <EditParentProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaveSuccess={refresh}
      />

      <ParentDocumentModal
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

      <View style={styles.mobileHeader}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu" size={28} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.mobileTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.editIconButton}
          onPress={() => setIsEditModalOpen(true)}
        >
          <Ionicons name="pencil" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.mobileScrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      >
        <MobileProfileHeader
          profileImage={profile?.profile_image}
          fullName={getFullName()}
          badge={badge}
          onEditProfile={() => setIsEditModalOpen(true)}
          onManageDocuments={() => setIsDocumentModalOpen(true)}
        />

        <InfoCard
          icon="person-outline"
          iconColor="#007AFF"
          title="Personal Information"
          items={personalInfoItems}
        />

        <InfoCard
          icon="home-outline"
          iconColor="#34C759"
          title="Household Information"
          items={householdInfoItems}
        >
          <ChildrenList children={children} />
        </InfoCard>

        <DocumentsCard
          barangayClearance={barangayClearance}
          validId={validId}
          policeClearance={{ status: 'pending', url: null, file_path: '' }}
          tesdaNc2={{ status: 'pending', url: null, file_path: '' }}
          onViewFile={handleViewFile}
          onManageDocuments={() => setIsDocumentModalOpen(true)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  createProfileBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  createProfileText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 32,
    paddingBottom: 60,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuButton: {
    padding: 8,
  },
  mobileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  editIconButton: {
    padding: 8,
  },
  mobileScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
