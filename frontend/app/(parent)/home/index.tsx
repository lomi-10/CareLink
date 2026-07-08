// app/(parent)/home/index.tsx
// PHP: parent/get_stats.php (via useParentStats), parent/get_job_applications.php (via useParentRecentlyEndedPlacements)
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, RefreshControl, ActivityIndicator,
  SafeAreaView, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { h } from './home.styles';
import { useParentStats, useParentProfile } from '@/hooks/parent';
import type { PendingReview } from '@/lib/reviewsApi';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import { FontFamily } from '@/constants/GlobalStyles';

import { NotificationModal, ConfirmationModal, PendingPlacementReviewsBanner, PlacementReviewModal } from '@/components/shared';
import WelcomeGuideModal from '@/components/shared/WelcomeGuideModal';
import { AwaitingVerificationCard } from '@/components/shared/AwaitingVerificationCard';
import {
  Sidebar, MobileMenu, GreetingCard, RecommendedHelpersSection, ParentSetupGuide,
  ParentTabBar, ParentStatTile, SafetyBanner, ParentWorkModeTabBar,
} from '@/components/parent/home';
import {
  BROWN, CARAMEL, GOLD, DARK, MUTED, DIVIDER, ICON_BG, GREEN, SUCCESS_BG,
} from '@/components/parent/home/parentWarmTheme';
import { MobileHeader, QuickAction, SectionHeader } from '@/components/helper/home';
import ParentWorkDashboard from './ParentWorkDashboard';

const INFO    = '#3B82F6';
const INFO_BG = '#DBEAFE';
const AMBER   = '#D97706';
const AMBER_BG = '#FEF3C7';

type PortalMode = 'recruitment' | 'work';
const MODE_KEY = 'parent_portal_mode';

export default function ParentHome() {
  const router = useRouter();

  const { handleLogout, getFullName, userData } = useAuth();
  const { profileData, refresh: refreshProfile } = useParentProfile();
  const profileImage = (profileData?.profile?.profile_image ?? userData?.profile_image ?? null) as string | null;

  useFocusEffect(useCallback(() => { refreshProfile(); }, []));
  const { stats, loading: statsLoading, refresh } = useParentStats();
  const { isDesktop } = useResponsive();
  const { unreadCount } = useNotifications('parent');

  // ── Mode toggle ─────────────────────────────────────────────────────────────
  const [portalMode, setPortalMode] = useState<PortalMode>('recruitment');
  const [modeReady, setModeReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((v) => {
      if (v === 'work' || v === 'recruitment') setPortalMode(v);
      setModeReady(true);
    });
  }, []);

  const switchMode = async (mode: PortalMode) => {
    await AsyncStorage.setItem(MODE_KEY, mode);
    setPortalMode(mode);
  };

  // First-login walkthrough: show the paged guide once, then remember it.
  // Re-openable anytime from Settings → Guide.
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  useEffect(() => {
    if (!profileData) return; // wait for the profile so we know the status
    // Only new/unverified accounts get the welcome walkthrough — once PESO has
    // verified them there's nothing left to onboard, so it never pops again.
    if (profileData?.profile?.verification_status === 'Verified') return;
    AsyncStorage.getItem('parent_welcome_seen_v1').then((seen) => {
      if (!seen) setWelcomeVisible(true);
    });
  }, [profileData]);
  const closeWelcome = () => {
    setWelcomeVisible(false);
    AsyncStorage.setItem('parent_welcome_seen_v1', '1').catch(() => {});
  };

  // One-time celebration when the profile first reaches 90%+ (verification-ready).
  const [celebrateVisible, setCelebrateVisible] = useState(false);
  useEffect(() => {
    const pct = profileData?.profile_completeness ?? 0;
    const vstatus = String(profileData?.profile?.verification_status ?? '');
    if (pct >= 90 && vstatus !== 'Verified' && vstatus !== 'Rejected') {
      AsyncStorage.getItem('parent_profile_complete_v1').then((seen) => {
        if (!seen) {
          setCelebrateVisible(true);
          AsyncStorage.setItem('parent_profile_complete_v1', '1').catch(() => {});
        }
      });
    }
  }, [profileData?.profile_completeness, profileData?.profile?.verification_status]);

  const isWorkMode = portalMode === 'work';
  // Work Mode is only usable once the parent has an active hire. They can still
  // toggle into it (they can "see" it) but it stays locked until then.
  const hasActiveHire = (stats?.active_placements ?? 0) > 0;
  const workModeUnlocked = isWorkMode && hasActiveHire;

  // ── Misc state ──────────────────────────────────────────────────────────────
  const [isMobileMenuOpen,         setIsMobileMenuOpen]         = useState(false);
  const [confirmLogoutVisible,      setConfirmLogoutVisible]      = useState(false);
  const [successLogoutVisible,      setSuccessLogoutVisible]      = useState(false);
  const [placementReviewRefreshTok, setPlacementReviewRefreshTok] = useState(0);
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

  if (statsLoading || !modeReady) {
    return (
      <View style={h.loadingContainer}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  const renderModals = () => (
    <>
      <WelcomeGuideModal visible={welcomeVisible} onClose={closeWelcome} role="parent" accent={BROWN} />
      <NotificationModal
        visible={celebrateVisible}
        message="Profile complete! You're now awaiting PESO verification."
        type="success"
        autoClose
        duration={2800}
        onClose={() => setCelebrateVisible(false)}
      />
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
        onSubmitted={bumpPlacementReviewBanner}
      />
    </>
  );

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

  // ── Mode toggle pill ─────────────────────────────────────────────────────────
  const renderModeToggle = () => (
    <View style={ms.toggleWrap}>
      <View style={ms.togglePill}>
        <TouchableOpacity
          style={[ms.toggleOption, !isWorkMode && ms.toggleActive]}
          onPress={() => switchMode('recruitment')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="search"
            size={14}
            color={!isWorkMode ? '#fff' : MUTED}
          />
          <Text style={[ms.toggleLabel, !isWorkMode && ms.toggleLabelActive]}>
            RECRUITMENT MODE
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ms.toggleOption, isWorkMode && ms.toggleActive]}
          onPress={() => switchMode('work')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="briefcase"
            size={14}
            color={isWorkMode ? '#fff' : MUTED}
          />
          <Text style={[ms.toggleLabel, isWorkMode && ms.toggleLabelActive]}>
            WORK MODE
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={ms.toggleSub}>
        {isWorkMode
          ? 'You are in Work Mode. Manage your active helpers and daily household operations.'
          : 'You are in Recruitment Mode. Find and hire the right helper for your home.'}
      </Text>
    </View>
  );

  // ── Work Mode locked state (no active hire yet) ─────────────────────────────
  const renderWorkModeLocked = () => (
    <View style={ms.lockedWrap}>
      <View style={ms.lockedIcon}>
        <Ionicons name="lock-closed" size={32} color={CARAMEL} />
      </View>
      <Text style={ms.lockedTitle}>Work Mode is locked</Text>
      <Text style={ms.lockedBody}>
        You haven’t hired a helper yet. Once you hire someone, Work Mode unlocks task management,
        attendance, schedules, and salary.
      </Text>
      <TouchableOpacity style={ms.lockedBtn} onPress={() => switchMode('recruitment')} activeOpacity={0.88}>
        <Ionicons name="search" size={16} color="#fff" />
        <Text style={ms.lockedBtnText}>Back to Recruitment</Text>
      </TouchableOpacity>
      <TouchableOpacity style={ms.lockedLink} onPress={() => router.push('/(parent)/browse')} activeOpacity={0.7}>
        <Text style={ms.lockedLinkText}>Browse helpers to hire →</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── DESKTOP ────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={[h.container, { flexDirection: 'row' }]}>
        <Sidebar onLogout={initiateLogout} />
        <ScrollView
          style={h.mainContent}
          contentContainerStyle={[h.scrollContent, { maxWidth: 900, alignSelf: 'center', width: '100%' }]}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => { refresh(); bumpPlacementReviewBanner(); }} />
          }
        >
          <View style={h.desktopTopBar}>
            <View>
              <Text style={h.desktopPageTitle}>{isWorkMode ? 'Work Dashboard' : 'Dashboard'}</Text>
              <Text style={h.desktopPageSub}>
                {isWorkMode ? 'Manage your active helpers' : 'Parent Portal — Home & Family Care'}
              </Text>
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

          {renderModeToggle()}

          {isWorkMode ? (
            workModeUnlocked ? (
              <ParentWorkDashboard
                userName={getFullName()}
                profileImage={profileImage}
                onSwitchToRecruitment={() => switchMode('recruitment')}
              />
            ) : (
              renderWorkModeLocked()
            )
          ) : (
            <>
              <GreetingCard userName={getFullName()} profileImage={profileImage} />
              <ParentSetupGuide profileData={profileData} firstName={(getFullName() || '').split(' ')[0]} />
              <AwaitingVerificationCard completeness={profileData?.profile_completeness} status={profileData?.profile?.verification_status} themeKey="parent" />
              <PendingPlacementReviewsBanner
                userType="parent"
                accentColor={BROWN}
                softBg={ICON_BG}
                refreshToken={placementReviewRefreshTok}
                onReviewPress={(item: PendingReview) =>
                  openPlacementReview(item.application_id, item.counterparty_name, item.job_title)
                }
              />
              {profileData?.profile?.verification_status === 'Verified' && <RecommendedHelpersSection />}
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
            </>
          )}
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
        subtitle={isWorkMode ? 'Work Mode' : 'Parent Portal'}
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(parent)/notifications')}
      />

      {isWorkMode ? (
        <>
          {renderModeToggle()}
          {workModeUnlocked ? (
            <ParentWorkDashboard
              userName={getFullName()}
              profileImage={profileImage}
              onSwitchToRecruitment={() => switchMode('recruitment')}
            />
          ) : (
            renderWorkModeLocked()
          )}
        </>
      ) : (
        <ScrollView
          contentContainerStyle={[h.mobileScrollContent, { paddingBottom: 88 }]}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => { refresh(); bumpPlacementReviewBanner(); }} />
          }
        >
          {renderModeToggle()}
          <GreetingCard userName={getFullName()} profileImage={profileImage} />
          <ParentSetupGuide profileData={profileData} firstName={(getFullName() || '').split(' ')[0]} />
          <AwaitingVerificationCard completeness={profileData?.profile_completeness} status={profileData?.profile?.verification_status} themeKey="parent" />
          <PendingPlacementReviewsBanner
            userType="parent"
            accentColor={BROWN}
            softBg={ICON_BG}
            refreshToken={placementReviewRefreshTok}
            onReviewPress={(item: PendingReview) =>
              openPlacementReview(item.application_id, item.counterparty_name, item.job_title)
            }
          />
          {profileData?.profile?.verification_status === 'Verified' && <RecommendedHelpersSection />}
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
      )}

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
      {workModeUnlocked ? <ParentWorkModeTabBar /> : <ParentTabBar />}
      {renderModals()}
    </SafeAreaView>
  );
}

// ── Mode toggle styles ────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  toggleWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: '#F3E8D6',
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  toggleOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 24,
  },
  toggleActive: { backgroundColor: CARAMEL },
  toggleLabel: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.5,
  },
  toggleLabelActive: { color: '#fff' },
  toggleSub: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },

  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 24 },
  lockedIcon: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  lockedTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, marginBottom: 8 },
  lockedBody: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: MUTED, textAlign: 'center', lineHeight: 20, maxWidth: 340 },
  lockedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CARAMEL,
    paddingVertical: 13, paddingHorizontal: 22, borderRadius: 13, marginTop: 22,
  },
  lockedBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: '#fff' },
  lockedLink: { marginTop: 14, paddingVertical: 6 },
  lockedLinkText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: BROWN },
});
