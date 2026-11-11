// app/(parent)/home/index.tsx
// PHP: parent/get_stats.php (via useParentStats)
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

import { AnnouncementFeed, NotificationModal, ConfirmationModal, PendingPlacementReviewsBanner, PlacementReviewModal, PlacementExperienceConfirmations } from '@/components/shared';
import { useGuide } from '@/contexts/GuideContext';
import { AwaitingVerificationCard } from '@/components/shared/AwaitingVerificationCard';
import {
  Sidebar, MobileMenu, GreetingCard, RecommendedHelpersSection, ParentSetupGuide,
  ParentTabBar, ParentStatTile, SafetyBanner, ParentWorkModeTabBar,
} from '@/components/parent/home';
import {
  BROWN, CARAMEL, GOLD, MUTED, DIVIDER, ICON_BG, GREEN, BG_WEB,
} from '@/components/parent/home/parentWarmTheme';
import { MobileHeader, QuickAction, SectionHeader } from '@/components/helper/home';
import ParentWorkDashboard from './ParentWorkDashboard';
import { ParentTopNav } from '@/components/parent/web/ParentTopNav';
import { ParentHomeWeb } from '@/components/parent/web/ParentHomeWeb';
import { ParentWorkHomeWeb } from '@/components/parent/web/ParentWorkHomeWeb';

const INFO    = '#3B82F6';

type PortalMode = 'recruitment' | 'work';
const MODE_KEY = 'parent_portal_mode';

export default function ParentHome() {
  const router = useRouter();

  const { handleLogout, getFullName, userData } = useAuth();
  const { syncStage } = useGuide();
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

  // Staged guide: the chapter matching where this employer actually is
  // (setup → verified → finding helpers → managing a placement) auto-opens once
  // each time they reach a new one, and never again. Re-openable anytime from
  // the menu. See contexts/GuideContext.tsx.
  //
  // Reads portalMode/stats directly to determine the matching guide chapter.
  useEffect(() => {
    if (!profileData || !modeReady) return; // wait until status + mode are known
    syncStage({
      role: 'parent',
      verified: profileData?.profile?.verification_status === 'Verified',
      hasActivity: (stats?.active_placements ?? 0) > 0,
      working: portalMode === 'work' && (stats?.active_placements ?? 0) > 0,
    });
  }, [profileData, stats?.active_placements, portalMode, modeReady, syncStage]);

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
    return (
      <View style={mobile ? h.mobileStatsRow : h.statsGrid}>
        <ParentStatTile icon="people"           color={BROWN}  iconBg={ICON_BG}
          value={stats.active_placements}    label="Active Helpers"
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
          ? 'You are in Work Mode. Review agreements, payment records, and assistance for placements.'
          : 'You are in Recruitment Mode. Find and hire the right helper for your home.'}
      </Text>
    </View>
  );

  // ─── DESKTOP ────────────────────────────────────────────────────────────────
  if (isDesktop) {
    const desktopBanners = (
      <>
        <ParentSetupGuide profileData={profileData} firstName={(getFullName() || '').split(' ')[0]} />
        <AwaitingVerificationCard completeness={profileData?.profile_completeness} status={profileData?.profile?.verification_status} themeKey="parent" />
        <PendingPlacementReviewsBanner
          userType="parent"
          accentColor={GOLD}
          softBg={ICON_BG}
          refreshToken={placementReviewRefreshTok}
          onReviewPress={(item: PendingReview) =>
            openPlacementReview(item.application_id, item.counterparty_name, item.job_title)
          }
        />
        <PlacementExperienceConfirmations userType="parent" accentColor={GOLD} refreshToken={placementReviewRefreshTok} />
      </>
    );
    return (
      <View style={{ flex: 1, backgroundColor: BG_WEB }}>
        <ParentTopNav
          active="home"
          mode={portalMode}
          userName={getFullName()}
          avatar={profileImage}
          verified={profileData?.profile?.verification_status === 'Verified'}
          onLogout={initiateLogout}
        />
        {isWorkMode ? (
          <>
            <View style={{ width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 24 }}>
              <PlacementExperienceConfirmations userType="parent" accentColor={GOLD} refreshToken={placementReviewRefreshTok} />
            </View>
            <ParentWorkHomeWeb
              userName={getFullName()}
              avatar={profileImage}
              verified={profileData?.profile?.verification_status === 'Verified'}
              onSwitchMode={switchMode}
            />
          </>
        ) : (
          <ParentHomeWeb
            userName={getFullName()}
            avatar={profileImage}
            verified={profileData?.profile?.verification_status === 'Verified'}
            completeness={profileData?.profile_completeness ?? 0}
            stats={stats}
            onSwitchMode={switchMode}
            banners={desktopBanners}
            announcement={<AnnouncementFeed />}
          />
        )}
        {renderModals()}
      </View>
    );
  }

  // ─── MOBILE ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={h.container}>
      <MobileHeader
        onMenuPress={() => setIsMobileMenuOpen(true)}
        subtitle={isWorkMode ? 'Work Mode' : 'Employer Portal'}
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(parent)/notifications')}
      />
      {isWorkMode ? (
        <>
          {renderModeToggle()}
          <PlacementExperienceConfirmations userType="parent" accentColor={BROWN} refreshToken={placementReviewRefreshTok} />
          <ParentWorkDashboard
            userName={getFullName()}
            profileImage={profileImage}
            onSwitchToRecruitment={() => switchMode('recruitment')}
          />
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
          <AnnouncementFeed />
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
          <PlacementExperienceConfirmations userType="parent" accentColor={BROWN} refreshToken={placementReviewRefreshTok} />
          {profileData?.profile?.verification_status === 'Verified' && <RecommendedHelpersSection />}
          <SectionHeader title="My Household" />
          {renderStatsGrid(true)}
          <SafetyBanner />
          <SectionHeader title="Quick Actions" />
          <View style={h.quickActionsGrid}>
            <QuickAction icon="search"     label="Find Helpers" color={GREEN}  onPress={() => router.push('/(parent)/browse')} />
            <QuickAction icon="people"     label="My Helpers"  color={BROWN}  onPress={() => router.push('/(parent)/hire')} />
            <QuickAction icon="chatbubbles" label="Messages"   color={INFO}   onPress={() => router.push('/(parent)/messages')} />
            <QuickAction icon="person"     label="My Profile"  color="#7C3AED" onPress={() => router.push('/(parent)/profile')} />
          </View>
          <View style={h.hireBanner}>
            <View style={h.hireBannerLeft}>
              <Text style={h.hireBannerTitle}>Looking for help at home?</Text>
              <Text style={h.hireBannerSub}>Browse verified helper profiles and connect through CareLink.</Text>
            </View>
            <TouchableOpacity style={h.hireBannerBtn} onPress={() => router.push('/(parent)/browse')}>
              <Text style={h.hireBannerBtnText}>Find Helpers</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
      {isWorkMode ? <ParentWorkModeTabBar /> : <ParentTabBar />}
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

});
