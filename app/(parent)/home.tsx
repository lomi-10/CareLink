// app/(parent)/home.tsx
import React, { useState } from 'react';
import {
  View, ScrollView, RefreshControl, ActivityIndicator,
  SafeAreaView, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { styles as layoutStyles } from './home.styles';

import { useParentStats } from '@/hooks/parent';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';

import { NotificationModal, ConfirmationModal } from '@/components/shared';
import { Sidebar, MobileMenu, GreetingCard } from '@/components/parent/home';
import {
  MobileHeader, StatCard, MobileStatCard,
  QuickAction, SectionHeader,
} from '@/components/helper/home';

export default function ParentHome() {
  const router = useRouter();

  const { handleLogout, getFullName } = useAuth();
  const { stats, loading: statsLoading, refresh } = useParentStats();
  const { isDesktop } = useResponsive();
  const { unreadCount } = useNotifications('parent');

  const [isMobileMenuOpen,     setIsMobileMenuOpen]     = useState(false);
  const [confirmLogoutVisible,  setConfirmLogoutVisible]  = useState(false);
  const [successLogoutVisible,  setSuccessLogoutVisible]  = useState(false);

  const initiateLogout = () => { setIsMobileMenuOpen(false); setConfirmLogoutVisible(true); };
  const executeLogout  = () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); };

  if (statsLoading) {
    return (
      <View style={layoutStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.color.parent} />
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
          {/* Desktop top bar */}
          <View style={s.desktopTopBar}>
            <View>
              <Text style={s.desktopPageTitle}>Dashboard</Text>
              <Text style={s.desktopPageSub}>Parent Portal — Home & Family Care</Text>
            </View>
            <TouchableOpacity
              style={[s.desktopNotifBtn, unreadCount > 0 && s.desktopNotifBtnActive]}
              onPress={() => router.push('/(parent)/notifications')}
            >
              <Ionicons
                name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                size={20}
                color={unreadCount > 0 ? theme.color.parent : theme.color.muted}
              />
              {unreadCount > 0 && (
                <View style={[s.notifBadge, { backgroundColor: theme.color.parent }]}>
                  <Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <GreetingCard userName={getFullName()} />

          {/* Stats */}
          <SectionHeader title="Your Overview" />
          <View style={layoutStyles.statsGrid}>
            <StatCard icon="briefcase" iconColor={theme.color.parent} iconBg={theme.color.parentSoft}
              title="Posted Jobs" value={stats.posted_jobs} onPress={() => router.push('/(parent)/jobs')} />
            <StatCard icon="people" iconColor={theme.color.success} iconBg={theme.color.successSoft}
              title="Applications" value={stats.active_applications} onPress={() => router.push('/(parent)/applications')} />
            <StatCard icon="chatbubbles" iconColor={theme.color.info} iconBg={theme.color.infoSoft}
              title="Messages" value={stats.messages} onPress={() => router.push('/(parent)/messages')} />
            <StatCard icon="checkmark-circle" iconColor="#7C3AED" iconBg="#F3E8FF"
              title="Hired Helpers" value={stats.hired_helpers} />
          </View>

          {/* Quick Actions */}
          <SectionHeader title="Quick Actions" />
          <View style={layoutStyles.quickActionsDesktop}>
            <QuickActionDesktop icon="add-circle" title="Post a Job" desc="Find the perfect helper for your home"
              color={theme.color.parent} onPress={() => router.push('/(parent)/jobs')} />
            <QuickActionDesktop icon="search" title="Browse Helpers" desc="View PESO-verified helpers"
              color={theme.color.success} onPress={() => router.push('/(parent)/browse_helpers')} />
            <QuickActionDesktop icon="people" title="Applications" desc="Review & manage applicants"
              color={theme.color.info} onPress={() => router.push('/(parent)/applications')} />
          </View>

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
        accentColor={theme.color.parent}
        subtitle="Parent Portal"
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(parent)/notifications')}
      />
      <ScrollView
        contentContainerStyle={[layoutStyles.mobileScrollContent, { paddingBottom: 60 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      >
        <GreetingCard userName={getFullName()} />

        {/* Stats */}
        <View style={layoutStyles.mobileStatsRow}>
          <MobileStatCard icon="briefcase" color={theme.color.parent} value={stats.posted_jobs}
            label="Jobs" onPress={() => router.push('/(parent)/jobs')} />
          <MobileStatCard icon="people" color={theme.color.success} value={stats.active_applications}
            label="Applicants" onPress={() => router.push('/(parent)/applications')} />
          <MobileStatCard icon="chatbubbles" color={theme.color.info} value={stats.messages}
            label="Messages" onPress={() => router.push('/(parent)/messages')} />
        </View>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <View style={layoutStyles.quickActionsGrid}>
          <QuickAction icon="add-circle" label="Post Job" color={theme.color.parent}
            onPress={() => router.push('/(parent)/jobs')} />
          <QuickAction icon="search" label="Find Helpers" color={theme.color.success}
            onPress={() => router.push('/(parent)/browse_helpers')} />
          <QuickAction icon="chatbubbles" label="Messages" color={theme.color.info}
            onPress={() => router.push('/(parent)/messages')} />
          <QuickAction icon="person" label="My Profile" color="#7C3AED"
            onPress={() => router.push('/(parent)/profile')} />
        </View>

        {/* Hire banner */}
        <View style={s.hireBanner}>
          <View style={s.hireBannerLeft}>
            <Text style={s.hireBannerTitle}>Need help at home?</Text>
            <Text style={s.hireBannerSub}>Post a job and find trusted helpers today.</Text>
          </View>
          <TouchableOpacity
            style={[s.hireBannerBtn, { backgroundColor: theme.color.parent }]}
            onPress={() => router.push('/(parent)/jobs')}
          >
            <Text style={s.hireBannerBtnText}>Post Job</Text>
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
    <TouchableOpacity style={[s.qaDesktop, layoutStyles.quickActionDesktopCard]} onPress={onPress} activeOpacity={0.88}>
      <View style={[layoutStyles.quickActionDesktopIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <Text style={layoutStyles.quickActionDesktopTitle}>{title}</Text>
      <Text style={layoutStyles.quickActionDesktopDesc}>{desc}</Text>
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
    backgroundColor: theme.color.parentSoft,
    borderColor: theme.color.parent + '40',
  },
  notifBadge: {
    position: 'absolute', top: 6, right: 6,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  qaDesktop: { flex: 1 },

  hireBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.color.parentSoft,
    borderRadius: 14, padding: 16,
    marginTop: 8,
    borderWidth: 1, borderColor: theme.color.parent + '30',
  },
  hireBannerLeft:   { flex: 1 },
  hireBannerTitle:  { fontSize: 14, fontWeight: '800', color: theme.color.parent, marginBottom: 3 },
  hireBannerSub:    { fontSize: 12, color: theme.color.inkMuted },
  hireBannerBtn:    { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  hireBannerBtnText:{ color: '#fff', fontSize: 13, fontWeight: '800' },
});
