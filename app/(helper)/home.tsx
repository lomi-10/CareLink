// app/(helper)/home.tsx
import React, { useState } from 'react';
import {
  View, ScrollView, RefreshControl, ActivityIndicator,
  SafeAreaView, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { styles as layoutStyles } from './home.styles';

import { useHelperStats } from '@/hooks/helper';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';

import { NotificationModal, ConfirmationModal } from '@/components/shared';
import {
  Sidebar, MobileHeader, GreetingCard,
  StatCard, MobileStatCard, QuickAction, SectionHeader,
  MobileMenu, RecommendationsSection,
} from '@/components/helper/home';

export default function HelperHome() {
  const router = useRouter();

  const { userData, loading: authLoading, handleLogout, getFullName } = useAuth();
  const { stats, loading: statsLoading, refresh } = useHelperStats();
  const { isDesktop, isMobile }  = useResponsive();
  const { unreadCount } = useNotifications('helper');

  const [isMobileMenuOpen,    setIsMobileMenuOpen]    = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

  const initiateLogout = () => { setIsMobileMenuOpen(false); setConfirmLogoutVisible(true); };
  const executeLogout  = () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); };

  const loading = authLoading || statsLoading;

  if (loading) {
    return (
      <View style={layoutStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.color.helper} />
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
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
        >
          {/* Notification bar for desktop */}
          <View style={s.desktopTopBar}>
            <View>
              <Text style={s.desktopPageTitle}>Dashboard</Text>
              <Text style={s.desktopPageSub}>Helper Portal — Domestic Services</Text>
            </View>
            <TouchableOpacity
              style={[s.desktopNotifBtn, unreadCount > 0 && s.desktopNotifBtnActive]}
              onPress={() => router.push('/(helper)/notifications')}
            >
              <Ionicons
                name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                size={20}
                color={unreadCount > 0 ? theme.color.helper : theme.color.muted}
              />
              {unreadCount > 0 && (
                <View style={[s.notifBadge, { backgroundColor: theme.color.helper }]}>
                  <Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <GreetingCard userName={getFullName()} />

          {/* Stats */}
          <SectionHeader title="Your Overview" />
          <View style={layoutStyles.statsGrid}>
            <StatCard icon="briefcase" iconColor={theme.color.helper} iconBg={theme.color.helperSoft}
              title="Applications" value={stats.applications} onPress={() => router.push('/(helper)/my_applications')} />
            <StatCard icon="bookmark" iconColor={theme.color.info} iconBg={theme.color.infoSoft}
              title="Saved Jobs" value={stats.saved_jobs} onPress={() => router.push('/(helper)/saved_jobs')} />
            <StatCard icon="eye" iconColor={theme.color.success} iconBg={theme.color.successSoft}
              title="Profile Views" value={stats.profile_views} />
          </View>

          {/* Quick Actions */}
          <SectionHeader title="Quick Actions" />
          <View style={layoutStyles.quickActionsGrid}>
            <QuickActionDesktop icon="search" title="Find Jobs" desc="Browse PESO-verified openings"
              color={theme.color.info} onPress={() => router.push('/(helper)/browse_jobs')} />
            <QuickActionDesktop icon="person" title="My Profile" desc="Update your info & docs"
              color={theme.color.helper} onPress={() => router.push('/(helper)/profile')} />
            <QuickActionDesktop icon="document-text" title="Applications" desc="Track your applications"
              color={theme.color.success} onPress={() => router.push('/(helper)/my_applications')} />
          </View>

          <RecommendationsSection />
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
        accentColor={theme.color.helper}
        subtitle="Helper Portal"
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(helper)/notifications')}
      />
      <ScrollView
        contentContainerStyle={[layoutStyles.mobileScrollContent, { paddingBottom: 60 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      >
        <GreetingCard userName={getFullName()} />

        {/* Stats row */}
        <View style={layoutStyles.mobileStatsRow}>
          <MobileStatCard icon="briefcase" color={theme.color.helper} value={stats.applications}
            label="Applied" onPress={() => router.push('/(helper)/my_applications')} />
          <MobileStatCard icon="bookmark" color={theme.color.info} value={stats.saved_jobs}
            label="Saved" onPress={() => router.push('/(helper)/saved_jobs')} />
          <MobileStatCard icon="eye" color={theme.color.success} value={stats.profile_views} label="Views" />
        </View>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <View style={layoutStyles.quickActionsGrid}>
          <QuickAction icon="search" label="Find Jobs" color={theme.color.info}
            onPress={() => router.push('/(helper)/browse_jobs')} />
          <QuickAction icon="person" label="My Profile" color={theme.color.helper}
            onPress={() => router.push('/(helper)/profile')} />
          <QuickAction icon="document-text" label="Applications" color={theme.color.success}
            onPress={() => router.push('/(helper)/my_applications')} />
          <QuickAction icon="document" label="Documents" color={theme.color.peso}
            onPress={() => router.push('/(helper)/profile')} />
        </View>

        {/* Recruitment banner */}
        <View style={s.recruitBanner}>
          <View style={s.recruitBannerLeft}>
            <Text style={s.recruitBannerTitle}>Ready to get hired?</Text>
            <Text style={s.recruitBannerSub}>All jobs are PESO-verified and safe.</Text>
          </View>
          <TouchableOpacity
            style={[s.recruitBannerBtn, { backgroundColor: theme.color.helper }]}
            onPress={() => router.push('/(helper)/browse_jobs')}
          >
            <Text style={s.recruitBannerBtnText}>Browse</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} stats={stats} handleLogout={initiateLogout} />
      {renderModals()}
    </SafeAreaView>
  );
}

function QuickActionDesktop({ icon, title, desc, color, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string; desc: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.qaDesktop} onPress={onPress} activeOpacity={0.88}>
      <View style={[s.qaDesktopIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={s.qaDesktopTitle}>{title}</Text>
      <Text style={s.qaDesktopDesc}>{desc}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  desktopTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24,
  },
  desktopPageTitle: { fontSize: 26, fontWeight: '900', color: theme.color.ink, letterSpacing: -0.5 },
  desktopPageSub:   { fontSize: 13, color: theme.color.muted, marginTop: 3 },

  desktopNotifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.color.surface,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    borderWidth: 1, borderColor: theme.color.line,
  },
  desktopNotifBtnActive: {
    backgroundColor: theme.color.helperSoft,
    borderColor: theme.color.helper + '40',
  },
  notifBadge: {
    position: 'absolute', top: 6, right: 6,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  qaDesktop: {
    flex: 1, minWidth: 140,
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 16, padding: 20,
    alignItems: 'flex-start',
    borderWidth: 1, borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  qaDesktopIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  qaDesktopTitle:{ fontSize: 15, fontWeight: '800', color: theme.color.ink, marginBottom: 4 },
  qaDesktopDesc: { fontSize: 12, color: theme.color.muted, lineHeight: 17 },

  recruitBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.color.helperSoft,
    borderRadius: 14, padding: 16,
    marginTop: 8,
    borderWidth: 1, borderColor: theme.color.helper + '30',
  },
  recruitBannerLeft: { flex: 1 },
  recruitBannerTitle: { fontSize: 14, fontWeight: '800', color: theme.color.helper, marginBottom: 3 },
  recruitBannerSub:   { fontSize: 12, color: theme.color.inkMuted },
  recruitBannerBtn:   { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  recruitBannerBtnText:{ color: '#fff', fontSize: 13, fontWeight: '800' },
});
