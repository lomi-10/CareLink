// app/(helper)/browse/index.tsx
// Helper browse-jobs screen.
// PHP: helper/browse_jobs.php (via useBrowseJobs), helper/save_job.php

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { useBrowseJobs, type JobFilters, type JobPost } from '@/hooks/helper';
import { useAuth, useJobReferences, useResponsive, useNotifications } from '@/hooks/shared';

import { MobileMenu, Sidebar, HelperTabBar }           from '@/components/helper/home';
import {
  AdvancedSearchModal, ApplicationModal, FilterBar,
  JobDetailsModal, ParentEmployerBrowseCard,
  ParentProfileModal, SearchBar,
}                                                       from '@/components/helper/jobs/';
import { ConfirmationModal, LoadingSpinner, NotificationModal } from '@/components/shared/';
import { useHelperWorkMode }                           from '@/contexts/HelperWorkModeContext';

// ── Local modules ─────────────────────────────────────────────────────────────
import { createHelperBrowseJobsStyles }  from './browse_jobs.styles';
import { useBrowseTheme }                from './browseJobs.theme';
import { groupJobsByParent, type ParentBrowseRow } from './browseHelpers';
import { RecommendedJobCard, REC_TOPS }  from './RecommendedJobCard';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BrowseJobs() {
  const router          = useRouter();
  const t               = useBrowseTheme();
  const { DARK, MUTED, ORANGE } = t;
  const s               = useMemo(() => createHelperBrowseJobsStyles(t), [t]);
  const { isDesktop }  = useResponsive();
  const { handleLogout } = useAuth();
  const { unreadCount }  = useNotifications('helper');
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

  const parentGroups = useMemo(() => groupJobsByParent(jobs), [jobs]);

  // Top 3 individual jobs by match score — drives the "Recommended for You" section
  const topRecommended = useMemo(() =>
    [...jobs]
      .filter(j => Number(j.match_score ?? 0) > 0)
      .sort((a, b) => Number(b.match_score ?? 0) - Number(a.match_score ?? 0))
      .slice(0, 3),
    [jobs]
  );

  const [isMobileMenuOpen,     setMobileMenu]     = useState(false);
  const [confirmLogoutVisible, setConfirmLogout]  = useState(false);
  const [successLogoutVisible, setSuccessLogout]  = useState(false);
  const [selectedJob,          setSelectedJob]    = useState<any>(null);
  const [jobDetailsVisible,    setJobDetails]     = useState(false);
  const [applicationVisible,   setApplication]   = useState(false);
  const [advancedSearchVisible, setAdvancedSearch] = useState(false);
  const [notification, setNotification] = useState({
    visible: false, message: '', type: 'success' as 'success' | 'error',
  });
  const [selectedParent, setSelectedParent] = useState<ParentBrowseRow | null>(null);

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

  const handleViewJob = (job: JobPost) => { setSelectedJob(job); setJobDetails(true); };

  const handleApplicationSubmit = async () => {
    setNotification({ visible: true, message: 'Application submitted successfully!', type: 'success' });
    refresh();
  };

  if (ready && isWorkMode)
    return <LoadingSpinner visible message="Opening your work dashboard…" />;

  if (loading && jobs.length === 0)
    return <LoadingSpinner visible message="Finding jobs for you…" />;

  // ── Modals ──────────────────────────────────────────────────────────────────
  const renderModals = () => (
    <>
      <ConfirmationModal
        visible={confirmLogoutVisible}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
        onConfirm={executeLogout}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogoutVisible}
        message="Logged Out Successfully!"
        type="success"
        autoClose
        duration={1500}
        onClose={() => { setSuccessLogout(false); handleLogout(); }}
      />
      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification(p => ({ ...p, visible: false }))}
        autoClose
        duration={1500}
      />
      <JobDetailsModal
        visible={jobDetailsVisible}
        job={selectedJob}
        onApply={() => { setJobDetails(false); setApplication(true); }}
        onClose={() => setJobDetails(false)}
        onToggleSave={() => {
          if (selectedJob?.job_post_id) {
            toggleSaveJob(selectedJob.job_post_id);
            setSelectedJob((prev: any) => prev ? { ...prev, is_saved: !prev.is_saved } : prev);
          }
        }}
      />
      <ApplicationModal
        visible={applicationVisible}
        job={selectedJob}
        onSubmit={handleApplicationSubmit}
        onClose={() => setApplication(false)}
      />
      <AdvancedSearchModal
        visible={advancedSearchVisible}
        filters={filters}
        onApply={(newFilters) => {
          Object.entries(newFilters).forEach(([key, value]) =>
            updateFilter(key as keyof JobFilters, value),
          );
        }}
        onClose={() => setAdvancedSearch(false)}
        categories={categories}
      />
      <ParentProfileModal
        visible={!!selectedParent}
        onClose={() => setSelectedParent(null)}
        parentData={
          selectedParent
            ? { parent_id: selectedParent.parent_id, parent_name: selectedParent.parent_name }
            : { parent_id: '', parent_name: '' }
        }
        browseJobs={selectedParent?.jobs}
        onOpenJob={(job) => { setSelectedParent(null); handleViewJob(job); }}
        onToggleSaveJob={toggleSaveJob}
      />
    </>
  );

  // ── FlatList header: recommended cards + families label ──────────────────────
  const listHeader = (
    <View>
      {topRecommended.length > 0 && (
        <View style={s.recommendedSection}>
          <View style={s.recommendedHeader}>
            <Ionicons name="sparkles" size={17} color={ORANGE} />
            <Text style={s.recommendedTitle}>Recommended for You</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.recommendedScroll}
          >
            {topRecommended.map((job, idx) => (
              <RecommendedJobCard
                key={job.job_post_id}
                job={job}
                topColor={REC_TOPS[idx % REC_TOPS.length]}
                onPress={() => handleViewJob(job)}
                onSave={() => toggleSaveJob(job.job_post_id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={s.familiesHeader}>
        <Ionicons name="people" size={17} color={MUTED} />
        <Text style={s.familiesHeaderText}>Families Hiring Near You</Text>
      </View>
    </View>
  );

  // ── Feed (search + filter + results) ────────────────────────────────────────
  const browseContent = (
    <View style={s.feed}>

      {/* Search bar — warm helper theme */}
      <View style={s.searchStrip}>
        <SearchBar
          value={filters.search_query}
          onChangeText={(text) => updateFilter('search_query', text)}
          onSubmit={() => {
            if (filters.search_query.trim()) saveRecentSearch(filters.search_query);
          }}
          suggestions={searchSuggestions}
          recentSearches={recentSearches}
          onSelectSuggestion={(text) => { updateFilter('search_query', text); saveRecentSearch(text); }}
          onClearRecent={clearRecentSearches}
          helperTheme
        />
      </View>

      {/* Filter bar — warm helper theme */}
      <FilterBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        categories={categories}
        activeFilterCount={activeFilterCount}
        onOpenAdvanced={() => setAdvancedSearch(true)}
        helperTheme
      />

      {/* Results count row */}
      <View style={s.resultsBar}>
        <View style={s.resultsLeft}>
          <Text style={s.resultsCount}>
            <Text style={{ fontFamily: FontFamily.fredokaSemiBold, color: DARK }}>
              {parentGroups.length}
            </Text>
            {' '}employer{parentGroups.length !== 1 ? 's' : ''}
            {'  ·  '}
            <Text style={{ fontFamily: FontFamily.fredokaSemiBold, color: DARK }}>
              {filteredCount}
            </Text>
            {' '}job{filteredCount !== 1 ? 's' : ''}
          </Text>
          {filteredCount !== totalCount && (
            <Text style={s.resultsFiltered}>{'  ·  '}filtered from {totalCount}</Text>
          )}
        </View>
        {activeFilterCount > 0 && (
          <TouchableOpacity style={s.clearFiltersBtn} onPress={resetFilters} hitSlop={8}>
            <Ionicons name="close-circle" size={14} color={ORANGE} />
            <Text style={s.clearFiltersBtnText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Empty state / list */}
      {jobs.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="search-outline" size={40} color={MUTED} />
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
          data={parentGroups}
          keyExtractor={(item) => item.parent_id}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <View style={isDesktop ? s.desktopParentWrap : s.mobileCardWrap}>
              <ParentEmployerBrowseCard
                parentName={item.parent_name}
                verified={item.parent_verified}
                rating={item.parent_rating}
                matchPercent={item.recommendationPct}
                matchReasons={item.matchReasons}
                jobCount={item.jobs.length}
                profileImageUri={item.parent_profile_image ?? undefined}
                jobs={item.jobs}
                onPress={() => setSelectedParent(item)}
              />
            </View>
          )}
          contentContainerStyle={isDesktop ? s.listDesktop : s.listMobile}
          numColumns={isDesktop ? 2 : 1}
          key={isDesktop ? 'desktop-2' : 'mobile-1'}
          columnWrapperStyle={isDesktop ? s.colWrapper : undefined}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={ORANGE} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  // ── Desktop layout ───────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={s.desktopRoot}>
        {renderModals()}
        <Sidebar onLogout={initiateLogout} />
        <View style={s.desktopMain}>
          <View style={s.desktopHero}>
            <View>
              <Text style={s.heroTitle}>Browse Jobs</Text>
              <Text style={s.heroSub}>
                Employers hiring now — tap a card for profile, match details, and every open role
              </Text>
            </View>
            <View style={s.heroActions}>
              {(savedCount ?? 0) > 0 && (
                <View style={s.savedBadge}>
                  <Ionicons name="bookmark" size={15} color="#2563EB" />
                  <Text style={s.savedBadgeText}>{savedCount} Saved</Text>
                </View>
              )}
              <TouchableOpacity
                style={s.applicationsBtn}
                onPress={() => router.push('/(helper)/applications')}
                activeOpacity={0.85}
              >
                <Ionicons name="document-text-outline" size={18} color={ORANGE} />
                <Text style={s.applicationsBtnText}>My Applications</Text>
              </TouchableOpacity>
            </View>
          </View>
          {browseContent}
        </View>
      </View>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.mobileRoot}>
      {renderModals()}

      <View style={s.mobileHeader}>
        <TouchableOpacity style={s.menuBtn} onPress={() => setMobileMenu(true)} activeOpacity={0.7}>
          <Ionicons name="menu" size={24} color={DARK} />
        </TouchableOpacity>

        <View style={s.mobileTitleWrap}>
          <Text style={s.mobileTitle}>Browse Jobs</Text>
        </View>

        <TouchableOpacity
          style={s.applicationsIconBtn}
          onPress={() => router.push('/(helper)/notifications')}
          activeOpacity={0.8}
        >
          <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={20} color={ORANGE} />
          {unreadCount > 0 && (
            <View style={s.notifBadge}>
              <Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {browseContent}

      <HelperTabBar />
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setMobileMenu(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}
