// app/(helper)/browse_jobs.tsx
// Browse Jobs Screen - Professional job discovery with mobile/desktop separation

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
import { useBrowseJobs, JobFilters } from '@/hooks/useBrowseJobs';
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
  SearchBar,
  AdvancedSearchModal
} from '@/components/helper/jobs/';

// Styles & Common Components
import { styles } from './browse_jobs.styles';
import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/common/';

export default function BrowseJobs() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  
  const {
    jobs, filters, loading, updateFilter, resetFilters, refresh,
    totalCount, filteredCount, searchSuggestions, recentSearches,
    saveRecentSearch, clearRecentSearches, toggleSaveJob, savedCount,
  } = useBrowseJobs();

  const { categories } = useJobReferences();

  // State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobDetailsModalVisible, setJobDetailsModalVisible] = useState(false);
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // Logout Handlers
  const initiateLogout = () => {
    setIsMobileMenuOpen(false); 
    setConfirmLogoutVisible(true); 
  };

  const executeLogout = () => {
    setConfirmLogoutVisible(false);
    setSuccessLogoutVisible(true);
  };

  // Calculate active filter count
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'category') return value !== 'all';
    if (key === 'distance') return value !== 9999;
    if (key === 'employment_type') return value !== 'all';
    if (key === 'work_schedule') return value !== 'all';
    if (key === 'salary_min') return value !== 0;
    if (key === 'salary_max') return value !== 999999;
    if (key === 'sort') return false;
    return false;
  }).length;

  const handleViewJobDetails = (job: any) => {
    setSelectedJob(job);
    setJobDetailsModalVisible(true);
  };

  const handleApplyToJob = (job: any) => {
    setSelectedJob(job);
    setApplicationModalVisible(true);
  };

  const handleApplicationSubmit = async () => {
    setNotification({ visible: true, message: 'Application submitted successfully!', type: 'success' });
    refresh();
  };

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading jobs..." />;
  }

  // ==========================================
  // FIXED: Changed to a standard variable instead of an inner function component
  // This prevents React from unmounting and remounting the entire list on every keystroke!
  // ==========================================
  const browseContent = (
    <View style={styles.mainContent}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, isDesktop && styles.searchContainerDesktop]}>
        <SearchBar
          value={filters.search_query}
          onChangeText={(text) => updateFilter('search_query', text)}
          onSubmit={() => {
            if (filters.search_query.trim()) saveRecentSearch(filters.search_query);
          }}
          suggestions={searchSuggestions}
          recentSearches={recentSearches}
          onSelectSuggestion={(text) => {
            updateFilter('search_query', text);
            saveRecentSearch(text);
          }}
          onClearRecent={clearRecentSearches}
        />
      </View>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        categories={categories}
        activeFilterCount={activeFilterCount}
        onOpenAdvanced={() => setAdvancedSearchVisible(true)}
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
          <Text style={styles.emptySubtext}>Try adjusting your filters or check back later</Text>
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
                <JobCard job={item} onPress={() => handleViewJobDetails(item)} onApply={() => handleApplyToJob(item)} onToggleSave={(jobId) => toggleSaveJob(jobId)} />
              </View>
            ) : (
              <View style={styles.mobileCardWrapper}>
                <CompactJobCard job={item} onPress={() => handleViewJobDetails(item)} onToggleSave={(jobId) => toggleSaveJob(jobId)} />
              </View>
            )
          }
          contentContainerStyle={[styles.listContainer, isDesktop && styles.listContainerDesktop]}
          numColumns={isDesktop ? 3 : 2}
          key={isDesktop ? 'desktop-3' : 'mobile-2'}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderModals = () => (
    <>
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out of your account?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose={true} duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, visible: false })} autoClose={true} duration={1500} />
      <JobDetailsModal visible={jobDetailsModalVisible} job={selectedJob} onApply={() => { setJobDetailsModalVisible(false); setApplicationModalVisible(true); }} onClose={() => setJobDetailsModalVisible(false)} />
      <ApplicationModal visible={applicationModalVisible} job={selectedJob} onSubmit={handleApplicationSubmit} onClose={() => setApplicationModalVisible(false)} />
      <AdvancedSearchModal visible={advancedSearchVisible} filters={filters} onApply={(newFilters) => { Object.entries(newFilters).forEach(([key, value]) => { updateFilter(key as keyof JobFilters, value); }); }} onClose={() => setAdvancedSearchVisible(false)} categories={categories} />
    </>
  );

  // DESKTOP LAYOUT
  if (isDesktop) {
    return (
      <View style={[styles.container, { flexDirection: 'row' }]}>
        {renderModals()}
        <Sidebar onLogout={initiateLogout} />
        <View style={styles.desktopContentWrapper}>
          <View style={styles.desktopHeader}>
            <Text style={styles.desktopPageTitle}>Browse Job Opportunities</Text>
            <TouchableOpacity style={styles.myApplicationsButton} onPress={() => router.push('/(helper)/my_applications')} activeOpacity={0.7}>
              <Ionicons name="list" size={20} color="#007AFF" />
              <Text style={styles.myApplicationsButtonText}>My Applications</Text>
            </TouchableOpacity>
          </View>
          {browseContent}
        </View>
      </View>
    );
  }

  // MOBILE LAYOUT
  return (
    <SafeAreaView style={styles.container}>
      {renderModals()}

      {/* FIXED: Mobile Header - Hamburger on the Left, Actions on the Right */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsMobileMenuOpen(true)} activeOpacity={0.7}>
          <Ionicons name="menu" size={28} color="#1A1C1E" />
        </TouchableOpacity>

        <Text style={styles.mobileTitle}>Browse Jobs</Text>
        
        <View style={styles.mobileHeaderActions}>
          <TouchableOpacity style={styles.myApplicationsIconButton} onPress={() => router.push('/(helper)/my_applications')} activeOpacity={0.7}>
            <Ionicons name="list" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {browseContent}

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}