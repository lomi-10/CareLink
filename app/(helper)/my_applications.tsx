// app/(helper)/my_applications.tsx
// Track job application status with mobile/desktop separation

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Custom Hooks
import { useMyApplications } from '@/hooks/useMyApplications';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';

// Components
import { Sidebar, MobileMenu } from '@/components/helper/home';
import { 
  ApplicationCard,
  ApplicationDetailsModal,
} from '@/components/helper/applications/';

import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/common/';

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
  const [logoutModalVisible, setLogoutModalVisible] = useState({ 
    visible: false, 
    message: '', 
    type: 'success' as 'success' | 'error' 
  });
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState({ visible: false, applicationId: '' });
  const [notification, setNotification] = useState({ 
    visible: false, 
    message: '', 
    type: 'success' as 'success' | 'error' 
  });

  // Handlers
  const initiateLogout = () => {
    setIsMobileMenuOpen(false);
    setLogoutModalVisible({ 
      visible: true, 
      message: 'Logged Out Successfully!', 
      type: 'success' 
    });
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
        setNotification({
          visible: true,
          message: 'Application withdrawn successfully',
          type: 'success',
        });
        setWithdrawModal({ visible: false, applicationId: '' });
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || 'Failed to withdraw application',
        type: 'error',
      });
    }
  };

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading applications..." />;
  }

  // Main Content Component
  const MainContent = () => (
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
            style={[
              styles.filterTab, 
              statusFilter === filter && styles.filterTabActive
            ]} 
            onPress={() => setStatusFilter(filter)} 
            activeOpacity={0.7}
          >
            <Text 
              style={[
                styles.filterTabText, 
                statusFilter === filter && styles.filterTabTextActive
              ]}
            >
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
            <TouchableOpacity 
              style={styles.browseButton} 
              onPress={() => router.push('/(helper)/browse_jobs')}
            >
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
          contentContainerStyle={[
            styles.listContainer,
            isDesktop && styles.listContainerDesktop
          ]}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  // DESKTOP LAYOUT
  if (isDesktop) {
    return (
      <View style={[styles.container, { flexDirection: 'row' }]}>
        {/* Modals */}
        <NotificationModal 
          visible={logoutModalVisible.visible} 
          message={logoutModalVisible.message} 
          type={logoutModalVisible.type} 
          onClose={() => {
            setLogoutModalVisible({ ...logoutModalVisible, visible: false });
            handleLogout();
          }} 
          autoClose={true} 
          duration={1500} 
        />

        <NotificationModal 
          visible={notification.visible} 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification({ ...notification, visible: false })} 
          autoClose={true} 
          duration={1500} 
        />

        <ConfirmationModal
          visible={withdrawModal.visible}
          title="Withdraw Application?"
          message="Are you sure you want to withdraw this application? This action cannot be undone."
          confirmText="Withdraw"
          cancelText="Cancel"
          type="danger"
          onConfirm={confirmWithdraw}
          onCancel={() => setWithdrawModal({ visible: false, applicationId: '' })}
        />

        <ApplicationDetailsModal
          visible={detailsModalVisible}
          application={selectedApplication}
          onWithdraw={() => {
            setDetailsModalVisible(false);
            if (selectedApplication?.application_id) {
              handleWithdraw(selectedApplication.application_id);
            }
          }}
          onClose={() => setDetailsModalVisible(false)}
        />

        <Sidebar onLogout={initiateLogout} />

        <View style={styles.desktopContentWrapper}>
          {/* Desktop Header */}
          <View style={styles.desktopHeader}>
            <Text style={styles.desktopPageTitle}>My Applications</Text>
            <TouchableOpacity 
              style={styles.browseJobsButton}
              onPress={() => router.push('/(helper)/browse_jobs')}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={20} color="#007AFF" />
              <Text style={styles.browseJobsButtonText}>Browse Jobs</Text>
            </TouchableOpacity>
          </View>

          <MainContent />
        </View>
      </View>
    );
  }

  // MOBILE LAYOUT
  return (
    <SafeAreaView style={styles.container}>
      {/* Modals */}
      <NotificationModal 
        visible={logoutModalVisible.visible} 
        message={logoutModalVisible.message} 
        type={logoutModalVisible.type} 
        onClose={() => {
          setLogoutModalVisible({ ...logoutModalVisible, visible: false });
          handleLogout();
        }} 
        autoClose={true} 
        duration={1500} 
      />

      <NotificationModal 
        visible={notification.visible} 
        message={notification.message} 
        type={notification.type} 
        onClose={() => setNotification({ ...notification, visible: false })} 
        autoClose={true} 
        duration={1500} 
      />

      <ConfirmationModal
        visible={withdrawModal.visible}
        title="Withdraw Application?"
        message="Are you sure you want to withdraw this application? This action cannot be undone."
        confirmText="Withdraw"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmWithdraw}
        onCancel={() => setWithdrawModal({ visible: false, applicationId: '' })}
      />

      <ApplicationDetailsModal
        visible={detailsModalVisible}
        application={selectedApplication}
        onWithdraw={() => {
          setDetailsModalVisible(false);
          handleWithdraw(selectedApplication?.application_id);
        }}
        onClose={() => setDetailsModalVisible(false)}
      />

      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        <Text style={styles.mobileTitle}>My Applications</Text>
        <View style={styles.mobileHeaderActions}>
          <TouchableOpacity
            style={styles.browseIconButton}
            onPress={() => router.push('/(helper)/browse_jobs')}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setIsMobileMenuOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={28} color="#1A1C1E" />
          </TouchableOpacity>
        </View>
      </View>

      <MainContent />

      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        handleLogout={initiateLogout} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
  },
  
  // Desktop Styles
  desktopContentWrapper: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  desktopPageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  browseJobsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  browseJobsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  
  // Mobile Styles
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  mobileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  mobileHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  browseIconButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  
  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statsBarDesktop: {
    marginHorizontal: 32,
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  
  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  filterContainerDesktop: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  
  // List
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  listContainerDesktop: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 60,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
