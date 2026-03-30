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
  // JOB SELECTION & FETCHING
  // ==========================================
  const { jobs } = useParentJobs();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('General Househelp');
  const [selectedJobId, setSelectedJobId] = useState<string>((params.job_id as string) || '');
  
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);

  // 1. Get unique categories from the parent's posted jobs
  const availableCategories = [
    'General Household', 
    ...Array.from(new Set(jobs.map(j => j.category_name).filter(c => c && c !== 'General Household')))
  ];

  // 2. Filter the jobs based on the selected category
  const displayJobs = selectedCategory === 'General Household' 
    ? jobs 
    : jobs.filter(job => job.category_name === selectedCategory);

  // 3. Auto-select the first job when the category changes
  useEffect(() => {
    if (displayJobs.length > 0) {
      const isCurrentJobInList = displayJobs.some(j => j.job_post_id === selectedJobId);
      if (!isCurrentJobInList || !selectedJobId) {
        setSelectedJobId(displayJobs[0].job_post_id);
      }
    } else {
      setSelectedJobId(''); // No jobs in this category
    }
  }, [selectedCategory, jobs]);

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
  // UI STATES
  // ==========================================
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  
  // Logout Modals State
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

  // Profile & Status Update States
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedHelper, setSelectedHelper] = useState<any>(null);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' as 'success'|'error' });

  useEffect(() => {
    if (error) setErrorModalVisible(true);
  }, [error]);

  // ==========================================
  // HANDLERS
  // ==========================================
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

  // ==========================================
  // MODALS GROUPING
  // ==========================================
  const renderModals = () => (
    <>
      <NotificationModal visible={errorModalVisible} message={error || ''} type="error" onClose={() => setErrorModalVisible(false)} />
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification({...notification, visible: false})} />
      
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out of your account?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose={true} duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      
      <HelperProfileModal visible={profileModalVisible} helper={selectedHelper} onClose={() => setProfileModalVisible(false)} onInvite={() => {}} />
    </>
  );

  // 1. Loading State
  if (loading || checkingJobs) {
    return <LoadingSpinner visible={true} message="Loading applications..." />;
  }

  // 2. Empty State (No jobs posted at all)
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

  // 3. Main Content Setup
  const filteredApps = getApplicationsByStatus(activeFilter);

  const JobSelector = () => {
    const selectedJob = jobs.find(j => j.job_post_id === selectedJobId);

    return (
      <View style={styles.selectorsWrapper}>
        
        {/* STEP 1: CATEGORY SELECTOR */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.sectionTitle}>1. Select Category:</Text>
          <TouchableOpacity 
            style={[styles.dropdownHeader, isCategoryDropdownOpen && styles.dropdownHeaderActive]} 
            activeOpacity={0.7}
            onPress={() => {
              setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
              setIsJobDropdownOpen(false); // Close the other one
            }}
          >
            <Text style={styles.dropdownSelectedTitle}>{selectedCategory}</Text>
            <Ionicons name={isCategoryDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
          </TouchableOpacity>

          {isCategoryDropdownOpen && (
            <View style={styles.dropdownListContainer}>
              <ScrollView style={styles.dropdownListScroll} nestedScrollEnabled={true}>
                {availableCategories.map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dropdownItem, selectedCategory === cat && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedCategory(cat as string);
                      setIsCategoryDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemTitle, selectedCategory === cat && styles.dropdownItemTitleActive]}>
                      {cat} {cat === 'General Household' && '(All Jobs)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* STEP 2: JOB SELECTOR */}
        <View style={[styles.dropdownContainer, { zIndex: -1 }]}>
          <Text style={styles.sectionTitle}>2. Select Job Post:</Text>
          <TouchableOpacity 
            style={[styles.dropdownHeader, isJobDropdownOpen && styles.dropdownHeaderActive, displayJobs.length === 0 && styles.dropdownHeaderDisabled]} 
            activeOpacity={0.7}
            disabled={displayJobs.length === 0}
            onPress={() => {
              setIsJobDropdownOpen(!isJobDropdownOpen);
              setIsCategoryDropdownOpen(false); // Close the other one
            }}
          >
            <View>
              <Text style={styles.dropdownSelectedTitle}>
                {displayJobs.length === 0 ? 'No jobs in this category' : (selectedJob?.title || 'Select a Job')}
              </Text>
              {selectedJob && (
                <Text style={styles.dropdownSelectedSubtitle}>
                  {selectedJob.status} • {selectedJob.application_count} Applicants
                </Text>
              )}
            </View>
            <Ionicons name={isJobDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
          </TouchableOpacity>

          {isJobDropdownOpen && (
            <View style={styles.dropdownListContainer}>
              <ScrollView style={styles.dropdownListScroll} nestedScrollEnabled={true}>
                {displayJobs.map((job) => (
                  <TouchableOpacity
                    key={job.job_post_id}
                    style={[styles.dropdownItem, selectedJobId === job.job_post_id && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedJobId(job.job_post_id);
                      setIsJobDropdownOpen(false);
                    }}
                  >
                    <View style={styles.dropdownItemContent}>
                      <Text style={[styles.dropdownItemTitle, selectedJobId === job.job_post_id && styles.dropdownItemTitleActive]}>
                        {job.title}
                      </Text>
                      <View style={styles.dropdownBadge}>
                        <Text style={styles.dropdownBadgeText}>{job.application_count} Apps</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
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

  // ==========================================
  // UI VARIABLE (Shared Applications List)
  // ==========================================
  const applicationsContent = (
    <View style={isDesktop ? styles.scrollContent : styles.mobileScrollContent}>
      {/* Desktop Only Header */}
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

  // ==========================================
  // DESKTOP LAYOUT
  // ==========================================
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

  // ==========================================
  // MOBILE LAYOUT
  // ==========================================
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