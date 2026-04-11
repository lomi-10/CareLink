// app/(parent)/applications.tsx
// Parent Applications Screen - Modularized & Clean

import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Hooks
import { useJobApplications, useParentJobs } from '@/hooks/parent';
import { useAuth, useResponsive } from '@/hooks/shared';

// Components
import { ApplicationCard } from '@/components/parent/jobs/ApplicationCard';
import { LoadingSpinner, NotificationModal, ConfirmationModal } from '@/components/shared/';
import { Sidebar, MobileMenu } from '@/components/parent/home';
import { HelperProfileModal } from '@/components/parent/browse/';
import { styles } from './applications.styles';

export default function JobApplications() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();

  // ==========================================
  // JOB SELECTION & FETCHING LOGIC
  // ==========================================
  const { jobs: postedJobs, loading: loadingJobs } = useParentJobs(); 
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);

  const parentCategories = Array.from(
    new Set(postedJobs.map((pj: any) => pj.category_name))
  ).filter(Boolean) as string[];

  const availablePostedJobs = postedJobs.filter(
    (pj: any) => pj.category_name === selectedCategory
  );

  const currentlySelectedJob = postedJobs.find((j: any) => j.job_post_id === selectedJobId);

  useEffect(() => {
    if (selectedCategory) {
      const jobStillValid = availablePostedJobs.find(
        (job: any) => job.job_post_id === selectedJobId
      );
      if (!jobStillValid) setSelectedJobId(''); 
    }
  }, [selectedCategory, postedJobs, selectedJobId]);

  const { 
    applications, 
    loading: loadingApps, 
    error, 
    refresh, 
    getApplicationsByStatus,
    updateApplicationStatus
  } = useJobApplications(selectedJobId);

  // ==========================================
  // UI STATES & MODALS
  // ==========================================
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedHelper, setSelectedHelper] = useState<any>(null);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' as 'success'|'error' });

  // NEW: Confirmation Modal State for Shortlist/Reject
  const [statusConfirm, setStatusConfirm] = useState<{ visible: boolean, appId: string, action: 'Shortlisted' | 'Rejected' | null }>({
    visible: false,
    appId: '',
    action: null
  });

  useEffect(() => {
    if (error) setErrorModalVisible(true);
  }, [error]);

  const initiateLogout = () => {
    setIsMobileMenuOpen(false);
    setConfirmLogoutVisible(true);
  };

  const executeLogout = () => {
    setConfirmLogoutVisible(false);
    setSuccessLogoutVisible(true);
  };

  const handleViewProfile = (application: any) => {
    // Pass ALL application data to the profile modal
    setSelectedHelper({
      ...application,
      profile_id: application.profile_id, 
      user_id: application.helper_id,
      full_name: application.helper_name,
      profile_image: application.helper_photo,
      age: application.helper_age,
      gender: application.helper_gender,
      email: application.helper_email,
      phone: application.helper_phone,
      categories: application.helper_categories || [], 
      verification_status: application.verification_status || 'Pending',
      availability_status: application.availability_status || 'Available',
      experience_years: application.helper_experience_years,
      rating_average: application.helper_rating_average,
      bio: application.helper_bio,
    });
    setProfileModalVisible(true);
  };

  const executeStatusUpdate = async () => {
    if (!statusConfirm.action || !statusConfirm.appId) return;
    
    const actionToPerform = statusConfirm.action;
    const appIdToUpdate = statusConfirm.appId;
    
    // Close modal immediately
    setStatusConfirm({ visible: false, appId: '', action: null });

    try {
      if (updateApplicationStatus) {
        const result = await updateApplicationStatus(appIdToUpdate, actionToPerform);
        if (result.success) {
          setNotification({ visible: true, message: `Application successfully ${actionToPerform.toLowerCase()}!`, type: 'success' });
        }
      }
    } catch (err: any) {
      setNotification({ visible: true, message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const handleSendMessage = () => {
    setProfileModalVisible(false);
    setNotification({ visible: true, message: "Messaging feature is coming soon!", type: "info" as any });
  };

  const renderModals = () => (
    <>
      <NotificationModal visible={errorModalVisible} message={error || ''} type="error" onClose={() => setErrorModalVisible(false)} />
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification({...notification, visible: false})} autoClose duration={2000} />
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out of your account?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose={true} duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      <HelperProfileModal visible={profileModalVisible} helper={selectedHelper} onClose={() => setProfileModalVisible(false)} onInvite={handleSendMessage} />
      
      {/* NEW: Confirmation for Reject/Shortlist */}
      <ConfirmationModal 
        visible={statusConfirm.visible} 
        title={statusConfirm.action === 'Shortlisted' ? 'Shortlist Applicant?' : 'Reject Applicant?'} 
        message={statusConfirm.action === 'Shortlisted' ? 'Are you sure you want to shortlist this applicant? They will be notified.' : 'Are you sure you want to reject this applicant? This action cannot be undone.'} 
        confirmText={statusConfirm.action === 'Shortlisted' ? 'Yes, Shortlist' : 'Yes, Reject'} 
        cancelText="Cancel" 
        type={statusConfirm.action === 'Shortlisted' ? 'success' : 'danger'} 
        onConfirm={executeStatusUpdate} 
        onCancel={() => setStatusConfirm({ visible: false, appId: '', action: null })} 
      />
    </>
  );

  if (loadingJobs || (loadingApps && selectedJobId !== '')) {
    return <LoadingSpinner visible={true} message="Loading..." />;
  }

  // EMPTY STATE (No Jobs Posted)
  if (postedJobs.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDesktop && { flexDirection: 'row' }]}>
        {renderModals()}
        {isDesktop && <Sidebar onLogout={initiateLogout} />}
        
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={80} color="#CBD5E1" />
          <Text style={styles.emptyText}>No Jobs Posted Yet</Text>
          <TouchableOpacity style={styles.createProfileBtn} onPress={() => router.push('/(parent)/jobs')}>
            <Text style={styles.createProfileText}>Post Your First Job</Text>
          </TouchableOpacity>
          
          {!isDesktop && (
            <TouchableOpacity style={[styles.menuButton, { position: 'absolute', top: 10, left: 16 }]} onPress={() => setIsMobileMenuOpen(true)}>
              <Ionicons name="menu" size={32} color="#111827" />
            </TouchableOpacity>
          )}
          <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
        </View>
      </SafeAreaView>
    );
  }

  const filteredApps = getApplicationsByStatus(activeFilter);

  // MAIN CONTENT VIEW
  const applicationsContent = (
    <View style={isDesktop ? styles.scrollContent : styles.mobileScrollContent}>
      {isDesktop && (
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Review Applications</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push('/(parent)/jobs')}>
            <Ionicons name="briefcase-outline" size={18} color="#fff" />
            <Text style={styles.editButtonText}>View Posted Jobs</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- SELECTORS W/ ACTUAL POSTED DATA --- */}
      <View style={styles.selectorsWrapper}>
        {/* 1. CATEGORY DROPDOWN */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.sectionTitle}>1. Select Category</Text>
          <TouchableOpacity 
            style={[styles.dropdownHeader, isCategoryDropdownOpen && styles.dropdownHeaderActive]} 
            activeOpacity={0.7}
            onPress={() => {
              setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
              setIsJobDropdownOpen(false);
            }}
          >
            <Text style={styles.dropdownSelectedTitle}>{selectedCategory || 'Select a Category...'}</Text>
            <Ionicons name={isCategoryDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
          </TouchableOpacity>
          {isCategoryDropdownOpen && (
            <View style={styles.dropdownListContainer}>
              <ScrollView style={styles.dropdownListScroll} nestedScrollEnabled={true}>
                {parentCategories.map((catName: string) => (
                  <TouchableOpacity
                    key={catName}
                    style={[styles.dropdownItem, selectedCategory === catName && styles.dropdownItemActive]}
                    onPress={() => { setSelectedCategory(catName); setIsCategoryDropdownOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemTitle, selectedCategory === catName && styles.dropdownItemTitleActive]}>{catName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 2. JOB DROPDOWN */}
        <View style={[styles.dropdownContainer, { zIndex: -1 }]}>
          <Text style={styles.sectionTitle}>2. Select Job Post</Text>
          <TouchableOpacity 
            style={[styles.dropdownHeader, isJobDropdownOpen && styles.dropdownHeaderActive, !selectedCategory && styles.dropdownHeaderDisabled]} 
            activeOpacity={0.7}
            disabled={!selectedCategory} 
            onPress={() => setIsJobDropdownOpen(!isJobDropdownOpen)}
          >
            <View>
              <Text style={styles.dropdownSelectedTitle}>
                {!selectedCategory ? 'Waiting for category...' : currentlySelectedJob ? currentlySelectedJob.title : 'Select Job Post...'}
              </Text>
              {currentlySelectedJob && (
                <Text style={styles.dropdownSelectedSubtitle}>
                  {currentlySelectedJob.status} • {currentlySelectedJob.application_count || 0} Applicants
                </Text>
              )}
            </View>
            <Ionicons name={isJobDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
          </TouchableOpacity>
          {isJobDropdownOpen && (
            <View style={styles.dropdownListContainer}>
              <ScrollView style={styles.dropdownListScroll} nestedScrollEnabled={true}>
                {availablePostedJobs.map((postedJob: any) => (
                  <TouchableOpacity
                    key={postedJob.job_post_id}
                    style={[styles.dropdownItem, currentlySelectedJob?.job_post_id === postedJob.job_post_id && styles.dropdownItemActive]}
                    onPress={() => { setSelectedJobId(postedJob.job_post_id); setIsJobDropdownOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemTitle, currentlySelectedJob?.job_post_id === postedJob.job_post_id && styles.dropdownItemTitleActive]}>{postedJob.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* --- FILTER TABS (Scrollable) --- */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {['all', 'Pending', 'Reviewed', 'Shortlisted', 'Accepted'].map((filter) => (
            <TouchableOpacity
              key={filter} 
              style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterTabText, activeFilter === filter && styles.filterTabTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* --- APPLICATIONS LIST --- */}
      <FlatList
        data={filteredApps}
        keyExtractor={(item) => item.application_id}
        renderItem={({ item }) => (
          <ApplicationCard 
            application={item} 
            onViewProfile={() => handleViewProfile(item)}
            onShortlist={() => setStatusConfirm({ visible: true, appId: item.application_id, action: 'Shortlisted' })}
            onReject={() => setStatusConfirm({ visible: true, appId: item.application_id, action: 'Rejected' })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loadingApps} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={[styles.emptyState, { marginTop: 20, backgroundColor: 'transparent' }]}>
            <Ionicons name="folder-open-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {selectedJobId ? "No applications found" : "Please select a job above to view applications"}
            </Text>
          </View>
        }
      />
    </View>
  );

  // DESKTOP RENDER
  if (isDesktop) {
    return (
      <View style={[styles.container, { flexDirection: 'row' }]}>
        {renderModals()}
        <Sidebar onLogout={initiateLogout} />
        <View style={styles.mainContent}>
          {applicationsContent}
        </View>
      </View>
    );
  }

  // MOBILE RENDER
  return (
    <SafeAreaView style={styles.container}>
      {renderModals()}
      <View style={styles.mobileHeader}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsMobileMenuOpen(true)}>
          <Ionicons name="menu" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.mobileTitle}>Review Applications</Text>
        <View style={{ width: 44 }} />
      </View>
      {applicationsContent}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}