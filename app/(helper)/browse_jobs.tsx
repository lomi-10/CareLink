// app/(helper)/browse_jobs.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBrowseJobs, type JobFilters } from '@/hooks/helper';
import { useAuth, useJobReferences, useResponsive } from '@/hooks/shared';

import { MobileMenu, Sidebar } from '@/components/helper/home';
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

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setMobileMenu(false)}
        handleLogout={initiateLogout}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── roots ──
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: theme.color.canvasHelper },
  mobileRoot:  { flex: 1, backgroundColor: theme.color.canvasHelper },

  // ── desktop layout ──
  desktopMain: { flex: 1, overflow: 'hidden' },
  desktopHero: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 40, paddingVertical: 24,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1, borderBottomColor: theme.color.line,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: theme.color.ink, letterSpacing: -0.5 },
  heroSub:   { fontSize: 13, color: theme.color.muted, marginTop: 3 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: theme.color.parentSoft, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, borderColor: theme.color.parent + '33',
  },
  savedBadgeText: { fontSize: 13, fontWeight: '700', color: theme.color.parent },
  applicationsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: theme.color.helper,
    backgroundColor: theme.color.helperSoft,
  },
  applicationsBtnText: { fontSize: 14, fontWeight: '700', color: theme.color.helper },

  // ── mobile header ──
  mobileHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1, borderBottomColor: theme.color.line,
  },
  menuBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.color.surface, alignItems: 'center', justifyContent: 'center' },
  mobileTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileTitle: { fontSize: 17, fontWeight: '800', color: theme.color.ink },
  mobileCountBadge: { backgroundColor: theme.color.helperSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: theme.color.helper + '33' },
  mobileCountText: { fontSize: 11, fontWeight: '800', color: theme.color.helper },
  applicationsIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.color.helperSoft, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  savedDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: theme.color.parent, borderWidth: 1.5, borderColor: theme.color.surfaceElevated },

  // ── feed ──
  feed: { flex: 1 },

  searchStrip: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    backgroundColor: theme.color.surfaceElevated,
  },

  // ── results bar ──
  resultsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1, borderBottomColor: theme.color.line,
  },
  resultsLeft: { flexDirection: 'row', alignItems: 'center' },
  resultsCount:    { fontSize: 13, color: theme.color.muted },
  resultsFiltered: { fontSize: 12, color: theme.color.subtle },
  clearFiltersBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearFiltersBtnText: { fontSize: 12, fontWeight: '700', color: theme.color.helper },

  // ── list ──
  listMobile:  { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 },
  listDesktop: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 60 },
  mobileCardWrap:  { marginBottom: 0 },
  desktopCardWrap: { flex: 1, maxWidth: '33.333%', paddingHorizontal: 8, marginBottom: 8 },
  colWrapper:      { marginBottom: 8 },

  // ── empty state ──
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, marginTop: 20 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.color.helperSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: theme.color.helper + '22' },
  emptyTitle:    { fontSize: 18, fontWeight: '800', color: theme.color.ink, marginBottom: 8, textAlign: 'center' },
  emptyBody:     { fontSize: 14, color: theme.color.muted, textAlign: 'center', lineHeight: 21, marginBottom: 24, maxWidth: 290 },
  emptyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.helper, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, shadowColor: theme.color.helper, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  emptyBtnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
});
