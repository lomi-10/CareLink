import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useParentTheme } from '@/contexts/ParentThemeContext';
import { Sidebar, MobileMenu, ParentTabBar } from '@/components/parent/home';
import { MobileHeader } from '@/components/helper/home';
import { ActiveHelperCard } from '@/components/parent/home/ActiveHelperCard';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import { useParentRecentlyEndedPlacements } from '@/hooks/parent/useParentRecentlyEndedPlacements';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import {
  ConfirmationModal,
  NotificationModal,
  PlacementReviewModal,
  PostPlacementRenewalCard,
} from '@/components/shared';

import { createParentActiveHelpersStyles } from './active_helpers.styles';

function formatEndedShort(d?: string | null): string | null {
  if (!d) return null;
  try {
    const x = new Date(String(d).replace(/-/g, '/'));
    if (Number.isNaN(x.getTime())) return d;
    return x.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function ActiveHelpersScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { color: c } = useParentTheme();
  const styles = useMemo(() => createParentActiveHelpersStyles(c), [c]);
  const { handleLogout, userData } = useAuth();
  const parentId = userData ? Number(userData.user_id) : 0;
  const { placements, loading, refresh } = useParentActivePlacements();
  const {
    placements: pastPlacements,
    loading: pastLoading,
    refresh: refreshPast,
  } = useParentRecentlyEndedPlacements(20);
  const { unreadCount } = useNotifications('parent');

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    applicationId: number;
    counterpartyName: string;
    jobTitle?: string;
  } | null>(null);
  const [renewalRefreshTok, setRenewalRefreshTok] = useState(0);

  const openPlacementReview = (applicationId: number, counterpartyName: string, jobTitle?: string) => {
    setReviewTarget({ applicationId, counterpartyName, jobTitle });
    setReviewModalVisible(true);
  };

  const placementReviewModal = (
    <PlacementReviewModal
      visible={reviewModalVisible && !!reviewTarget}
      onClose={() => {
        setReviewModalVisible(false);
        setReviewTarget(null);
      }}
      applicationId={reviewTarget?.applicationId ?? 0}
      userType="parent"
      counterpartyName={reviewTarget?.counterpartyName ?? ''}
      jobTitle={reviewTarget?.jobTitle}
      accentColor={c.parent}
      onSubmitted={() => void refreshPast()}
    />
  );
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), refreshPast()]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, refreshPast]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const initiateLogout = () => {
    setMenuOpen(false);
    setConfirmLogout(true);
  };

  const content = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={c.parent}
        />
      }
    >
      <Text style={styles.lead}>
        Each card is one active placement. Use <Text style={styles.bold}>My Job Posts</Text> to add more roles
        and hire additional helpers (for example a cook and a yaya).
      </Text>

      {loading && placements.length === 0 ? (
        <ActivityIndicator color={c.parent} style={{ marginTop: 40 }} />
      ) : placements.length === 0 ? (
        <Text style={styles.empty}>No active helpers yet. Hire from Applications, then return here.</Text>
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

      <Text style={styles.sectionTitle}>Past helpers</Text>
      <Text style={styles.sectionSub}>
        Recently ended placements — rate your experience or indicate if you want to renew.
      </Text>
      {pastLoading && pastPlacements.length === 0 ? (
        <ActivityIndicator color={c.parent} style={{ marginVertical: 16 }} />
      ) : pastPlacements.length === 0 ? (
        <Text style={styles.pastEmpty}>No past placements in the last 180 days.</Text>
      ) : (
        pastPlacements.map((p) => {
          const endedLabel = formatEndedShort(p.ended_on);
          return (
            <View key={p.application_id} style={styles.pastCard}>
              <View style={styles.pastHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.pastName}>{p.helper_name}</Text>
                  <Text style={styles.pastMeta} numberOfLines={2}>
                    {p.job_title ? `${p.job_title} · ` : ''}
                    {endedLabel ? `Ended ${endedLabel}` : 'Ended'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.rateBtn}
                  onPress={() => openPlacementReview(p.application_id, p.helper_name, p.job_title)}
                  activeOpacity={0.88}
                >
                  <Ionicons name="star-outline" size={18} color={c.parent} />
                  <Text style={styles.rateBtnText}>Rate</Text>
                </TouchableOpacity>
              </View>
              <PostPlacementRenewalCard
                applicationId={p.application_id}
                jobPostId={p.job_post_id}
                messagesPartnerUserId={p.helper_id}
                userType="parent"
                counterpartyName={p.helper_name}
                jobTitle={p.job_title}
                endedOn={p.ended_on}
                accentColor={c.parent}
                softBg={c.parentSoft}
                refreshToken={renewalRefreshTok}
                onIntentSaved={() => {
                  setRenewalRefreshTok((x) => x + 1);
                  void refreshPast();
                }}
              />
            </View>
          );
        })
      )}
    </ScrollView>
  );

  if (isDesktop) {
    return (
      <View style={styles.rootRow}>
        <Sidebar onLogout={initiateLogout} />
        <View style={styles.main}>
          <View style={styles.desktopHead}>
            <View>
              <Text style={styles.pageTitle}>Active helpers</Text>
              <Text style={styles.pageSub}>Employment and daily tools</Text>
            </View>
          </View>
          {content}
        </View>
        <ConfirmationModal
          visible={confirmLogout}
          title="Log Out"
          message="Are you sure you want to log out?"
          confirmText="Log Out"
          cancelText="Cancel"
          type="danger"
          onConfirm={() => {
            setConfirmLogout(false);
            setSuccessLogout(true);
          }}
          onCancel={() => setConfirmLogout(false)}
        />
        <NotificationModal
          visible={successLogout}
          message="Logged out successfully"
          type="success"
          autoClose
          duration={1500}
          onClose={() => {
            setSuccessLogout(false);
            handleLogout();
          }}
        />
        {placementReviewModal}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <MobileHeader
        onMenuPress={() => setMenuOpen(true)}
        accentColor={c.parent}
        subtitle="Active helpers"
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(parent)/notifications')}
      />
      {content}
      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        handleLogout={initiateLogout}
        notificationUnread={unreadCount}
      />
      <ConfirmationModal
        visible={confirmLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          setConfirmLogout(false);
          setSuccessLogout(true);
        }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout}
        message="Logged out successfully"
        type="success"
        autoClose
        duration={1500}
        onClose={() => {
          setSuccessLogout(false);
          handleLogout();
        }}
      />
      {placementReviewModal}
      <ParentTabBar />
    </SafeAreaView>
  );
}
