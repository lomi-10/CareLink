 // app/(helper)/saved_jobs.tsx
// Saved Jobs Screen - View and manage saved job postings

import React, { useEffect, useState } from 'react';
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
import { useSavedJobs } from '@/hooks/helper';
import { useAuth, useResponsive } from '@/hooks/shared';

// Components
import { Sidebar, MobileMenu } from '@/components/helper/home';
import { 
  JobCard,
  CompactJobCard,
  JobDetailsModal,
  ApplicationModal,
} from '@/components/helper/jobs/';

import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/shared/';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';

export default function SavedJobs() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { ready, isWorkMode } = useHelperWorkMode();

  useEffect(() => {
    if (!ready) return;
    if (isWorkMode) router.replace('/(helper)/home');
  }, [ready, isWorkMode, router]);

  const {
    savedJobs,
    loading,
    sortBy,
    updateSort,
    removeSavedJob,
    removeAllSaved,
    refresh,
    totalCount,
  } = useSavedJobs();

  // State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState({ 
    visible: false, 
    message: '', 
    type: 'success' as 'success' | 'error' 
  });
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [removeModal, setRemoveModal] = useState({ visible: false, jobId: '', jobTitle: '' });
  const [removeAllModal, setRemoveAllModal] = useState(false);
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

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
    setDetailsModalVisible(true);
  };

  const handleApply = (job: any) => {
    setSelectedJob(job);
    setApplicationModalVisible(true);
  };

  const handleRemove = (jobId: string, jobTitle: string) => {
    setRemoveModal({ visible: true, jobId, jobTitle });
  };

  const confirmRemove = async () => {
    try {
      await removeSavedJob(removeModal.jobId);
      setNotification({
        visible: true,
        message: 'Job removed from saved',
        type: 'success',
      });
      setRemoveModal({ visible: false, jobId: '', jobTitle: '' });
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || 'Failed to remove job',
        type: 'error',
      });
    }
  };

  const confirmRemoveAll = async () => {
    try {
      await removeAllSaved();
      setNotification({
        visible: true,
        message: 'All saved jobs cleared',
        type: 'success',
      });
      setRemoveAllModal(false);
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || 'Failed to clear saved jobs',
        type: 'error',
      });
    }
  };

  const handleApplicationSubmit = async () => {
    setNotification({
      visible: true,
      message: 'Application submitted successfully!',
      type: 'success',
    });
  };

  if (ready && isWorkMode) {
    return <LoadingSpinner visible message="Opening your work dashboard…" />;
  }

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading saved jobs..." />;
  }

  // Main Content Component
  const MainContent = () => (
    <View style={styles.mainContent}>
      {/* Sort & Actions Bar */}
      <View style={[styles.actionsBar, isDesktop && styles.actionsBarDesktop]}>
        <View style={styles.countContainer}>
          <Ionicons name="bookmark" size={20} color="#007AFF" />
          <Text style={styles.countText}>{totalCount} saved {totalCount === 1 ? 'job' : 'jobs'}</Text>
        </View>

        <View style={styles.actionsRight}>
          {/* Sort Dropdown */}
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => {
              // Cycle through sort options
              const sorts = ['recent', 'match', 'nearest', 'salary'];
              const currentIndex = sorts.indexOf(sortBy);
              const nextIndex = (currentIndex + 1) % sorts.length;
              updateSort(sorts[nextIndex]);
            }}
          >
            <Ionicons name="swap-vertical" size={16} color="#007AFF" />
            <Text style={styles.sortButtonText}>
              {sortBy === 'recent' && 'Recently Saved'}
              {sortBy === 'match' && 'Best Match'}
              {sortBy === 'nearest' && 'Nearest'}
              {sortBy === 'salary' && 'Highest Salary'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#007AFF" />
          </TouchableOpacity>

          {/* Clear All */}
          {totalCount > 0 && (
            <TouchableOpacity 
              style={styles.clearAllButton}
              onPress={() => setRemoveAllModal(true)}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Jobs List */}
      {savedJobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bookmark-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No saved jobs yet</Text>
          <Text style={styles.emptySubtext}>
            Jobs you save will appear here for quick access
          </Text>
          <TouchableOpacity 
            style={styles.browseButton} 
            onPress={() => router.push('/(helper)/browse_jobs')}
          >
            <Text style={styles.browseButtonText}>Browse Jobs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedJobs}
          keyExtractor={(item) => item.job_post_id}
          renderItem={({ item }) =>
            isDesktop ? (
              <View style={styles.desktopCardWrapper}>
                <JobCard
                  job={item}
                  onPress={() => handleViewDetails(item)}
                  onApply={() => handleApply(item)}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemove(item.job_post_id, item.title)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.mobileCardWrapper}>
                <TouchableOpacity
                  onPress={() => handleViewDetails(item)}
                  style={{ flex: 1 }}
                >
                  <CompactJobCard
                    job={item}
                    onPress={() => handleViewDetails(item)}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mobileRemoveButton}
                  onPress={() => handleRemove(item.job_post_id, item.title)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            )
          }
          contentContainerStyle={[
            styles.listContainer,
            isDesktop && styles.listContainerDesktop
          ]}
          numColumns={isDesktop ? 2 : 1}
          key={isDesktop ? 'desktop-2' : 'mobile-1'}
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
          visible={removeModal.visible}
          title="Remove Saved Job?"
          message={`Remove "${removeModal.jobTitle}" from your saved jobs?`}
          confirmText="Remove"
          cancelText="Cancel"
          type="danger"
          onConfirm={confirmRemove}
          onCancel={() => setRemoveModal({ visible: false, jobId: '', jobTitle: '' })}
        />

        <ConfirmationModal
          visible={removeAllModal}
          title="Clear All Saved Jobs?"
          message={`This will remove all ${totalCount} saved jobs. This action cannot be undone.`}
          confirmText="Clear All"
          cancelText="Cancel"
          type="danger"
          onConfirm={confirmRemoveAll}
          onCancel={() => setRemoveAllModal(false)}
        />

        <JobDetailsModal
          visible={detailsModalVisible}
          job={selectedJob}
          onApply={() => {
            setDetailsModalVisible(false);
            setApplicationModalVisible(true);
          }}
          onClose={() => setDetailsModalVisible(false)}
        />

        <ApplicationModal
          visible={applicationModalVisible}
          job={selectedJob}
          onSubmit={handleApplicationSubmit}
          onClose={() => setApplicationModalVisible(false)}
        />

        <Sidebar onLogout={initiateLogout} />

        <View style={styles.desktopContentWrapper}>
          {/* Desktop Header */}
          <View style={styles.desktopHeader}>
            <Text style={styles.desktopPageTitle}>Saved Jobs</Text>
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
        visible={removeModal.visible}
        title="Remove Saved Job?"
        message={`Remove "${removeModal.jobTitle}" from your saved jobs?`}
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmRemove}
        onCancel={() => setRemoveModal({ visible: false, jobId: '', jobTitle: '' })}
      />

      <ConfirmationModal
        visible={removeAllModal}
        title="Clear All Saved Jobs?"
        message={`This will remove all ${totalCount} saved jobs. This action cannot be undone.`}
        confirmText="Clear All"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmRemoveAll}
        onCancel={() => setRemoveAllModal(false)}
      />

      <JobDetailsModal
        visible={detailsModalVisible}
        job={selectedJob}
        onApply={() => {
          setDetailsModalVisible(false);
          setApplicationModalVisible(true);
        }}
        onClose={() => setDetailsModalVisible(false)}
      />

      <ApplicationModal
        visible={applicationModalVisible}
        job={selectedJob}
        onSubmit={handleApplicationSubmit}
        onClose={() => setApplicationModalVisible(false)}
      />

      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        <Text style={styles.mobileTitle}>Saved Jobs</Text>
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
  
  // Actions Bar
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionsBarDesktop: {
    paddingHorizontal: 32,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
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
  desktopCardWrapper: {
    flex: 1,
    maxWidth: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  mobileCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    marginTop: 8,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
  },
  mobileRemoveButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
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
