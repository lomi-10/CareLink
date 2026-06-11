// app/(helper)/home/index.tsx
// PHP: helper/get_stats.php (via useHelperStats), helper/recommendations.php (RecommendationsSection), shared/get_user_status.php
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, ScrollView, RefreshControl, ActivityIndicator,
  SafeAreaView, Text, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { createHelperHomeStyles } from './home.styles';
import { MUTED, ORANGE, ICON_BG, GREEN, SUCCESS_BG, INFO, INFO_BG } from '@/components/helper/home/helperWarmTheme';

import { useHelperStats, useHelperProfile } from '@/hooks/helper';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';

import { NotificationModal, ConfirmationModal, PendingPlacementReviewsBanner, PlacementReviewModal, PostPlacementRenewalCard } from '@/components/shared';
import {
  Sidebar, MobileHeader, GreetingCard,
  StatCard, SectionHeader,
  MobileMenu, RecommendationsSection, HelperTabBar,
  HelperStatsCard, HelperQuickActions,
} from '@/components/helper/home';
import { WorkModeDashboard, WorkModeTabBar } from '@/components/helper/work';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import type { PendingReview } from '@/lib/reviewsApi';

export default function HelperHome() {
  const router = useRouter();
  const layoutStyles = useMemo(() => createHelperHomeStyles(), []);

  const { userData, loading: authLoading, handleLogout, getFullName } = useAuth();
  const { stats, loading: statsLoading, refresh } = useHelperStats();
  // Fetch profile to get the latest profile_image (userData in AsyncStorage may be stale)
  const { profileData, refresh: refreshProfile } = useHelperProfile();
  const profileImage = (profileData?.profile?.profile_image ?? userData?.profile_image ?? null) as string | null;

  // Re-fetch the profile (incl. profile photo) whenever this tab regains focus,
  // so edits made on the Profile screen (e.g. a new photo) show up here too.
  useFocusEffect(useCallback(() => { refreshProfile(); }, []));
  const { isDesktop } = useResponsive();
  const { unreadCount } = useNotifications('helper');
  const {
    ready: workReady,
    isWorkMode,
    activeHire,
    employmentEnded,
    refresh: refreshWork,
  } = useHelperWorkMode();

  const [isMobileMenuOpen,    setIsMobileMenuOpen]    = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);
  const [placementReviewRefreshTok, setPlacementReviewRefreshTok] = useState(0);
  const [renewalRefreshTok, setRenewalRefreshTok] = useState(0);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    applicationId: number;
    counterpartyName: string;
    jobTitle?: string;
  } | null>(null);

  const openPlacementReview = (applicationId: number, counterpartyName: string, jobTitle?: string) => {
    setReviewTarget({ applicationId, counterpartyName, jobTitle });
    setReviewModalVisible(true);
  };

  const bumpPlacementReviewBanner = () => setPlacementReviewRefreshTok((t) => t + 1);

  const initiateLogout = () => { setIsMobileMenuOpen(false); setConfirmLogoutVisible(true); };
  const executeLogout  = () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); };

  const loading = authLoading || statsLoading || !workReady;

  function QuickActionDesktopInner({ icon, title, desc, color, onPress }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    desc: string;
    color: string;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity style={layoutStyles.qaDesktop} onPress={onPress} activeOpacity={0.88}>
        <View style={[layoutStyles.qaDesktopIcon, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
        <Text style={layoutStyles.qaDesktopTitle}>{title}</Text>
        <Text style={layoutStyles.qaDesktopDesc}>{desc}</Text>
      </TouchableOpacity>
    );
  }

  const showWorkDash = isWorkMode && activeHire && userData;
  const helperIdNum = userData ? Number(userData.user_id) : 0;

  if (loading) {
    return (
      <View style={layoutStyles.loadingContainer}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
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
        onCancel={() => setConfirmLogoutVisible(false)}
      />
      <NotificationModal
        visible={successLogoutVisible}
        message="Logged Out Successfully!"
        type="success"
        autoClose
        duration={1500}
        onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }}
      />
      <PlacementReviewModal
        visible={reviewModalVisible && !!reviewTarget}
        onClose={() => {
          setReviewModalVisible(false);
          setReviewTarget(null);
        }}
        applicationId={reviewTarget?.applicationId ?? 0}
        userType="helper"
        counterpartyName={reviewTarget?.counterpartyName ?? ''}
        jobTitle={reviewTarget?.jobTitle}
        accentColor={ORANGE}
        onSubmitted={() => {
          bumpPlacementReviewBanner();
          void refreshWork();
        }}
      />
    </>
  );

  // ─── DESKTOP ────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={[layoutStyles.container, { flexDirection: 'row' }]}>
        <Sidebar onLogout={initiateLogout} />
        <ScrollView
          style={layoutStyles.mainContent}
          contentContainerStyle={[layoutStyles.scrollContent, { maxWidth: 900, alignSelf: 'center', width: '100%' }]}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => {
                refresh();
                void refreshWork();
                bumpPlacementReviewBanner();
              }}
            />
          }
        >
          {/* Notification bar for desktop */}
          <View style={layoutStyles.desktopTopBar}>
            <View>
              <Text style={layoutStyles.desktopPageTitle}>{showWorkDash ? 'Work dashboard' : 'Dashboard'}</Text>
              <Text style={layoutStyles.desktopPageSub}>
                {showWorkDash ? 'Your active placement' : 'Helper Portal — Domestic Services'}
              </Text>
            </View>
            <TouchableOpacity
              style={[layoutStyles.desktopNotifBtn, unreadCount > 0 && layoutStyles.desktopNotifBtnActive]}
              onPress={() => router.push('/(helper)/notifications')}
            >
              <Ionicons
                name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                size={20}
                color={unreadCount > 0 ? ORANGE : MUTED}
              />
              {unreadCount > 0 && (
                <View style={[layoutStyles.notifBadge, { backgroundColor: ORANGE }]}>
                  <Text style={layoutStyles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {showWorkDash ? (
            <WorkModeDashboard
              helperId={helperIdNum}
              userFirstName={userData.first_name}
              activeHire={activeHire}
              onRefreshWorkContext={refreshWork}
            />
          ) : (
            <>
              <GreetingCard
                userName={getFullName()}
                profileImage={profileImage}
              />

              <PendingPlacementReviewsBanner
                userType="helper"
                accentColor={ORANGE}
                softBg={ICON_BG}
                refreshToken={placementReviewRefreshTok}
                onReviewPress={(item: PendingReview) =>
                  openPlacementReview(item.application_id, item.counterparty_name, item.job_title)
                }
              />

              {employmentEnded?.application_id ? (
                <View style={layoutStyles.endedCard}>
                  <Text style={layoutStyles.endedTitle}>
                    Employment ended
                  </Text>
                  <Text style={layoutStyles.endedBody}>
                    Your placement
                    {employmentEnded.job_title ? ` (${employmentEnded.job_title})` : ''} with{' '}
                    {employmentEnded.employer_name || 'your employer'}
                    {employmentEnded.employment_ended_on
                      ? ` ended on ${new Date(employmentEnded.employment_ended_on.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`
                      : '.'}{' '}
                    You are back in job-hunting mode.
                  </Text>
                  <TouchableOpacity
                    style={layoutStyles.endedRateBtn}
                    onPress={() =>
                      openPlacementReview(
                        employmentEnded.application_id,
                        employmentEnded.employer_name || 'Employer',
                        employmentEnded.job_title,
                      )
                    }
                  >
                    <Ionicons name="star-outline" size={18} color={ORANGE} />
                    <Text style={layoutStyles.endedRateBtnText}>Rate this placement</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {employmentEnded?.application_id ? (
                <PostPlacementRenewalCard
                  applicationId={employmentEnded.application_id}
                  jobPostId={employmentEnded.job_post_id}
                  messagesPartnerUserId={employmentEnded.parent_id}
                  userType="helper"
                  counterpartyName={employmentEnded.employer_name || 'Employer'}
                  jobTitle={employmentEnded.job_title}
                  endedOn={employmentEnded.employment_ended_on}
                  accentColor={ORANGE}
                  softBg={ICON_BG}
                  refreshToken={renewalRefreshTok}
                  onIntentSaved={() => setRenewalRefreshTok((x) => x + 1)}
                />
              ) : null}

              <SectionHeader title="Your Overview" />
              <View style={layoutStyles.statsGrid}>
                <StatCard icon="briefcase" iconColor={ORANGE} iconBg={ICON_BG}
                  title="Applications" value={stats.applications} onPress={() => router.push('/(helper)/applications')} />
                <StatCard icon="bookmark" iconColor={INFO} iconBg={INFO_BG}
                  title="Saved Jobs" value={stats.saved_jobs} onPress={() => router.push('/(helper)/browse/saved_jobs')} />
                <StatCard icon="eye" iconColor={GREEN} iconBg={SUCCESS_BG}
                  title="Profile Views" value={stats.profile_views} />
              </View>

              <SectionHeader title="Quick Actions" />
              <View style={layoutStyles.quickActionsGrid}>
                <QuickActionDesktopInner icon="search" title="Find Jobs" desc="Browse PESO-verified openings"
                  color={INFO} onPress={() => router.push('/(helper)/browse')} />
                <QuickActionDesktopInner icon="person" title="My Profile" desc="Update your info & docs"
                  color={ORANGE} onPress={() => router.push('/(helper)/profile')} />
                <QuickActionDesktopInner icon="document-text" title="Applications" desc="Track your applications"
                  color={GREEN} onPress={() => router.push('/(helper)/applications')} />
              </View>

              <RecommendationsSection />
            </>
          )}
        </ScrollView>
        {renderModals()}
      </View>
    );
  }

  // ─── MOBILE ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[layoutStyles.container, { backgroundColor: '#FBF5EC' }]}>
      <MobileHeader
        onMenuPress={() => setIsMobileMenuOpen(true)}
        subtitle={showWorkDash ? 'Work Mode' : 'Helper Portal'}
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(helper)/notifications')}
      />
      <ScrollView
        contentContainerStyle={[
          layoutStyles.mobileScrollContent,
          { paddingBottom: showWorkDash ? 88 : 88 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              refresh();
              void refreshWork();
              bumpPlacementReviewBanner();
            }}
          />
        }
      >
        {showWorkDash && userData ? (
          <WorkModeDashboard
            helperId={helperIdNum}
            userFirstName={userData.first_name}
            activeHire={activeHire}
            onRefreshWorkContext={refreshWork}
          />
        ) : (
          <>
            <GreetingCard
                userName={getFullName()}
                profileImage={profileImage}
              />

            <PendingPlacementReviewsBanner
              userType="helper"
              accentColor={ORANGE}
              softBg={ICON_BG}
              refreshToken={placementReviewRefreshTok}
              onReviewPress={(item: PendingReview) =>
                openPlacementReview(item.application_id, item.counterparty_name, item.job_title)
              }
            />

            {employmentEnded?.application_id ? (
              <View style={layoutStyles.endedCard}>
                <Text style={layoutStyles.endedTitle}>
                  Employment ended
                </Text>
                <Text style={layoutStyles.endedBody}>
                  Your placement
                  {employmentEnded.job_title ? ` (${employmentEnded.job_title})` : ''} with{' '}
                  {employmentEnded.employer_name || 'your employer'}
                  {employmentEnded.employment_ended_on
                    ? ` ended on ${new Date(employmentEnded.employment_ended_on.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`
                    : '.'}
                </Text>
                <TouchableOpacity
                  style={layoutStyles.endedRateBtn}
                  onPress={() =>
                    openPlacementReview(
                      employmentEnded.application_id,
                      employmentEnded.employer_name || 'Employer',
                      employmentEnded.job_title,
                    )
                  }
                >
                  <Ionicons name="star-outline" size={18} color={ORANGE} />
                  <Text style={layoutStyles.endedRateBtnText}>Rate this placement</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {employmentEnded?.application_id ? (
              <PostPlacementRenewalCard
                applicationId={employmentEnded.application_id}
                jobPostId={employmentEnded.job_post_id}
                messagesPartnerUserId={employmentEnded.parent_id}
                userType="helper"
                counterpartyName={employmentEnded.employer_name || 'Employer'}
                jobTitle={employmentEnded.job_title}
                endedOn={employmentEnded.employment_ended_on}
                accentColor={ORANGE}
                softBg={ICON_BG}
                refreshToken={renewalRefreshTok}
                onIntentSaved={() => setRenewalRefreshTok((x) => x + 1)}
              />
            ) : null}

            {/* 4-column stats card */}
            <HelperStatsCard
              applied={stats.applications}
              saved={stats.saved_jobs}
              profileViews={stats.profile_views}
              profileStrength={profileData?.profile_completeness ?? 0}
            />

            {/* Recommended for you */}
            <RecommendationsSection />

            {/* Quick Actions */}
            <SectionHeader title="Quick Actions" />
            <HelperQuickActions />
          </>
        )}
      </ScrollView>

      {showWorkDash ? <WorkModeTabBar /> : <HelperTabBar />}

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} stats={stats} handleLogout={initiateLogout} />
      {renderModals()}
    </SafeAreaView>
  );
}
