// app/(helper)/browse_jobs.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBrowseJobs, type JobFilters, type JobPost } from '@/hooks/helper';
import { useAuth, useJobReferences, useResponsive } from '@/hooks/shared';

import { MobileMenu, Sidebar, HelperTabBar } from '@/components/helper/home';

import { createHelperBrowseJobsStyles } from './browse_jobs.styles';
import {
  AdvancedSearchModal,
  ApplicationModal,
  FilterBar,
  JobDetailsModal,
  ParentEmployerBrowseCard,
  ParentProfileModal,
  SearchBar,
} from '@/components/helper/jobs/';
import { ConfirmationModal, LoadingSpinner, NotificationModal } from '@/components/shared/';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';

const MATCH_REASON_PARENT_THRESHOLD = 70;

type ParentBrowseRow = {
  parent_id: string;
  parent_name: string;
  parent_verified: boolean;
  parent_rating: number;
  parent_profile_image?: string | null;
  recommendationPct: number;
  matchReasons?: string[];
  jobs: JobPost[];
};

function mergeMatchReasonsFromJobsAtPct(jobs: JobPost[], pct: number): string[] | undefined {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const j of jobs) {
    if (Math.round(Number(j.match_score ?? 0)) !== pct) continue;
    for (const r of j.match_reasons ?? []) {
      const t = String(r).trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out.length ? out : undefined;
}

/** One preview line per job post on the parent card; duplicate titles get date/id suffix. */
function openRolePreviewSummaries(jobs: JobPost[]): string[] {
  const sorted = [...jobs].sort(
    (a, b) => Number(b.match_score ?? 0) - Number(a.match_score ?? 0),
  );
  const titleCounts = new Map<string, number>();
  for (const j of sorted) {
    const k = (j.title ?? '').trim().toLowerCase() || '—';
    titleCounts.set(k, (titleCounts.get(k) ?? 0) + 1);
  }
  return sorted.map((j) => {
    const title = (j.title ?? '').trim() || 'Untitled role';
    const pct = Math.min(100, Math.max(0, Math.round(Number(j.match_score ?? 0))));
    const sal = `₱${Number(j.salary_offered).toLocaleString()}`;
    const key = title.toLowerCase();
    let head = title;
    if ((titleCounts.get(key) ?? 0) > 1) {
      const stamp =
        j.posted_at && String(j.posted_at).length >= 10
          ? String(j.posted_at).slice(0, 10)
          : `#${String(j.job_post_id).slice(-4)}`;
      head = `${title} (${stamp})`;
    }
    return `${head} · ${pct}% match · ${sal}`;
  });
}

function groupJobsByParent(jobList: JobPost[]): ParentBrowseRow[] {
  const map = new Map<string, ParentBrowseRow>();
  for (const job of jobList) {
    const pid = String(job.parent_id);
    const ms = Math.round(Number(job.match_score ?? 0));
    const cur = map.get(pid);
    if (!cur) {
      map.set(pid, {
        parent_id: pid,
        parent_name: job.parent_name ?? 'Employer',
        parent_verified: !!job.parent_verified,
        parent_rating: Number(job.parent_rating ?? 0),
        parent_profile_image: job.parent_profile_image ?? null,
        recommendationPct: ms,
        jobs: [job],
      });
    } else {
      cur.jobs.push(job);
      cur.recommendationPct = Math.max(cur.recommendationPct, ms);
      if (!cur.parent_profile_image && job.parent_profile_image) {
        cur.parent_profile_image = job.parent_profile_image;
      }
    }
  }
  const rows = Array.from(map.values());
  for (const row of rows) {
    if (row.recommendationPct >= MATCH_REASON_PARENT_THRESHOLD) {
      row.matchReasons = mergeMatchReasonsFromJobsAtPct(row.jobs, row.recommendationPct);
    }
  }
  return rows.sort((a, b) => {
    if (b.recommendationPct !== a.recommendationPct) return b.recommendationPct - a.recommendationPct;
    return a.parent_name.localeCompare(b.parent_name);
  });
}

export default function BrowseJobs() {
  const router = useRouter();
  const { color: c } = useHelperTheme();
  const s = useMemo(() => createHelperBrowseJobsStyles(c), [c]);
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

  const parentGroups = useMemo(() => groupJobsByParent(jobs), [jobs]);

  const [isMobileMenuOpen, setMobileMenu] = useState(false);
  const [confirmLogoutVisible, setConfirmLogout] = useState(false);
  const [successLogoutVisible, setSuccessLogout] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobDetailsVisible, setJobDetailsVisible] = useState(false);
  const [applicationVisible, setApplicationVisible] = useState(false);
  const [advancedSearchVisible, setAdvancedSearch] = useState(false);
  const [notification, setNotification] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error',
  });
  const [selectedParent, setSelectedParent] = useState<ParentBrowseRow | null>(null);

  const initiateLogout = () => {
    setMobileMenu(false);
    setConfirmLogout(true);
  };
  const executeLogout = () => {
    setConfirmLogout(false);
    setSuccessLogout(true);
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'category') return value !== 'all';
    if (key === 'distance') return value !== 9999;
    if (key === 'employment_type') return value !== 'all';
    if (key === 'work_schedule') return value !== 'all';
    if (key === 'salary_min') return value !== 0;
    if (key === 'salary_max') return value !== 999999;
    return false;
  }).length;

  const handleViewJob = (job: JobPost) => {
    setSelectedJob(job);
    setJobDetailsVisible(true);
  };

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
        onClose={() => {
          setSuccessLogout(false);
          handleLogout();
        }}
      />
      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification((p) => ({ ...p, visible: false }))}
        autoClose
        duration={1500}
      />
      <JobDetailsModal
        visible={jobDetailsVisible}
        job={selectedJob}
        onApply={() => {
          setJobDetailsVisible(false);
          setApplicationVisible(true);
        }}
        onClose={() => setJobDetailsVisible(false)}
      />
      <ApplicationModal
        visible={applicationVisible}
        job={selectedJob}
        onSubmit={handleApplicationSubmit}
        onClose={() => setApplicationVisible(false)}
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
        onOpenJob={(job) => {
          setSelectedParent(null);
          handleViewJob(job);
        }}
        onToggleSaveJob={toggleSaveJob}
      />
    </>
  );

  const browseContent = (
    <View style={s.feed}>
      <View style={s.searchStrip}>
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

      <FilterBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        categories={categories}
        activeFilterCount={activeFilterCount}
        onOpenAdvanced={() => setAdvancedSearch(true)}
      />

      <View style={s.resultsBar}>
        <View style={s.resultsLeft}>
          <Text style={s.resultsCount}>
            <Text style={{ color: c.helper, fontWeight: '800' }}>{parentGroups.length}</Text>
            {' '}employer{parentGroups.length !== 1 ? 's' : ''}
            <Text style={{ color: c.muted }}>{' · '}</Text>
            <Text style={{ color: c.helper, fontWeight: '800' }}>{filteredCount}</Text>
            {' '}job{filteredCount !== 1 ? 's' : ''}
          </Text>
          {filteredCount !== totalCount && (
            <Text style={s.resultsFiltered}>  ·  filtered from {totalCount}</Text>
          )}
        </View>
        {activeFilterCount > 0 && (
          <TouchableOpacity style={s.clearFiltersBtn} onPress={resetFilters} hitSlop={8}>
            <Ionicons name="close-circle" size={14} color={c.helper} />
            <Text style={s.clearFiltersBtnText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {jobs.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="search-outline" size={40} color={c.helper} />
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
                openRoleTitles={openRolePreviewSummaries(item.jobs)}
                onPress={() => setSelectedParent(item)}
              />
            </View>
          )}
          contentContainerStyle={isDesktop ? s.listDesktop : s.listMobile}
          numColumns={isDesktop ? 2 : 1}
          key={isDesktop ? 'desktop-parent-2' : 'mobile-parent-1'}
          columnWrapperStyle={isDesktop ? s.colWrapper : undefined}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.helper} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

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
                Employers hiring now — tap a card for profile, match details, and every open role from them
              </Text>
            </View>
            <View style={s.heroActions}>
              {(savedCount ?? 0) > 0 && (
                <View style={s.savedBadge}>
                  <Ionicons name="bookmark" size={15} color={c.parent} />
                  <Text style={s.savedBadgeText}>{savedCount} Saved</Text>
                </View>
              )}
              <TouchableOpacity
                style={s.applicationsBtn}
                onPress={() => router.push('/(helper)/my_applications')}
                activeOpacity={0.85}
              >
                <Ionicons name="document-text-outline" size={18} color={c.helper} />
                <Text style={s.applicationsBtnText}>My Applications</Text>
              </TouchableOpacity>
            </View>
          </View>
          {browseContent}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.mobileRoot}>
      {renderModals()}

      <View style={s.mobileHeader}>
        <TouchableOpacity style={s.menuBtn} onPress={() => setMobileMenu(true)} activeOpacity={0.7}>
          <Ionicons name="menu" size={24} color={c.ink} />
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
          <Ionicons name="document-text-outline" size={20} color={c.helper} />
          {(savedCount ?? 0) > 0 && <View style={s.savedDot} />}
        </TouchableOpacity>
      </View>

      {browseContent}

      <HelperTabBar />

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setMobileMenu(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}
