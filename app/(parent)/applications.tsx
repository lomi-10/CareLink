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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Hooks
import { useJobApplications } from '@/hooks/useJobApplications';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';

// Components
import { ApplicationCard } from '@/components/parent/jobs/ApplicationCard';
import { LoadingSpinner, NotificationModal, ConfirmationModal } from '@/components/common/';
import { Sidebar, MobileMenu } from '@/components/parent/home';
import {styles} from './applications.styles';

export default function JobApplications() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();

  const jobId = (params.job_id as string) || '';

  const { 
    applications, 
    loading, 
    error, 
    hasPostedJobs, 
    checkingJobs, 
    refresh, 
    getApplicationsByStatus
  } = useJobApplications(jobId);

  // States EXACTLY matching profile.tsx
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  
  // Logout Modals State
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

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

  // ==========================================
  // MODALS GROUPING
  // ==========================================
  const renderModals = () => (
    <>
      <NotificationModal visible={errorModalVisible} message={error || ''} type="error" onClose={() => setErrorModalVisible(false)} />
      
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out of your account?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose={true} duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
    </>
  );

  // 1. Loading State
  if (loading || checkingJobs) {
    return <LoadingSpinner visible={true} message="Loading applications..." />;
  }

  // 2. Empty State (No jobs posted at all)
  if (!hasPostedJobs && !jobId) {
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
          
          {/* Ensure mobile users can still leave this screen! */}
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
            <Text style={styles.editButtonText}>Post Job</Text>
          </TouchableOpacity>
        </View>
      )}

      <FilterTabs />

      <FlatList
        data={filteredApps}
        keyExtractor={(item) => item.application_id}
        renderItem={({ item }) => (
          <ApplicationCard application={item} onPress={() => {}} />
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
        {/* Placeholder view to balance the header layout */}
        <View style={{ width: 44 }} />
      </View>

      {applicationsContent}

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}
