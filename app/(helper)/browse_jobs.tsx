// app/(helper)/browse_jobs.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBrowseJobs, type JobFilters } from '@/hooks/helper';
import { useAuth, useJobReferences, useResponsive } from '@/hooks/shared';

import { MobileMenu, Sidebar, HelperTabBar } from '@/components/helper/home';

import { styles as s } from './browse_jobs.styles';
import {
  AdvancedSearchModal,
  ApplicationModal,
  FilterBar,
  JobCard,
  JobDetailsModal,
  SearchBar,
} from '@/components/helper/jobs/';
import { ConfirmationModal, LoadingSpinner, NotificationModal } from '@/components/shared/';
import { theme } from '@/constants/theme';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';

export default function BrowseJobs() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { ready, isWorkMode } = useHelperWorkMode();

  useEffect(() => {
    if (!ready) return;
    if (isWorkMode) router.replace('/(helper)/home');
  }, [ready, isWorkMode, router]);

  const {
    jobs, filters, loading, updateFilter, resetFilters, refresh,
    totalCount, filteredCount, searchSuggestions, recentSearches,
    saveRecentSearch, clearRecentSearches, toggleSaveJob, savedCount,
  } = useBrowseJobs();

  const { categories } = useJobReferences();

  const [isMobileMenuOpen,       setMobileMenu]        = useState(false);
  const [confirmLogoutVisible,   setConfirmLogout]     = useState(false);
  const [successLogoutVisible,   setSuccessLogout]     = useState(false);
  const [selectedJob,            setSelectedJob]       = useState<any>(null);
  const [jobDetailsVisible,      setJobDetailsVisible] = useState(false);
  const [applicationVisible,     setApplicationVisible]= useState(false);
  const [advancedSearchVisible,  setAdvancedSearch]    = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const initiateLogout = () => { setMobileMenu(false); setConfirmLogout(true); };
  const executeLogout  = () => { setConfirmLogout(false); setSuccessLogout(true); };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'category')        return value !== 'all';
    if (key === 'distance')        return value !== 9999;
    if (key === 'employment_type') return value !== 'all';
    if (key === 'work_schedule')   return value !== 'all';
    if (key === 'salary_min')      return value !== 0;
    if (key === 'salary_max')      return value !== 999999;
    return false;
  }).length;

  const handleViewJob  = (job: any) => { setSelectedJob(job); setJobDetailsVisible(true); };
  const handleApplyJob = (job: any) => { setSelectedJob(job); setApplicationVisible(true); };

  const handleApplicationSubmit = async () => {
    setNotification({ visible: true, message: 'Application submitted successfully!', type: 'success' });
    refresh();
  };

  if (ready && isWorkMode) {
    return <LoadingSpinner visible message="Opening your work dashboard…" />;
  }

  if (loading && jobs.length === 0) {
    return <LoadingSpinner visible message="Finding jobs for you…" />;
  }

  // ── Modals ────────────────────────────────────────────────────────────────
  const renderModals = () => (
    <>
      <ConfirmationModal
        visible={confirmLogoutVisible} title="Log Out"
        message="Are you sure you want to log out?" confirmText="Log Out" cancelText="Cancel"
        type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogoutVisible} message="Logged Out Successfully!" type="success"
        autoClose duration={1500} onClose={() => { setSuccessLogout(false); handleLogout(); }}
      />
      <NotificationModal
        visible={notification.visible} message={notification.message} type={notification.type}
        onClose={() => setNotification(p => ({ ...p, visible: false }))} autoClose duration={1500}
      />
      <JobDetailsModal
        visible={jobDetailsVisible} job={selectedJob}
        onApply={() => { setJobDetailsVisible(false); setApplicationVisible(true); }}
        onClose={() => setJobDetailsVisible(false)}
      />
      <ApplicationModal
        visible={applicationVisible} job={selectedJob}
        onSubmit={handleApplicationSubmit} onClose={() => setApplicationVisible(false)}
      />
      <AdvancedSearchModal
        visible={advancedSearchVisible} filters={filters}
        onApply={(newFilters) => {
          Object.entries(newFilters).forEach(([key, value]) => updateFilter(key as keyof JobFilters, value));
        }}
        onClose={() => setAdvancedSearch(false)} categories={categories}
      />
    </>
  );

  // ── Browse content ────────────────────────────────────────────────────────
  const browseContent = (
    <View style={s.feed}>

      {/* Search + filter strip */}
      <View style={s.searchStrip}>
        <SearchBar
          value={filters.search_query}
          onChangeText={(text) => updateFilter('search_query', text)}
          onSubmit={() => { if (filters.search_query.trim()) saveRecentSearch(filters.search_query); }}
          suggestions={searchSuggestions}
          recentSearches={recentSearches}
          onSelectSuggestion={(text) => { updateFilter('search_query', text); saveRecentSearch(text); }}
          onClearRecent={clearRecentSearches}
        />
      </View>

      <FilterBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        categories={categories}
        activeFilterCount={activeFilterCount}
        onOpenAdvanced={() => setAdvancedSearch(true)}
      />

      {/* Results bar */}
      <View style={s.resultsBar}>
        <View style={s.resultsLeft}>
          <Text style={s.resultsCount}>
            <Text style={{ color: theme.color.helper, fontWeight: '800' }}>{filteredCount}</Text>
            {' '}job{filteredCount !== 1 ? 's' : ''} available
          </Text>
          {filteredCount !== totalCount && (
            <Text style={s.resultsFiltered}>  ·  filtered from {totalCount}</Text>
          )}
        </View>
        {activeFilterCount > 0 && (
          <TouchableOpacity style={s.clearFiltersBtn} onPress={resetFilters} hitSlop={8}>
            <Ionicons name="close-circle" size={14} color={theme.color.helper} />
            <Text style={s.clearFiltersBtnText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Job list */}
      {jobs.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="search-outline" size={40} color={theme.color.helper} />
          </View>
          <Text style={s.emptyTitle}>No jobs found</Text>
          <Text style={s.emptyBody}>
            {activeFilterCount > 0
              ? 'Try adjusting or clearing your filters to see more results.'
              : 'No PESO-verified jobs are available right now. Check back soon!'}
          </Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity style={s.emptyBtn} onPress={resetFilters} activeOpacity={0.85}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text style={s.emptyBtnText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item.job_post_id.toString()}
          renderItem={({ item }) => (
            <View style={isDesktop ? s.desktopCardWrap : s.mobileCardWrap}>
              <JobCard
                job={item}
                onPress={() => handleViewJob(item)}
                onApply={() => handleApplyJob(item)}
                onToggleSave={toggleSaveJob}
              />
            </View>
          )}
          contentContainerStyle={isDesktop ? s.listDesktop : s.listMobile}
          numColumns={isDesktop ? 3 : 1}
          key={isDesktop ? 'desktop-3' : 'mobile-1'}
          columnWrapperStyle={isDesktop ? s.colWrapper : undefined}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.color.helper} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  // ── Desktop ───────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={s.desktopRoot}>
        {renderModals()}
        <Sidebar onLogout={initiateLogout} />
        <View style={s.desktopMain}>
          {/* Hero header */}
          <View style={s.desktopHero}>
            <View>
              <Text style={s.heroTitle}>Browse Jobs</Text>
              <Text style={s.heroSub}>
                Discover PESO-verified opportunities that match your skills
              </Text>
            </View>
            <View style={s.heroActions}>
              {(savedCount ?? 0) > 0 && (
                <View style={s.savedBadge}>
                  <Ionicons name="bookmark" size={15} color={theme.color.parent} />
                  <Text style={s.savedBadgeText}>{savedCount} Saved</Text>
                </View>
              )}
              <TouchableOpacity
                style={s.applicationsBtn}
                onPress={() => router.push('/(helper)/my_applications')}
                activeOpacity={0.85}
              >
                <Ionicons name="document-text-outline" size={18} color={theme.color.helper} />
                <Text style={s.applicationsBtnText}>My Applications</Text>
              </TouchableOpacity>
            </View>
          </View>
          {browseContent}
        </View>
      </View>
    );
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.mobileRoot}>
      {renderModals()}

      <View style={s.mobileHeader}>
        <TouchableOpacity
          style={s.menuBtn}
          onPress={() => setMobileMenu(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={theme.color.ink} />
        </TouchableOpacity>

        <View style={s.mobileTitleWrap}>
          <Text style={s.mobileTitle}>Browse Jobs</Text>
          {filteredCount > 0 && (
            <View style={s.mobileCountBadge}>
              <Text style={s.mobileCountText}>{filteredCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={s.applicationsIconBtn}
          onPress={() => router.push('/(helper)/my_applications')}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={20} color={theme.color.helper} />
          {(savedCount ?? 0) > 0 && <View style={s.savedDot} />}
        </TouchableOpacity>
      </View>

      {browseContent}

      <HelperTabBar />

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setMobileMenu(false)}
        handleLogout={initiateLogout}
      />
    </SafeAreaView>
  );
}
