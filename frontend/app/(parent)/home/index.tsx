// app/(parent)/home/index.tsx
// PHP: parent/get_stats.php (via useParentStats), parent/get_job_applications.php (via useParentRecentlyEndedPlacements)
import React, { useCallback, useState } from 'react';
import {
  View, ScrollView, RefreshControl, ActivityIndicator,
  SafeAreaView, Text, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { h } from './home.styles';
import { useParentStats, useParentProfile } from '@/hooks/parent';
import { useParentRecentlyEndedPlacements } from '@/hooks/parent/useParentRecentlyEndedPlacements';
import type { PendingReview } from '@/lib/reviewsApi';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';

import { NotificationModal, ConfirmationModal, PendingPlacementReviewsBanner, PlacementReviewModal, PostPlacementRenewalCard } from '@/components/shared';
import {
  Sidebar, MobileMenu, GreetingCard, ActiveHelpersSection, RecommendedHelpersSection,
  ParentTabBar, ParentStatTile, SafetyBanner,
} from '@/components/parent/home';
import {
  BROWN, CARAMEL, GOLD, DARK, MUTED, DIVIDER, ICON_BG, GREEN, SUCCESS_BG,
} from '@/components/parent/home/parentWarmTheme';
import { MobileHeader, QuickAction, SectionHeader } from '@/components/helper/home';

const INFO  = '#3B82F6';
const INFO_BG = '#DBEAFE';
const AMBER = '#D97706';
const AMBER_BG = '#FEF3C7';

export default function ParentHome() {
  const router = useRouter();

  const { handleLogout, getFullName, userData } = useAuth();
  const { profileData, refresh: refreshProfile } = useParentProfile();
  const profileImage = (profileData?.profile?.profile_image ?? userData?.profile_image ?? null) as string | null;

  // Re-fetch the profile (incl. profile photo) whenever this tab regains focus,
  // so edits made on the Profile screen (e.g. a new photo) show up here too.
  useFocusEffect(useCallback(() => { refreshProfile(); }, []));
  const { placements: recentlyEnded, loading: endedLoading, refresh: refreshEnded } =
    useParentRecentlyEndedPlacements(1);
  const { stats, loading: statsLoading, refresh } = useParentStats();
  const { isDesktop } = useResponsive();
  const { unreadCount } = useNotifications('parent');

  const [isMobileMenuOpen,         setIsMobileMenuOpen]         = useState(false);
  const [confirmLogoutVisible,      setConfirmLogoutVisible]      = useState(false);
  const [successLogoutVisible,      setSuccessLogoutVisible]      = useState(false);
  const [placementReviewRefreshTok, setPlacementReviewRefreshTok] = useState(0);
  const [renewalRefreshTok,         setRenewalRefreshTok]         = useState(0);
  const [reviewModalVisible,        setReviewModalVisible]        = useState(false);
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

  const QuickActionDesktop = ({ icon, title, desc, color, onPress }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string; desc: string; color: string; onPress: () => void;
  }) => (
    <TouchableOpacity style={[h.qaDesktop, h.quickActionDesktopCard]} onPress={onPress} activeOpacity={0.88}>
      <View style={[h.quickActionDesktopIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <Text style={h.quickActionDesktopTitle}>{title}</Text>
      <Text style={h.quickActionDesktopDesc}>{desc}</Text>
    </TouchableOpacity>
  );

  if (statsLoading) {
    return (
      <View style={h.loadingContainer}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  const lastEnded = recentlyEnded[0];

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
        onClose={() => { setReviewModalVisible(false); setReviewTarget(null); }}
        applicationId={reviewTarget?.applicationId ?? 0}
        userType="parent"
        counterpartyName={reviewTarget?.counterpartyName ?? ''}
        jobTitle={reviewTarget?.jobTitle}
        accentColor={BROWN}
        onSubmitted={() => {
          bumpPlacementReviewBanner();
          void refreshEnded();
        }}
      />
    </>
  );

  const renderRecentPlacement = () => {
    if (endedLoading || !lastEnded) return null;
    return (
      <View style={{ marginBottom: 8 }}>
        <Text style={h.recentTitle}>Recent placement</Text>
        <TouchableOpacity
          style={h.recentRateBtn}
          onPress={() => openPlacementReview(lastEnded.application_id, lastEnded.helper_name, lastEnded.job_title)}
        >
          <Ionicons name="star-outline" size={18} color={BROWN} />
          <Text style={h.recentRateBtnText}>Rate your helper</Text>
        </TouchableOpacity>
        <PostPlacementRenewalCard
          applicationId={lastEnded.application_id}
          jobPostId={lastEnded.job_post_id}
          messagesPartnerUserId={lastEnded.helper_id}
          userType="parent"
          counterpartyName={lastEnded.helper_name}
          jobTitle={lastEnded.job_title}
          endedOn={lastEnded.ended_on}
          accentColor={BROWN}
          softBg={ICON_BG}
          refreshToken={renewalRefreshTok}
          onIntentSaved={() => { setRenewalRefreshTok((x) => x + 1); void refreshEnded(); }}
        />
      </View>
    );
  };

  const renderStatsGrid = (mobile?: boolean) => {
    const jobsApplicantsTab = { pathname: '/(parent)/jobs', params: { tab: 'applicants' } } as any;
    return (
      <View style={mobile ? h.mobileStatsRow : h.statsGrid}>
        <ParentStatTile icon="briefcase"       color={BROWN}  iconBg={ICON_BG}
          value={stats.active_job_posts}     label="Active Jobs"
          onPress={() => router.push('/(parent)/jobs')} />
        <ParentStatTile icon="people"           color={INFO}   iconBg={INFO_BG}
          value={stats.total_applicants}     label="Applicants"
          onPress={() => router.push(jobsApplicantsTab)} />
        <ParentStatTile icon="time"             color={AMBER}  iconBg={AMBER_BG}
          value={stats.pending_applications} label="Pending"
          onPress={() => router.push(jobsApplicantsTab)} />
        <ParentStatTile icon="star"             color={GOLD}   iconBg="#FBF0DB"
          value={stats.shortlisted_count}    label="Shortlisted"
          onPress={() => router.push(jobsApplicantsTab)} />
        <ParentStatTile icon="checkmark-circle" color={GREEN}  iconBg={SUCCESS_BG}
          value={stats.active_placements}    label="Hired"
          onPress={() => router.push('/(parent)/hire')} />
        <ParentStatTile icon="bookmark"         color={CARAMEL} iconBg="#FDF7EE"
          value={stats.saved_helpers}        label="Saved"
          onPress={() => router.push('/(parent)/browse')} />
      </View>
    );
  };

  // ─── DESKTOP ────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={[h.container, { flexDirection: 'row' }]}>
        <Sidebar onLogout={initiateLogout} />
        <ScrollView
          style={h.mainContent}
          contentContainerStyle={[h.scrollContent, { maxWidth: 900, alignSelf: 'center', width: '100%' }]}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => { refresh(); void refreshEnded(); bumpPlacementReviewBanner(); }} />
          }
        >
          {/* Desktop top bar */}
          <View style={h.desktopTopBar}>
            <View>
              <Text style={h.desktopPageTitle}>Dashboard</Text>
              <Text style={h.desktopPageSub}>Parent Portal — Home & Family Care</Text>
            </View>
            <TouchableOpacity
              style={[h.desktopNotifBtn, unreadCount > 0 && h.desktopNotifBtnActive]}
              onPress={() => router.push('/(parent)/notifications')}
            >
              <Ionicons
                name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                size={20}
                color={unreadCount > 0 ? BROWN : MUTED}
              />
              {unreadCount > 0 && (
                <View style={h.notifBadge}>
                  <Text style={h.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <GreetingCard userName={getFullName()} profileImage={profileImage} />

          <PendingPlacementReviewsBanner
            userType="parent"
            accentColor={BROWN}
            softBg={ICON_BG}
            refreshToken={placementReviewRefreshTok}
            onReviewPress={(item: PendingReview) =>
              openPlacementReview(item.application_id, item.counterparty_name, item.job_title)
            }
          />

          {renderRecentPlacement()}
          <RecommendedHelpersSection />

          <SectionHeader title="My Hiring Activity" />
          {renderStatsGrid()}

          <SafetyBanner />

          <SectionHeader title="Quick Actions" />
          <View style={h.quickActionsDesktop}>
            <QuickActionDesktop icon="add-circle" title="Post a Job" desc="Find the perfect helper for your home"
              color={BROWN} onPress={() => router.push('/(parent)/jobs')} />
            <QuickActionDesktop icon="search" title="Browse Helpers" desc="View PESO-verified helpers"
              color={GREEN} onPress={() => router.push('/(parent)/browse')} />
            <QuickActionDesktop icon="people" title="Applications" desc="Review & manage applicants"
              color={INFO} onPress={() => router.push({ pathname: '/(parent)/jobs', params: { tab: 'applicants' } } as any)} />
          </View>

          <ActiveHelpersSection />
        </ScrollView>
        {renderModals()}
      </View>
    );
  }

  // ─── MOBILE ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={h.container}>
      <MobileHeader
        onMenuPress={() => setIsMobileMenuOpen(true)}
        subtitle="Parent Portal"
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(parent)/notifications')}
      />
      <ScrollView
        contentContainerStyle={[h.mobileScrollContent, { paddingBottom: 88 }]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => { refresh(); void refreshEnded(); bumpPlacementReviewBanner(); }} />
        }
      >
        <GreetingCard userName={getFullName()} profileImage={profileImage} />

        <PendingPlacementReviewsBanner
          userType="parent"
          accentColor={BROWN}
          softBg={ICON_BG}
          refreshToken={placementReviewRefreshTok}
          onReviewPress={(item: PendingReview) =>
            openPlacementReview(item.application_id, item.counterparty_name, item.job_title)
          }
        />

        {renderRecentPlacement()}
        <RecommendedHelpersSection />

        <SectionHeader title="My Hiring Activity" />
        {renderStatsGrid(true)}

        <SafetyBanner />

        <SectionHeader title="Quick Actions" />
        <View style={h.quickActionsGrid}>
          <QuickAction icon="add-circle" label="Post Job"    color={BROWN}  onPress={() => router.push('/(parent)/jobs')} />
          <QuickAction icon="search"     label="Find Helpers" color={GREEN}  onPress={() => router.push('/(parent)/browse')} />
          <QuickAction icon="chatbubbles" label="Messages"   color={INFO}   onPress={() => router.push('/(parent)/messages')} />
          <QuickAction icon="person"     label="My Profile"  color="#7C3AED" onPress={() => router.push('/(parent)/profile')} />
        </View>

        <ActiveHelpersSection compactCards />

        {/* Hire banner */}
        <View style={h.hireBanner}>
          <View style={h.hireBannerLeft}>
            <Text style={h.hireBannerTitle}>Need help at home?</Text>
            <Text style={h.hireBannerSub}>Post a job and find trusted helpers today.</Text>
          </View>
          <TouchableOpacity style={h.hireBannerBtn} onPress={() => router.push('/(parent)/jobs')}>
            <Text style={h.hireBannerBtnText}>Post Job</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
      <ParentTabBar />
      {renderModals()}
    </SafeAreaView>
  );
}
