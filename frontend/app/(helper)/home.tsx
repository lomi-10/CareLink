// app/(helper)/home.tsx
import React, { useMemo, useState } from 'react';
import {
  View, ScrollView, RefreshControl, ActivityIndicator,
  SafeAreaView, Text, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { createHelperHomeStyles } from './home.styles';
import { useHelperTheme } from '@/contexts/HelperThemeContext';

import { useHelperStats } from '@/hooks/helper';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';

import { NotificationModal, ConfirmationModal, PendingPlacementReviewsBanner, PlacementReviewModal, PostPlacementRenewalCard } from '@/components/shared';
import {
  Sidebar, MobileHeader, GreetingCard,
  StatCard, MobileStatCard, QuickAction, SectionHeader,
  MobileMenu, RecommendationsSection, HelperTabBar,
} from '@/components/helper/home';
import { WorkModeDashboard, WorkModeTabBar } from '@/components/helper/work';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import type { PendingReview } from '@/lib/reviewsApi';

export default function HelperHome() {
  const router = useRouter();
  const { color: c } = useHelperTheme();
  const layoutStyles = useMemo(() => createHelperHomeStyles(c), [c]);

  const { userData, loading: authLoading, handleLogout, getFullName } = useAuth();
  const { stats, loading: statsLoading, refresh } = useHelperStats();
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
        <ActivityIndicator size="large" color={c.helper} />
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
        accentColor={c.helper}
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
                color={unreadCount > 0 ? c.helper : c.muted}
              />
              {unreadCount > 0 && (
                <View style={[layoutStyles.notifBadge, { backgroundColor: c.helper }]}>
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
              <GreetingCard userName={getFullName()} />

              <PendingPlacementReviewsBanner
                userType="helper"
                accentColor={c.helper}
                softBg={c.helperSoft}
                refreshToken={placementReviewRefreshTok}
                onReviewPress={(item: PendingReview) =>
                  openPlacementReview(item.application_id, item.counterparty_name, item.job_title)
                }
              />

              {employmentEnded?.application_id ? (
                <View
                  style={{
                    marginBottom: 16,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: c.surfaceElevated,
                    borderWidth: 1,
                    borderColor: c.line,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: c.ink, marginBottom: 4 }}>
                    Employment ended
                  </Text>
                  <Text style={{ fontSize: 14, color: c.muted, lineHeight: 20 }}>
                    Your placement
                    {employmentEnded.job_title ? ` (${employmentEnded.job_title})` : ''} with{' '}
                    {employmentEnded.employer_name || 'your employer'}
                    {employmentEnded.employment_ended_on
                      ? ` ended on ${new Date(employmentEnded.employment_ended_on.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`
                      : '.'}{' '}
                    You are back in job-hunting mode.
                  </Text>
                  <TouchableOpacity
                    style={{
                      marginTop: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      alignSelf: 'flex-start',
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: c.helperSoft,
                      borderWidth: 1,
                      borderColor: c.line,
                    }}
                    onPress={() =>
                      openPlacementReview(
                        employmentEnded.application_id,
                        employmentEnded.employer_name || 'Employer',
                        employmentEnded.job_title,
                      )
                    }
                  >
                    <Ionicons name="star-outline" size={18} color={c.helper} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: c.helper }}>Rate this placement</Text>
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
                  accentColor={c.helper}
                  softBg={c.helperSoft}
                  refreshToken={renewalRefreshTok}
                  onIntentSaved={() => setRenewalRefreshTok((x) => x + 1)}
                />
              ) : null}

              <SectionHeader title="Your Overview" />
              <View style={layoutStyles.statsGrid}>
                <StatCard icon="briefcase" iconColor={c.helper} iconBg={c.helperSoft}
                  title="Applications" value={stats.applications} onPress={() => router.push('/(helper)/my_applications')} />
                <StatCard icon="bookmark" iconColor={c.info} iconBg={c.infoSoft}
                  title="Saved Jobs" value={stats.saved_jobs} onPress={() => router.push('/(helper)/saved_jobs')} />
                <StatCard icon="eye" iconColor={c.success} iconBg={c.successSoft}
                  title="Profile Views" value={stats.profile_views} />
              </View>

              <SectionHeader title="Quick Actions" />
              <View style={layoutStyles.quickActionsGrid}>
                <QuickActionDesktopInner icon="search" title="Find Jobs" desc="Browse PESO-verified openings"
                  color={c.info} onPress={() => router.push('/(helper)/browse_jobs')} />
                <QuickActionDesktopInner icon="person" title="My Profile" desc="Update your info & docs"
                  color={c.helper} onPress={() => router.push('/(helper)/profile')} />
                <QuickActionDesktopInner icon="document-text" title="Applications" desc="Track your applications"
                  color={c.success} onPress={() => router.push('/(helper)/my_applications')} />
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
    <SafeAreaView style={layoutStyles.container}>
      <MobileHeader
        onMenuPress={() => setIsMobileMenuOpen(true)}
        accentColor={c.helper}
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
            <GreetingCard userName={getFullName()} />

            <PendingPlacementReviewsBanner
              userType="helper"
              accentColor={c.helper}
              softBg={c.helperSoft}
              refreshToken={placementReviewRefreshTok}
              onReviewPress={(item: PendingReview) =>
                openPlacementReview(item.application_id, item.counterparty_name, item.job_title)
              }
            />

            {employmentEnded?.application_id ? (
              <View
                style={{
                  marginBottom: 14,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: c.surfaceElevated,
                  borderWidth: 1,
                  borderColor: c.line,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '800', color: c.ink, marginBottom: 4 }}>
                  Employment ended
                </Text>
                <Text style={{ fontSize: 14, color: c.muted, lineHeight: 20 }}>
                  Your placement
                  {employmentEnded.job_title ? ` (${employmentEnded.job_title})` : ''} with{' '}
                  {employmentEnded.employer_name || 'your employer'}
                  {employmentEnded.employment_ended_on
                    ? ` ended on ${new Date(employmentEnded.employment_ended_on.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`
                    : '.'}
                </Text>
                <TouchableOpacity
                  style={{
                    marginTop: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    alignSelf: 'flex-start',
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: c.helperSoft,
                    borderWidth: 1,
                    borderColor: c.line,
                  }}
                  onPress={() =>
                    openPlacementReview(
                      employmentEnded.application_id,
                      employmentEnded.employer_name || 'Employer',
                      employmentEnded.job_title,
                    )
                  }
                >
                  <Ionicons name="star-outline" size={18} color={c.helper} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: c.helper }}>Rate this placement</Text>
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
                accentColor={c.helper}
                softBg={c.helperSoft}
                refreshToken={renewalRefreshTok}
                onIntentSaved={() => setRenewalRefreshTok((x) => x + 1)}
              />
            ) : null}

            <View style={layoutStyles.mobileStatsRow}>
              <MobileStatCard icon="briefcase" color={c.helper} value={stats.applications}
                label="Applied" onPress={() => router.push('/(helper)/my_applications')} />
              <MobileStatCard icon="bookmark" color={c.info} value={stats.saved_jobs}
                label="Saved" onPress={() => router.push('/(helper)/saved_jobs')} />
              <MobileStatCard icon="eye" color={c.success} value={stats.profile_views} label="Views" />
            </View>

            <SectionHeader title="Quick Actions" />
            <View style={layoutStyles.quickActionsGrid}>
              <QuickAction icon="search" label="Find Jobs" color={c.info}
                onPress={() => router.push('/(helper)/browse_jobs')} />
              <QuickAction icon="person" label="My Profile" color={c.helper}
                onPress={() => router.push('/(helper)/profile')} />
              <QuickAction icon="document-text" label="Applications" color={c.success}
                onPress={() => router.push('/(helper)/my_applications')} />
              <QuickAction icon="document" label="Documents" color={c.peso}
                onPress={() => router.push('/(helper)/profile')} />
            </View>

            <View style={layoutStyles.recruitBanner}>
              <View style={layoutStyles.recruitBannerLeft}>
                <Text style={layoutStyles.recruitBannerTitle}>Ready to get hired?</Text>
                <Text style={layoutStyles.recruitBannerSub}>All jobs are PESO-verified and safe.</Text>
              </View>
              <TouchableOpacity
                style={[layoutStyles.recruitBannerBtn, { backgroundColor: c.helper }]}
                onPress={() => router.push('/(helper)/browse_jobs')}
              >
                <Text style={layoutStyles.recruitBannerBtnText}>Browse</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {showWorkDash ? <WorkModeTabBar /> : <HelperTabBar />}

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} stats={stats} handleLogout={initiateLogout} />
      {renderModals()}
    </SafeAreaView>
  );
}
