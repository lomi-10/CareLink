// app/(parent)/applications.tsx
// Parent Applications Screen - Modularized & Clean

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Hooks
import { useJobApplications } from '@/hooks/useJobApplications';
import { useParentJobs } from '@/hooks/useParentJobs';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';

// Components
import { ApplicationCard } from '@/components/parent/jobs/ApplicationCard';
import { LoadingSpinner, NotificationModal, ConfirmationModal } from '@/components/common/';
import { Sidebar, MobileMenu } from '@/components/parent/home';
import { HelperProfileModal } from '@/components/parent/browse/';
import { styles } from './applications.styles';

export default function JobApplications() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();

  // ==========================================
  // JOB SELECTION & FETCHING LOGIC
  // ==========================================
  
  // 1. Fetch both datasets
  const { masterCategories, masterJobs, loadingMaster } = useMasterData();
  const { jobs: postedJobs } = useParentJobs(); // The jobs this parent actually posted
  
  // 2. Set default states to EMPTY so the user is forced to click
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);

  // 3. THE BUG FIX: Reset the Job ID when the Category changes
  useEffect(() => {
    if (selectedCategory) {
      // When category changes, check if the currently selected job belongs to it
      const jobStillValid = postedJobs.find(
        (job: any) => job.job_post_id === selectedJobId && job.category_name === selectedCategory
      );
      
      // If the job doesn't match the new category, clear it!
      if (!jobStillValid) {
        setSelectedJobId(''); 
      }
    }
  }, [selectedCategory, postedJobs, selectedJobId]);

  // 4. Fetch the applications based on the final selectedJobId
  const { 
    applications, 
    loading, 
    error, 
    hasPostedJobs, 
    checkingJobs, 
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
    setSelectedHelper({
      profile_id: application.profile_id, 
      user_id: application.helper_id,
      full_name: application.helper_name,
      profile_image: application.helper_photo,
      age: application.helper_age,
      email: application.helper_email,
      phone: application.helper_phone,
      categories: application.helper_categories || [], 
      verification_status: application.verification_status || 'Pending',
      availability_status: application.availability_status || 'Available'
    });
    setProfileModalVisible(true);
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: 'Shortlisted' | 'Rejected') => {
    try {
      if (updateApplicationStatus) {
        const result = await updateApplicationStatus(applicationId, newStatus);
        if (result.success) {
          setNotification({ visible: true, message: `Application ${newStatus}!`, type: 'success' });
        }
      }
    } catch (err: any) {
      setNotification({ visible: true, message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const renderModals = () => (
    <>
      <NotificationModal visible={errorModalVisible} message={error || ''} type="error" onClose={() => setErrorModalVisible(false)} />
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification({...notification, visible: false})} />
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out of your account?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose={true} duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      <HelperProfileModal visible={profileModalVisible} helper={selectedHelper} onClose={() => setProfileModalVisible(false)} onInvite={() => {}} />
    </>
  );

  // Added `loadingMaster` here so it doesn't crash while fetching master categories
  if (loading || checkingJobs || loadingMaster) {
    return <LoadingSpinner visible={true} message="Loading applications..." />;
  }

  if (!hasPostedJobs && !selectedJobId) {
    return (
      <SafeAreaView style={[styles.container, isDesktop && { flexDirection: 'row' }]}>
        {renderModals()}
        {isDesktop && <Sidebar onLogout={initiateLogout} />}
        
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No Jobs Posted Yet</Text>
          <TouchableOpacity style={styles.createProfileBtn} onPress={() => router.push('/(parent)/jobs')}>
            <Text style={styles.createProfileText}>Post a Job</Text>
          </TouchableOpacity>
          
          {!isDesktop && (
            <TouchableOpacity style={[styles.menuButton, { position: 'absolute', top: 10, left: 16 }]} onPress={() => setIsMobileMenuOpen(true)}>
              <Ionicons name="menu" size={32} color="#1A1C1E" />
            </TouchableOpacity>
          )}
          <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
        </View>
      </SafeAreaView>
    );
  }

  const filteredApps = getApplicationsByStatus(activeFilter);

  // ==========================================
  // TWO-STEP DROPDOWN UI
  // ==========================================
  const JobSelector = () => {
    // --- LOCKING LOGIC ---
    const isCategoryLocked = (catName: string) => {
      return !postedJobs.some((posted: any) => posted.category_name === catName);
    };

    const isJobLocked = (jobTitle: string) => {
      return !postedJobs.some((posted: any) => posted.title === jobTitle && posted.category_name === selectedCategory);
    };

    const availableMasterJobs = masterJobs.filter((mj: any) => mj.category_name === selectedCategory);
    const currentlySelectedJob = postedJobs.find((j: any) => j.job_post_id === selectedJobId);

    return (
      <View style={styles.selectorsWrapper}>
        
        {/* 1. CATEGORY DROPDOWN */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.sectionTitle}>1. Select Category:</Text>
          <TouchableOpacity 
            style={[styles.dropdownHeader, isCategoryDropdownOpen && styles.dropdownHeaderActive]} 
            activeOpacity={0.7}
            onPress={() => {
              setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
              setIsJobDropdownOpen(false);
            }}
          >
            <Text style={styles.dropdownSelectedTitle}>
              {selectedCategory || 'Select Category...'}
            </Text>
            <Ionicons name={isCategoryDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
          </TouchableOpacity>

          {isCategoryDropdownOpen && (
            <View style={styles.dropdownListContainer}>
              <ScrollView style={styles.dropdownListScroll} nestedScrollEnabled={true}>
                {masterCategories.map((cat: any) => {
                  const locked = isCategoryLocked(cat.category_name);
                  
                  return (
                    <TouchableOpacity
                      key={cat.category_id}
                      style={[styles.dropdownItem, selectedCategory === cat.category_name && styles.dropdownItemActive]}
                      disabled={locked} // LOCK IT HERE
                      onPress={() => {
                        setSelectedCategory(cat.category_name);
                        setIsCategoryDropdownOpen(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemTitle, 
                        selectedCategory === cat.category_name && styles.dropdownItemTitleActive,
                        locked && { color: '#ccc' } // GREY OUT TEXT IF LOCKED
                      ]}>
                        {cat.category_name} {locked ? '(No Jobs Posted)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 2. JOB DROPDOWN */}
        <View style={[styles.dropdownContainer, { zIndex: -1 }]}>
          <Text style={styles.sectionTitle}>2. Select Job Post:</Text>
          
          <TouchableOpacity 
            style={[
              styles.dropdownHeader, 
              isJobDropdownOpen && styles.dropdownHeaderActive, 
              !selectedCategory && styles.dropdownHeaderDisabled 
            ]} 
            activeOpacity={0.7}
            disabled={!selectedCategory} 
            onPress={() => setIsJobDropdownOpen(!isJobDropdownOpen)}
          >
            <View>
              <Text style={styles.dropdownSelectedTitle}>
                {!selectedCategory 
                  ? 'Waiting for category...' 
                  : currentlySelectedJob 
                    ? currentlySelectedJob.title 
                    : 'Select Job...'
                }
              </Text>
              {currentlySelectedJob && (
                <Text style={styles.dropdownSelectedSubtitle}>
                  {currentlySelectedJob.status} • {currentlySelectedJob.application_count} Applicants
                </Text>
              )}
            </View>
            <Ionicons name={isJobDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
          </TouchableOpacity>

          {isJobDropdownOpen && (
            <View style={styles.dropdownListContainer}>
              <ScrollView style={styles.dropdownListScroll} nestedScrollEnabled={true}>
                {availableMasterJobs.map((masterJob: any) => {
                  const locked = isJobLocked(masterJob.job_title);
                  
                  return (
                    <TouchableOpacity
                      key={masterJob.job_id}
                      style={[styles.dropdownItem, currentlySelectedJob?.title === masterJob.job_title && styles.dropdownItemActive]}
                      disabled={locked} // LOCK IT HERE
                      onPress={() => {
                        // Find the ACTUAL posted job ID so we can fetch applications
                        const actualPostedJob = postedJobs.find((pj: any) => pj.title === masterJob.job_title && pj.category_name === selectedCategory);
                        if (actualPostedJob) {
                          setSelectedJobId(actualPostedJob.job_post_id);
                          setIsJobDropdownOpen(false);
                        }
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemTitle, 
                        currentlySelectedJob?.title === masterJob.job_title && styles.dropdownItemTitleActive,
                        locked && { color: '#ccc' } // GREY OUT TEXT IF LOCKED
                      ]}>
                        {masterJob.job_title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

      </View>
    );
  };

  const FilterTabs = () => (
    <View style={styles.filterContainer}>
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
    </View>
  );

  const applicationsContent = (
    <View style={isDesktop ? styles.scrollContent : styles.mobileScrollContent}>
      {isDesktop && (
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>All Applications</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push('/(parent)/jobs')}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.editButtonText}>View Posted Jobs</Text>
          </TouchableOpacity>
        </View>
      )}

      <JobSelector />
      <FilterTabs />

      <FlatList
        data={filteredApps}
        keyExtractor={(item) => item.application_id}
        renderItem={({ item }) => (
          <ApplicationCard 
            application={item} 
            onViewProfile={() => handleViewProfile(item)}
            onShortlist={() => handleUpdateStatus(item.application_id, 'Shortlisted')}
            onReject={() => handleUpdateStatus(item.application_id, 'Rejected')}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={[styles.emptyState, { marginTop: 40, backgroundColor: 'transparent' }]}>
            <Ionicons name="folder-open-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No applications found</Text>
          </View>
        }
      />
    </View>
  );

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

  return (
    <SafeAreaView style={styles.container}>
      {renderModals()}
      <View style={styles.mobileHeader}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsMobileMenuOpen(true)}>
          <Ionicons name="menu" size={28} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.mobileTitle}>Applications</Text>
        <View style={{ width: 44 }} />
      </View>
      {applicationsContent}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}