// app/(parent)/browse_helpers.tsx
// Browse Verified Helpers - Modularized & Clean

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
import { useBrowseHelpers, useParentJobs } from '@/hooks/parent';
import { useAuth, useJobReferences, useResponsive } from '@/hooks/shared';

// Components
import { Sidebar, MobileMenu } from '@/components/parent/home';
import { 
  FilterBar, 
  HelperCard, 
  CompactHelperCard,
  FilterModal,
  HelperProfileModal,
  InviteHelperModal,
} from '@/components/parent/browse/';

import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/shared/';
import {styles} from './browse_helpers.styles';

export default function BrowseHelpers() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  
  // Data hooks
  const {
    helpers,
    filters,
    loading,
    updateFilter,
    resetFilters,
    refresh,
    totalCount,
    filteredCount,
  } = useBrowseHelpers();

  const { categories } = useJobReferences();
  const { jobs } = useParentJobs();

  // States EXACTLY matching profile.tsx & applications.tsx
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);
  
  // Feature-specific states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedHelper, setSelectedHelper] = useState<any>(null);
  const [notification, setNotification] = useState({ 
    visible: false, 
    message: '', 
    type: 'success' as 'success' | 'error' 
  });

  // Calculate active filter count
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => {
      if (key === 'category') return value !== 'all';
      if (key === 'distance') return value !== 20;
      if (key === 'sort') return false;
      return value !== 'all';
    }
  ).length;

  // Logout Handlers
  const initiateLogout = () => {
    setIsMobileMenuOpen(false);
    setConfirmLogoutVisible(true);
  };

  const executeLogout = () => {
    setConfirmLogoutVisible(false);
    setSuccessLogoutVisible(true);
  };

  const handleViewProfile = (helper: any) => {
    setSelectedHelper(helper);
    setProfileModalVisible(true);
  };

  const handleInviteHelper = (helper: any) => {
    setSelectedHelper(helper);
    setInviteModalVisible(true);
  };

  const handleInviteFromProfile = () => {
    setProfileModalVisible(false);
    setInviteModalVisible(true);
  };

  const handleApplyFilters = (newFilters: any) => {
    Object.entries(newFilters).forEach(([key, value]) => {
      updateFilter(key as any, value);
    });
    setFilterModalVisible(false);
  };

  const handleResetFilters = () => {
    resetFilters();
    setFilterModalVisible(false);
  };

  // ==========================================
  // MODALS GROUPING
  // ==========================================
  const renderModals = () => (
    <>
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, visible: false })} autoClose={true} duration={1500} />
      
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out of your account?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose={true} duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      
      <FilterModal visible={filterModalVisible} filters={filters} categories={categories} onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />
      <HelperProfileModal visible={profileModalVisible} helper={selectedHelper} onInvite={handleInviteFromProfile} onClose={() => setProfileModalVisible(false)} />
      <InviteHelperModal
        visible={inviteModalVisible}
        helper={selectedHelper}
        jobs={jobs}
        onSuccess={(helperId, helperName) => {
          setNotification({ visible: true, message: `Invitation sent to ${helperName}!`, type: 'success' });
        }}
        onClose={() => setInviteModalVisible(false)}
      />
    </>
  );

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading helpers..." />;
  }

  // ==========================================
  // UI VARIABLE (Shared Browse List)
  // ==========================================
  const browseContent = (
    <View style={styles.contentWrapper}>
      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        categories={categories}
        activeFilterCount={activeFilterCount}
        onOpenAdvanced={() => setFilterModalVisible(true)}
      />

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredCount} verified {filteredCount === 1 ? 'helper' : 'helpers'} available
          {filteredCount !== totalCount && ` (filtered from ${totalCount})`}
        </Text>
      </View>

      {/* Helpers Grid */}
      {helpers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No helpers found</Text>
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
          data={helpers}
          keyExtractor={(item) => item.profile_id}
          renderItem={({ item }) =>
            isDesktop ? (
              <View style={styles.desktopCardWrapper}>
                <HelperCard
                  helper={item}
                  onPress={() => handleViewProfile(item)}
                  onInvite={() => handleInviteHelper(item)}
                />
              </View>
            ) : (
              <View style={styles.mobileCardWrapper}>
                <CompactHelperCard
                  helper={item}
                  onPress={() => handleViewProfile(item)}
                />
              </View>
            )
          }
          contentContainerStyle={styles.listContainer}
          numColumns={isDesktop ? 3 : 2}
          key={isDesktop ? 'desktop' : 'mobile'}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
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
          <View style={styles.pageHeader}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.pageTitle}>Browse Helpers</Text>
            </View>
          </View>
          {browseContent}
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
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsMobileMenuOpen(true)} activeOpacity={0.7}>
          <Ionicons name="menu" size={28} color="#1A1C1E" />
        </TouchableOpacity>
        
        <Text style={styles.mobileTitle}>Browse Helpers</Text>
        
        {/* Invisible block to perfectly center the title against the hamburger menu */}
        <View style={{ width: 44 }} />
      </View>

      {browseContent}

      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        handleLogout={initiateLogout} 
      />
    </SafeAreaView>
  );
}
