// app/(helper)/my_applications.tsx
// Track job application status with mobile/desktop separation

import React, { useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Custom Hooks
import { useMyApplications } from '@/hooks/helper';
import { useAuth, useResponsive } from '@/hooks/shared';

// Components
import { Sidebar, MobileMenu } from '@/components/helper/home';
import { 
  ApplicationCard,
  ApplicationDetailsModal,
} from '@/components/helper/applications/';
import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/shared/';

// Styles
import { styles } from './my_applications.styles';

export default function MyApplications() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  
  const {
    applications,
    stats,
    loading,
    statusFilter,
    setStatusFilter,
    refresh,
    withdrawApplication,
  } = useMyApplications();

  // State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState({ visible: false, applicationId: '' });
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // Logout States
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

  // Logout Handlers
  const initiateLogout = () => {
    setIsMobileMenuOpen(false); 
    setConfirmLogoutVisible(true); 
  };

  const executeLogout = () => {
    setConfirmLogoutVisible(false);
    setSuccessLogoutVisible(true);
  };

  const handleViewDetails = (application: any) => {
    setSelectedApplication(application);
    setDetailsModalVisible(true);
  };

  const handleWithdraw = (applicationId: string) => {
    setWithdrawModal({ visible: true, applicationId });
  };

  const confirmWithdraw = async () => {
    try {
      const result = await withdrawApplication(withdrawModal.applicationId);
      if (result.success) {
        setNotification({ visible: true, message: 'Application withdrawn successfully', type: 'success' });
        setWithdrawModal({ visible: false, applicationId: '' });
      }
    } catch (error: any) {
      setNotification({ visible: true, message: error.message || 'Failed to withdraw application', type: 'error' });
    }
  };

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading applications..." />;
  }

  const renderModals = () => (
    <>
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out of your account?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose={true} duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, visible: false })} autoClose={true} duration={1500} />
      <ConfirmationModal visible={withdrawModal.visible} title="Withdraw Application?" message="Are you sure you want to withdraw this application? This action cannot be undone." confirmText="Withdraw" cancelText="Cancel" type="danger" onConfirm={confirmWithdraw} onCancel={() => setWithdrawModal({ visible: false, applicationId: '' })} />
      <ApplicationDetailsModal visible={detailsModalVisible} application={selectedApplication} onWithdraw={() => { setDetailsModalVisible(false); if (selectedApplication?.application_id) { handleWithdraw(selectedApplication.application_id); } }} onClose={() => setDetailsModalVisible(false)} />
    </>
  );

  // ==========================================
  // FIXED: Changed to a standard variable instead of an inner function component
  // ==========================================
  const applicationsContent = (
    <View style={styles.mainContent}>
      {/* Stats Bar */}
      <View style={[styles.statsBar, isDesktop && styles.statsBarDesktop]}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#FF9500' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#007AFF' }]}>{stats.shortlisted}</Text>
          <Text style={styles.statLabel}>Shortlisted</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#34C759' }]}>{stats.accepted}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, isDesktop && styles.filterContainerDesktop]}>
        {['all', 'active', 'Pending', 'Shortlisted', 'Accepted', 'Rejected'].map((filter) => (
          <TouchableOpacity 
            key={filter} 
            style={[styles.filterTab, statusFilter === filter && styles.filterTabActive]} 
            onPress={() => setStatusFilter(filter)} 
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, statusFilter === filter && styles.filterTabTextActive]}>
              {filter === 'all' ? 'All' : filter === 'active' ? 'Active' : filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Applications List */}
      {applications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>
            {statusFilter === 'all' ? 'No applications yet' : `No ${statusFilter.toLowerCase()} applications`}
          </Text>
          <Text style={styles.emptySubtext}>
            {statusFilter === 'all' 
              ? 'Start applying to jobs to see your applications here'
              : 'Try selecting a different filter'}
          </Text>
          {statusFilter === 'all' && (
            <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/(helper)/browse_jobs')}>
              <Text style={styles.browseButtonText}>Browse Jobs</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item?.application_id || Math.random().toString()}
          renderItem={({ item }) => (
            <ApplicationCard
              application={item}
              onPress={() => handleViewDetails(item)}
              onWithdraw={() => handleWithdraw(item?.application_id)}
            />
          )}
          contentContainerStyle={[styles.listContainer, isDesktop && styles.listContainerDesktop]}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  // DESKTOP LAYOUT
  if (isDesktop) {
    return (
      <View style={[styles.container, { flexDirection: 'row' }]}>
        {/* FIXED: Called renderModals as a function */}
        {renderModals()}

        <Sidebar onLogout={initiateLogout} />

        <View style={styles.desktopContentWrapper}>
          <View style={styles.desktopHeader}>
            <Text style={styles.desktopPageTitle}>My Applications</Text>
            <TouchableOpacity style={styles.browseJobsButton} onPress={() => router.push('/(helper)/browse_jobs')} activeOpacity={0.7}>
              <Ionicons name="search" size={20} color="#007AFF" />
              <Text style={styles.browseJobsButtonText}>Browse Jobs</Text>
            </TouchableOpacity>
          </View>

          {applicationsContent}
        </View>
      </View>
    );
  }

  // MOBILE LAYOUT
  return (
    <SafeAreaView style={styles.container}>
      {/* FIXED: Called renderModals as a function */}
      {renderModals()}

      {/* FIXED: Mobile Header - Hamburger on the Left */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsMobileMenuOpen(true)} activeOpacity={0.7}>
          <Ionicons name="menu" size={28} color="#1A1C1E" />
        </TouchableOpacity>

        <Text style={styles.mobileTitle}>My Applications</Text>
        
        <View style={styles.mobileHeaderActions}>
          <TouchableOpacity style={styles.browseIconButton} onPress={() => router.push('/(helper)/browse_jobs')} activeOpacity={0.7}>
            <Ionicons name="search" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {applicationsContent}

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}