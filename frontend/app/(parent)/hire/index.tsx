// app/(parent)/hire/index.tsx
// Mode router: shows WorkModeHelpersScreen in work mode, else recruitment Active Helpers.
// PHP: parent/get_job_applications.php + parent/get_posted_jobs.php, v1/applications/termination_details.php
import React, { useCallback, useState } from 'react';
import {
  View, ScrollView, Text, SafeAreaView,
  RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { s } from './active_helpers.styles';
import { BG, BROWN, ICON_BG } from '@/components/parent/home/parentWarmTheme';
import { Sidebar, MobileMenu, ParentTabBar } from '@/components/parent/home';
import { MobileHeader } from '@/components/helper/home';
import { ActiveHelperCard } from '@/components/parent/home/ActiveHelperCard';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import { useParentRecentlyEndedPlacements } from '@/hooks/parent/useParentRecentlyEndedPlacements';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import {
  ConfirmationModal, NotificationModal,
  PlacementReviewModal, PostPlacementRenewalCard,
} from '@/components/shared';
import { WorkModeHelpersScreen } from './WorkModeHelpersScreen';

// ── Default export: mode router ──────────────────────────────────────────
export default function HireScreen() {
  const [portalMode, setPortalMode] = useState<'recruitment' | 'work'>('recruitment');
  const [modeReady, setModeReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void AsyncStorage.getItem('parent_portal_mode').then(v => {
        setPortalMode(v === 'work' ? 'work' : 'recruitment');
        setModeReady(true);
      });
    }, []),
  );

  if (!modeReady) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <ActivityIndicator color={BROWN} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (portalMode === 'work') return <WorkModeHelpersScreen />;
  return <RecruitmentHelpersScreen />;
}

// ── Recruitment mode: active + past helpers ──────────────────────────────
function formatEndedShort(d?: string | null): string | null {
  if (!d) return null;
  try {
    const x = new Date(String(d).replace(/-/g, '/'));
    if (Number.isNaN(x.getTime())) return d;
    return x.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
}

function RecruitmentHelpersScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout, userData } = useAuth();
  const parentId = userData ? Number(userData.user_id) : 0;
  const { placements, loading, refresh } = useParentActivePlacements();
  const { placements: pastPlacements, loading: pastLoading, refresh: refreshPast } =
    useParentRecentlyEndedPlacements(20);
  const { unreadCount } = useNotifications('parent');

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    applicationId: number; counterpartyName: string; jobTitle?: string;
  } | null>(null);
  const [renewalRefreshTok, setRenewalRefreshTok] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const openPlacementReview = (applicationId: number, counterpartyName: string, jobTitle?: string) => {
    setReviewTarget({ applicationId, counterpartyName, jobTitle });
    setReviewModalVisible(true);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refresh(), refreshPast()]); }
    finally { setRefreshing(false); }
  }, [refresh, refreshPast]);

  const initiateLogout = () => { setMenuOpen(false); setConfirmLogout(true); };

  const placementReviewModal = (
    <PlacementReviewModal
      visible={reviewModalVisible && !!reviewTarget}
      onClose={() => { setReviewModalVisible(false); setReviewTarget(null); }}
      applicationId={reviewTarget?.applicationId ?? 0}
      userType="parent"
      counterpartyName={reviewTarget?.counterpartyName ?? ''}
      jobTitle={reviewTarget?.jobTitle}
      accentColor={BROWN}
      onSubmitted={() => void refreshPast()}
    />
  );

  const sharedModals = (
    <>
      <ConfirmationModal
        visible={confirmLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out" cancelText="Cancel" type="danger"
        onConfirm={() => { setConfirmLogout(false); setSuccessLogout(true); }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout}
        message="Logged out successfully"
        type="success" autoClose duration={1500}
        onClose={() => { setSuccessLogout(false); handleLogout(); }}
      />
      {placementReviewModal}
    </>
  );

  const content = (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BROWN} />}
    >
      <Text style={s.lead}>
        Each card is one active placement. Use <Text style={s.bold}>My Job Posts</Text> to add more roles
        and hire additional helpers (for example a cook and a yaya).
      </Text>

      {loading && placements.length === 0 ? (
        <ActivityIndicator color={BROWN} style={{ marginTop: 40 }} />
      ) : placements.length === 0 ? (
        <Text style={s.empty}>No active helpers yet. Hire from Applications, then return here.</Text>
      ) : (
        placements.map((p) => (
          <ActiveHelperCard
            key={p.application_id}
            placement={p}
            parentId={parentId}
            onPlacementChanged={refresh}
          />
        ))
      )}

      <Text style={s.sectionTitle}>Past helpers</Text>
      <Text style={s.sectionSub}>
        Recently ended placements — rate your experience or indicate if you want to renew.
      </Text>
      {pastLoading && pastPlacements.length === 0 ? (
        <ActivityIndicator color={BROWN} style={{ marginVertical: 16 }} />
      ) : pastPlacements.length === 0 ? (
        <Text style={s.pastEmpty}>No past placements in the last 180 days.</Text>
      ) : (
        pastPlacements.map((p) => {
          const endedLabel = formatEndedShort(p.ended_on);
          return (
            <View key={p.application_id} style={s.pastCard}>
              <View style={s.pastHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.pastName}>{p.helper_name}</Text>
                  <Text style={s.pastMeta} numberOfLines={2}>
                    {p.job_title ? `${p.job_title} · ` : ''}
                    {endedLabel ? `Ended ${endedLabel}` : 'Ended'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.rateBtn}
                  onPress={() => openPlacementReview(Number(p.application_id), p.helper_name, p.job_title)}
                  activeOpacity={0.88}
                >
                  <Ionicons name="star-outline" size={18} color={BROWN} />
                  <Text style={s.rateBtnText}>Rate</Text>
                </TouchableOpacity>
              </View>
              <PostPlacementRenewalCard
                applicationId={Number(p.application_id)}
                jobPostId={Number(p.job_post_id)}
                messagesPartnerUserId={Number(p.helper_id)}
                userType="parent"
                counterpartyName={p.helper_name}
                jobTitle={p.job_title}
                endedOn={p.ended_on}
                accentColor={BROWN}
                softBg={ICON_BG}
                refreshToken={renewalRefreshTok}
                onIntentSaved={() => { setRenewalRefreshTok((x) => x + 1); void refreshPast(); }}
              />
            </View>
          );
        })
      )}
    </ScrollView>
  );

  if (isDesktop) {
    return (
      <View style={s.rootRow}>
        <Sidebar onLogout={initiateLogout} />
        <View style={s.main}>
          <View style={s.desktopHead}>
            <Text style={s.pageTitle}>Active helpers</Text>
            <Text style={s.pageSub}>Employment and daily tools</Text>
          </View>
          {content}
        </View>
        {sharedModals}
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <MobileHeader
        onMenuPress={() => setMenuOpen(true)}
        subtitle="Active helpers"
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(parent)/notifications')}
      />
      {content}
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} handleLogout={initiateLogout} notificationUnread={unreadCount} />
      {sharedModals}
      <ParentTabBar />
    </SafeAreaView>
  );
}
