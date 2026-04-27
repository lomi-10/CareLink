// app/(parent)/home.tsx
import React, { useMemo, useState } from 'react';
import {
  View, ScrollView, RefreshControl, ActivityIndicator,
  SafeAreaView, Text, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { createParentHomeStyles } from './home.styles';
import { useParentTheme } from '@/contexts/ParentThemeContext';

import { useParentStats } from '@/hooks/parent';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';

import { NotificationModal, ConfirmationModal } from '@/components/shared';
import { Sidebar, MobileMenu, GreetingCard, ActiveHelpersSection, ParentTabBar } from '@/components/parent/home';
import {
  MobileHeader, StatCard, MobileStatCard,
  QuickAction, SectionHeader,
} from '@/components/helper/home';

export default function ParentHome() {
  const router = useRouter();
  const { color: c } = useParentTheme();
  const layoutStyles = useMemo(() => createParentHomeStyles(c), [c]);

  const { handleLogout, getFullName } = useAuth();
  const { stats, loading: statsLoading, refresh } = useParentStats();
  const { isDesktop } = useResponsive();
  const { unreadCount } = useNotifications('parent');

  const [isMobileMenuOpen,     setIsMobileMenuOpen]     = useState(false);
  const [confirmLogoutVisible,  setConfirmLogoutVisible]  = useState(false);
  const [successLogoutVisible,  setSuccessLogoutVisible]  = useState(false);

  const initiateLogout = () => { setIsMobileMenuOpen(false); setConfirmLogoutVisible(true); };
  const executeLogout  = () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); };

  const QuickActionDesktop = ({ icon, title, desc, color, onPress }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string; desc: string; color: string; onPress: () => void;
  }) => (
    <TouchableOpacity style={[layoutStyles.qaDesktop, layoutStyles.quickActionDesktopCard]} onPress={onPress} activeOpacity={0.88}>
      <View style={[layoutStyles.quickActionDesktopIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <Text style={layoutStyles.quickActionDesktopTitle}>{title}</Text>
      <Text style={layoutStyles.quickActionDesktopDesc}>{desc}</Text>
    </TouchableOpacity>
  );

  if (statsLoading) {
    return (
      <View style={layoutStyles.loadingContainer}>
        <ActivityIndicator size="large" color={c.parent} />
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
          <View style={layoutStyles.desktopTopBar}>
            <View>
              <Text style={layoutStyles.desktopPageTitle}>Dashboard</Text>
              <Text style={layoutStyles.desktopPageSub}>Parent Portal — Home & Family Care</Text>
            </View>
            <TouchableOpacity
              style={[layoutStyles.desktopNotifBtn, unreadCount > 0 && layoutStyles.desktopNotifBtnActive]}
              onPress={() => router.push('/(parent)/notifications')}
            >
              <Ionicons
                name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                size={20}
                color={unreadCount > 0 ? c.parent : c.muted}
              />
              {unreadCount > 0 && (
                <View style={[layoutStyles.notifBadge, { backgroundColor: c.parent }]}>
                  <Text style={layoutStyles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <GreetingCard userName={getFullName()} />

          <ActiveHelpersSection />

          {/* Stats */}
          <SectionHeader title="Your Overview" />
          <View style={layoutStyles.statsGrid}>
            <StatCard icon="briefcase" iconColor={c.parent} iconBg={c.parentSoft}
              title="Posted Jobs" value={stats.posted_jobs} onPress={() => router.push('/(parent)/jobs')} />
            <StatCard icon="people" iconColor={c.success} iconBg={c.successSoft}
              title="Applications" value={stats.active_applications} onPress={() => router.push('/(parent)/applications')} />
            <StatCard icon="chatbubbles" iconColor={c.info} iconBg={c.infoSoft}
              title="Messages" value={stats.messages} onPress={() => router.push('/(parent)/messages')} />
            <StatCard icon="checkmark-circle" iconColor="#7C3AED" iconBg="#F3E8FF"
              title="Hired Helpers" value={stats.hired_helpers}
              onPress={() => router.push('/(parent)/active_helpers')} />
          </View>

          {/* Quick Actions */}
          <SectionHeader title="Quick Actions" />
          <View style={layoutStyles.quickActionsDesktop}>
            <QuickActionDesktop icon="add-circle" title="Post a Job" desc="Find the perfect helper for your home"
              color={c.parent} onPress={() => router.push('/(parent)/jobs')} />
            <QuickActionDesktop icon="search" title="Browse Helpers" desc="View PESO-verified helpers"
              color={c.success} onPress={() => router.push('/(parent)/browse_helpers')} />
            <QuickActionDesktop icon="people" title="Applications" desc="Review & manage applicants"
              color={c.info} onPress={() => router.push('/(parent)/applications')} />
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
        accentColor={c.parent}
        subtitle="Parent Portal"
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(parent)/notifications')}
      />
      <ScrollView
        contentContainerStyle={[layoutStyles.mobileScrollContent, { paddingBottom: 88 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      >
        <GreetingCard userName={getFullName()} />

        <ActiveHelpersSection compactCards />

        {/* Stats */}
        <View style={layoutStyles.mobileStatsRow}>
          <View style={layoutStyles.mobileStatCell}>
            <MobileStatCard icon="briefcase" color={c.parent} value={stats.posted_jobs}
              label="Jobs" onPress={() => router.push('/(parent)/jobs')} />
          </View>
          <View style={layoutStyles.mobileStatCell}>
            <MobileStatCard icon="people" color={c.success} value={stats.active_applications}
              label="Applicants" onPress={() => router.push('/(parent)/applications')} />
          </View>
          <View style={layoutStyles.mobileStatCell}>
            <MobileStatCard icon="chatbubbles" color={c.info} value={stats.messages}
              label="Messages" onPress={() => router.push('/(parent)/messages')} />
          </View>
          <View style={layoutStyles.mobileStatCell}>
            <MobileStatCard icon="checkmark-circle" color="#7C3AED" value={stats.hired_helpers}
              label="Hired" onPress={() => router.push('/(parent)/active_helpers')} />
          </View>
        </View>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <View style={layoutStyles.quickActionsGrid}>
          <QuickAction icon="add-circle" label="Post Job" color={c.parent}
            onPress={() => router.push('/(parent)/jobs')} />
          <QuickAction icon="search" label="Find Helpers" color={c.success}
            onPress={() => router.push('/(parent)/browse_helpers')} />
          <QuickAction icon="chatbubbles" label="Messages" color={c.info}
            onPress={() => router.push('/(parent)/messages')} />
          <QuickAction icon="person" label="My Profile" color="#7C3AED"
            onPress={() => router.push('/(parent)/profile')} />
        </View>

        {/* Hire banner */}
        <View style={layoutStyles.hireBanner}>
          <View style={layoutStyles.hireBannerLeft}>
            <Text style={layoutStyles.hireBannerTitle}>Need help at home?</Text>
            <Text style={layoutStyles.hireBannerSub}>Post a job and find trusted helpers today.</Text>
          </View>
          <TouchableOpacity
            style={[layoutStyles.hireBannerBtn, { backgroundColor: c.parent }]}
            onPress={() => router.push('/(parent)/jobs')}
          >
            <Text style={layoutStyles.hireBannerBtnText}>Post Job</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
      <ParentTabBar />
      {renderModals()}
    </SafeAreaView>
  );
}
