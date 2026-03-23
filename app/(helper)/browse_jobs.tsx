// app/(helper)/browse_jobs.tsx
// Browse Jobs Screen - Professional job discovery with mobile/desktop separation

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
import { useBrowseJobs } from '@/hooks/useBrowseJobs';
import { useJobReferences } from '@/hooks/useJobReferences';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';

// Components
import { Sidebar, MobileMenu } from '@/components/helper/home';
import { 
  FilterBar, 
  JobCard, 
  CompactJobCard,
  JobDetailsModal,
  ApplicationModal,
} from '@/components/helper/jobs/';

import { NotificationModal, LoadingSpinner } from '@/components/common/';

export default function BrowseJobs() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  
  const {
    jobs,
    filters,
    loading,
    updateFilter,
    resetFilters,
    refresh,
    totalCount,
    filteredCount,
  } = useBrowseJobs();

  const { categories } = useJobReferences();

  // State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState({ 
    visible: false, 
    message: '', 
    type: 'success' as 'success' | 'error' 
  });
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobDetailsModalVisible, setJobDetailsModalVisible] = useState(false);
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [notification, setNotification] = useState({ 
    visible: false, 
    message: '', 
    type: 'success' as 'success' | 'error' 
  });

  // Calculate active filter count
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => {
      if (key === 'category') return value !== 'all';
      if (key === 'distance') return value !== 20; // default
      if (key === 'employment_type') return value !== 'all';
      if (key === 'work_schedule') return value !== 'all';
      if (key === 'salary_min') return value !== 0;
      if (key === 'salary_max') return value !== 50000;
      if (key === 'sort') return false; // don't count sort
      return false;
    }
  ).length;

  // Handlers
  const initiateLogout = () => {
    setIsMobileMenuOpen(false);
    setLogoutModalVisible({ 
      visible: true, 
      message: 'Logged Out Successfully!', 
      type: 'success' 
    });
  };

  const handleViewJobDetails = (job: any) => {
    setSelectedJob(job);
    setJobDetailsModalVisible(true);
  };

  const handleApplyToJob = (job: any) => {
    setSelectedJob(job);
    setApplicationModalVisible(true);
  };

  const handleApplicationSubmit = async () => {
    setNotification({
      visible: true,
      message: 'Application submitted successfully!',
      type: 'success',
    });
    refresh(); // Refresh jobs list
  };

  const handleOpenFilters = () => {
    setFilterModalVisible(true);
  };

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading jobs..." />;
  }

  // Main Content Component (shared between mobile/desktop)
  const MainContent = () => (
    <View style={styles.mainContent}>
      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        categories={categories}
        activeFilterCount={activeFilterCount}
        onOpenAdvanced={handleOpenFilters}
      />

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredCount} {filteredCount === 1 ? 'job' : 'jobs'} available
          {filteredCount !== totalCount && ` (filtered from ${totalCount})`}
        </Text>
      </View>

      {/* Jobs Grid */}
      {jobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No jobs found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your filters or check back later
          </Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.job_post_id}
          renderItem={({ item }) =>
            isDesktop ? (
              <View style={styles.desktopCardWrapper}>
                <JobCard
                  job={item}
                  onPress={() => handleViewJobDetails(item)}
                  onApply={() => handleApplyToJob(item)}
                />
              </View>
            ) : (
              <View style={styles.mobileCardWrapper}>
                <CompactJobCard
                  job={item}
                  onPress={() => handleViewJobDetails(item)}
                />
              </View>
            )
          }
          contentContainerStyle={[
            styles.listContainer,
            isDesktop && styles.listContainerDesktop
          ]}
          numColumns={isDesktop ? 3 : 2}
          key={isDesktop ? 'desktop-3' : 'mobile-2'}
          columnWrapperStyle={styles.columnWrapper}
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

        <JobDetailsModal
          visible={jobDetailsModalVisible}
          job={selectedJob}
          onApply={() => {
            setJobDetailsModalVisible(false);
            setApplicationModalVisible(true);
          }}
          onClose={() => setJobDetailsModalVisible(false)}
        />

        <ApplicationModal
          visible={applicationModalVisible}
          job={selectedJob}
          onSubmit={handleApplicationSubmit}
          onClose={() => setApplicationModalVisible(false)}
        />

        {/* TODO: Add FilterModal component */}

        <Sidebar onLogout={initiateLogout} />

        <View style={styles.desktopContentWrapper}>
          {/* Desktop Header */}
          <View style={styles.desktopHeader}>
            <Text style={styles.desktopPageTitle}>Browse Job Opportunities</Text>
            <TouchableOpacity 
              style={styles.myApplicationsButton}
              onPress={() => router.push('/(helper)/applications')}
              activeOpacity={0.7}
            >
              <Ionicons name="list" size={20} color="#007AFF" />
              <Text style={styles.myApplicationsButtonText}>My Applications</Text>
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

      <JobDetailsModal
        visible={jobDetailsModalVisible}
        job={selectedJob}
        onApply={() => {
          setJobDetailsModalVisible(false);
          setApplicationModalVisible(true);
        }}
        onClose={() => setJobDetailsModalVisible(false)}
      />

      <ApplicationModal
        visible={applicationModalVisible}
        job={selectedJob}
        onSubmit={handleApplicationSubmit}
        onClose={() => setApplicationModalVisible(false)}
      />

      {/* TODO: Add FilterModal component */}

      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        <Text style={styles.mobileTitle}>Browse Jobs</Text>
        <View style={styles.mobileHeaderActions}>
          <TouchableOpacity
            style={styles.myApplicationsIconButton}
            onPress={() => router.push('/(helper)/applications')}
            activeOpacity={0.7}
          >
            <Ionicons name="list" size={24} color="#007AFF" />
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
  myApplicationsButton: {
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
  myApplicationsButtonText: {
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
  myApplicationsIconButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  
  // Shared Styles
  resultsBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultsText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  listContainer: {
    padding: 12,
    paddingBottom: 40,
  },
  listContainerDesktop: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 60,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  mobileCardWrapper: {
    flex: 1,
    maxWidth: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  desktopCardWrapper: {
    flex: 1,
    maxWidth: '33.333%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
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
  resetButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
