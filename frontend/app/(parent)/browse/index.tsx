// app/(parent)/browse/index.tsx
// PHP: parent/browse.php (via useBrowseHelpers), parent/invite_helper.php (InviteHelperModal), interviews/schedule.php (InterviewModal)

import React, { useMemo, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useBrowseHelpers, useParentJobs } from '@/hooks/parent';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import { computeHelperJobMatch, pickPrimaryOpenJob, bestJobForHelper } from '@/lib/parentHelperMatch';
import { useAuth, useJobReferences, useResponsive, useNotifications } from '@/hooks/shared';

import { Sidebar, MobileMenu, ParentTabBar } from '@/components/parent/home';
import { ParentBrowseWeb } from '@/components/parent/web/ParentBrowseWeb';
import { useParentProfile } from '@/hooks/parent';
import { RecommendedHelperCard } from '@/components/parent/home/RecommendedHelperCard';
import {
  FilterBar,
  HelperCard,
  CompactHelperCard,
  FilterModal,
  HelperProfileModal,
  InviteHelperModal,
} from '@/components/parent/browse/';

import { NotificationModal, LoadingSpinner, ConfirmationModal, SubmitComplaintModal } from '@/components/shared/';
import { s, BG, BROWN, CARAMEL, DARK, MUTED, DIVIDER, ICON_BG } from './browse_helpers.styles';

function getInitials(name?: string) {
  if (!name) return 'H';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
}

export default function BrowseHelpers() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout, getFullName } = useAuth();
  const { profileData } = useParentProfile();
  const { unreadCount } = useNotifications('parent');

  const { helpers, filters, loading, updateFilter, resetFilters, refresh } = useBrowseHelpers();
  const { categories } = useJobReferences();
  const { jobs } = useParentJobs();
  const { placements } = useParentActivePlacements();

  const hiredHelperIds = useMemo(
    () => new Set(placements.map((p) => String(p.helper_id))),
    [placements]
  );
  const referenceJob = useMemo(() => pickPrimaryOpenJob(jobs), [jobs]);

  // Score each helper against the post they fit BEST (not just the primary job),
  // so a helper who's a strong match for one of several posts surfaces correctly.
  const recommendedHelpers = useMemo(() => {
    const notHired = helpers.filter((h) => !hiredHelperIds.has(String(h.user_id)));
    return [...notHired]
      .map((h) => ({ helper: h, match: computeHelperJobMatch(h, bestJobForHelper(h, jobs)) }))
      .filter((x) => x.match.score > 0)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 3);
  }, [helpers, hiredHelperIds, jobs]);

  const rankedHelpers = useMemo(() => {
    const notHired = helpers.filter((h) => !hiredHelperIds.has(String(h.user_id)));
    return [...notHired].sort((a, b) =>
      computeHelperJobMatch(b, bestJobForHelper(b, jobs)).score - computeHelperJobMatch(a, bestJobForHelper(a, jobs)).score
    );
  }, [helpers, hiredHelperIds, jobs]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedHelper, setSelectedHelper] = useState<any>(null);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'category') return value !== 'all';
    if (key === 'distance') return value !== 20;
    if (key === 'sort') return false;
    return value !== 'all';
  }).length;

  const initiateLogout = () => { setIsMobileMenuOpen(false); setConfirmLogoutVisible(true); };
  const executeLogout  = () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); };

  const handleViewProfile    = (helper: any) => { setSelectedHelper(helper); setProfileModalVisible(true); };
  const handleInviteHelper   = (helper: any) => { setSelectedHelper(helper); setInviteModalVisible(true); };
  const handleInviteFromProfile = () => { setProfileModalVisible(false); setInviteModalVisible(true); };
  const handleMessageHelper  = () => {
    if (!selectedHelper) return;
    const name = selectedHelper.full_name || selectedHelper.helper_name || '';
    setProfileModalVisible(false);
    router.push({
      pathname: '/(parent)/messages',
      params: { partner_id: String(selectedHelper.user_id), partner_name: encodeURIComponent(name) },
    } as any);
  };

  const handleApplyFilters = (newFilters: any) => {
    Object.entries(newFilters).forEach(([key, value]) => updateFilter(key as any, value));
    setFilterModalVisible(false);
  };

  const renderModals = () => (
    <>
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, visible: false })} autoClose duration={1500} />
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      <FilterModal visible={filterModalVisible} filters={filters} categories={categories} onApply={handleApplyFilters} onReset={() => { resetFilters(); setFilterModalVisible(false); }} onClose={() => setFilterModalVisible(false)} />
      <HelperProfileModal
        visible={profileModalVisible}
        helper={selectedHelper}
        referenceJob={selectedHelper ? bestJobForHelper(selectedHelper, jobs) : referenceJob}
        match={selectedHelper ? computeHelperJobMatch(selectedHelper, bestJobForHelper(selectedHelper, jobs)) : null}
        onInvite={handleInviteFromProfile}
        onMessage={handleMessageHelper}
        onReport={() => { setProfileModalVisible(false); setComplaintOpen(true); }}
        onClose={() => setProfileModalVisible(false)}
      />
      <SubmitComplaintModal
        visible={complaintOpen}
        onClose={() => setComplaintOpen(false)}
        respondentId={selectedHelper ? Number(selectedHelper.user_id) : undefined}
        userType="parent"
        counterpartyLabel={selectedHelper?.full_name || selectedHelper?.helper_name || 'this helper'}
      />
      <InviteHelperModal
        visible={inviteModalVisible}
        helper={selectedHelper}
        jobs={jobs}
        onSuccess={(_, helperName) => setNotification({ visible: true, message: `Invitation sent to ${helperName}!`, type: 'success' })}
        onClose={() => setInviteModalVisible(false)}
      />
    </>
  );

  if (loading) return <LoadingSpinner visible message="Finding helpers..." />;

  // ── Recommended strip ──────────────────────────────────────────────────────
  const recommendedSection = recommendedHelpers.length > 0 && (
    <View style={s.recSection}>
      <View style={s.recHeaderRow}>
        <View style={s.recIconWrap}>
          <Ionicons name="sparkles" size={18} color={CARAMEL} />
        </View>
        <View style={s.recHeaderText}>
          {referenceJob ? (
            <>
              <Text style={s.recTitle}>Best Match for Your Job</Text>
              <Text style={s.recSubtitle} numberOfLines={1}>
                {jobs.filter((j: any) => j.status === 'Open').length > 1 ? (
                  <>Top matches across <Text style={s.recSubtitleAccent}>your open roles</Text></>
                ) : (
                  <>Top matches for{' '}
                    <Text style={s.recSubtitleAccent}>
                      {referenceJob.title || referenceJob.custom_job_title || 'your open role'}
                    </Text>
                  </>
                )}
              </Text>
            </>
          ) : (
            <>
              <Text style={s.recTitle}>Top Helpers in Ormoc</Text>
              <Text style={s.recSubtitle} numberOfLines={1}>
                Most capable and trustworthy helpers available right now
              </Text>
            </>
          )}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recScroll}>
        {recommendedHelpers.map(({ helper, match }, idx) => (
          <RecommendedHelperCard
            key={helper.profile_id}
            helper={{ ...helper, is_verified: (helper as any).is_verified ?? helper.verification_status === 'Verified' } as any}
            isTopMatch={idx === 0}
            matchPercentage={match.score}
            matchReasons={match.reasons}
            topReason={match.reasons?.[0]}
            onPress={() => handleViewProfile(helper)}
          />
        ))}
      </ScrollView>
    </View>
  );

  // ── Main content ───────────────────────────────────────────────────────────
  const browseContent = (
    <View style={s.contentWrapper}>
      <FilterBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        categories={categories}
        activeFilterCount={activeFilterCount}
        onOpenAdvanced={() => setFilterModalVisible(true)}
      />

      {rankedHelpers.length === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {recommendedSection}
          <View style={s.emptyState}>
            <Ionicons name="people-outline" size={80} color={DIVIDER} />
            <Text style={s.emptyText}>No helpers found</Text>
            <Text style={s.emptySubtext}>Try adjusting your filters or check back later.</Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity style={s.resetButton} onPress={resetFilters}>
                <Text style={s.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={rankedHelpers}
          keyExtractor={(item) => item.profile_id}
          // Top-3 + results bar scroll WITH the list (they were pinned above,
          // eating the viewport on web); the filter bar stays fixed above.
          ListHeaderComponent={
            // Offset the list container's padding so the full-bleed top-3 band
            // and results bar stay edge-to-edge and flush to the top.
            <View style={{ marginHorizontal: -12, marginTop: -12, marginBottom: 12 }}>
              {recommendedSection}
              <View style={s.resultsBar}>
                <Text style={s.resultsText}>
                  {rankedHelpers.length} verified {rankedHelpers.length === 1 ? 'helper' : 'helpers'} found
                  {hiredHelperIds.size > 0 ? ` · ${hiredHelperIds.size} hired hidden` : ''}
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const match = computeHelperJobMatch(item, bestJobForHelper(item, jobs));
            return isDesktop ? (
              <View style={s.desktopCardWrapper}>
                <HelperCard
                  helper={item}
                  matchScore={match.score}
                  matchReasons={match.reasons}
                  onPress={() => handleViewProfile(item)}
                  onInvite={() => handleInviteHelper(item)}
                />
              </View>
            ) : (
              <View style={s.mobileCardWrapper}>
                <CompactHelperCard
                  helper={item}
                  matchScore={match.score}
                  matchReason={match.reasons?.[0]}
                  matchReasons={match.reasons}
                  onPress={() => handleViewProfile(item)}
                />
              </View>
            );
          }}
          contentContainerStyle={s.listContainer}
          numColumns={isDesktop ? 3 : 2}
          key={isDesktop ? 'desktop' : 'mobile'}
          columnWrapperStyle={s.columnWrapper}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  // ── Desktop (redesigned web screen) ──────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={{ flex: 1 }}>
        <ParentBrowseWeb
          userName={getFullName()}
          avatar={(profileData?.profile?.profile_image as string) ?? null}
          verified={profileData?.profile?.verification_status === 'Verified'}
          onLogout={initiateLogout}
        />
        <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
        <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      </View>
    );
  }

  // ── Mobile ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      {renderModals()}
      <View style={s.mobileHeader}>
        <TouchableOpacity style={s.menuButton} onPress={() => setIsMobileMenuOpen(true)} activeOpacity={0.7}>
          <Ionicons name="menu" size={28} color={DARK} />
        </TouchableOpacity>
        <Text style={s.mobileTitle}>Browse Helpers</Text>
        <TouchableOpacity
          style={[s.menuButton, { position: 'relative' }]}
          onPress={() => router.push('/(parent)/notifications')}
          activeOpacity={0.8}
        >
          <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={24} color={BROWN} />
          {unreadCount > 0 && (
            <View style={{ position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7,
              backgroundColor: CARAMEL, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {browseContent}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
      <ParentTabBar />
    </SafeAreaView>
  );
}
