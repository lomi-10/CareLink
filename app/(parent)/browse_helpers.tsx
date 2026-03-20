// app/(parent)/browse_helpers.tsx
// Browse Verified Helpers - Modernized with mobile/desktop separation

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
import { useBrowseHelpers } from '@/hooks/useBrowseHelpers';
import { useJobReferences } from '@/hooks/useJobReferences';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';
import { useParentJobs } from '@/hooks/useParentJobs';

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

import { NotificationModal, LoadingSpinner } from '@/components/common/';

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
  const { jobs } = useParentJobs(); // For invite modal

  // UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedHelper, setSelectedHelper] = useState<any>(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState({ 
    visible: false, 
    message: '', 
    type: 'success' as 'success' | 'error' 
  });
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

  // Handlers
  const initiateLogout = () => {
    setIsMobileMenuOpen(false);
    setLogoutModalVisible({ 
      visible: true, 
      message: 'Logged Out Successfully!', 
      type: 'success' 
    });
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

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading helpers..." />;
  }

  // ==================== MAIN CONTENT ====================
  const MainContent = () => (
    <View style={styles.mainContent}>
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
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  // ==================== DESKTOP LAYOUT ====================
  if (isDesktop) {
    return (
      <View style={[styles.container, { flexDirection: 'row' }]}>
        {/* Modals */}
        <NotificationModal
          visible={notification.visible}
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, visible: false })}
          autoClose={true}
          duration={1500}
        />

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

        <FilterModal
          visible={filterModalVisible}
          filters={filters}
          categories={categories}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onClose={() => setFilterModalVisible(false)}
        />

        <HelperProfileModal
          visible={profileModalVisible}
          helper={selectedHelper}
          onInvite={handleInviteFromProfile}
          onClose={() => setProfileModalVisible(false)}
        />

        <InviteHelperModal
          visible={inviteModalVisible}
          helper={selectedHelper}
          jobs={jobs}
          onSuccess={() => {
            setInviteModalVisible(false);
            setNotification({
              visible: true,
              message: `Invitation sent to ${selectedHelper.full_name}`,
              type: 'success',
            });
          }}
          onClose={() => setInviteModalVisible(false)}
        />

        {/* Sidebar */}
        <Sidebar onLogout={initiateLogout} />

        {/* Desktop Content */}
        <View style={styles.desktopContentWrapper}>
          {/* Desktop Header */}
          <View style={styles.desktopHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#1A1C1E" />
            </TouchableOpacity>
            <Text style={styles.desktopPageTitle}>Browse Verified Helpers</Text>
            <View style={{ width: 40 }} />
          </View>

          <MainContent />
        </View>
      </View>
    );
  }

  // ==================== MOBILE LAYOUT ====================
  return (
    <SafeAreaView style={styles.container}>
      {/* Modals */}
      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, visible: false })}
        autoClose={true}
        duration={1500}
      />

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

      <FilterModal
        visible={filterModalVisible}
        filters={filters}
        categories={categories}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onClose={() => setFilterModalVisible(false)}
      />

      <HelperProfileModal
        visible={profileModalVisible}
        helper={selectedHelper}
        onInvite={handleInviteFromProfile}
        onClose={() => setProfileModalVisible(false)}
      />

      <InviteHelperModal
        visible={inviteModalVisible}
        helper={selectedHelper}
        jobs={jobs}
        onSuccess={() => {
          setInviteModalVisible(false);
          setNotification({
            visible: true,
            message: `Invitation sent to ${selectedHelper.full_name}`,
            type: 'success',
          });
        }}
        onClose={() => setInviteModalVisible(false)}
      />

      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.mobileTitle}>Browse Helpers</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsMobileMenuOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={28} color="#1A1C1E" />
        </TouchableOpacity>
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
  },
  desktopPageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1C1E',
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

  // Shared Styles
  backButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
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
