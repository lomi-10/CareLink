// app/(helper)/home.tsx
import React, { useState } from 'react';
import {
  View, ScrollView, RefreshControl, ActivityIndicator,
  SafeAreaView, Text, TouchableOpacity,
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
import { WorkModeDashboard, WorkModeTabBar } from '@/components/helper/work';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';

export default function HelperHome() {
  const router = useRouter();

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

  const initiateLogout = () => { setIsMobileMenuOpen(false); setConfirmLogoutVisible(true); };
  const executeLogout  = () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); };

  const loading = authLoading || statsLoading || !workReady;

  const showWorkDash = isWorkMode && activeHire && userData;
  const helperIdNum = userData ? Number(userData.user_id) : 0;

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
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => {
                refresh();
                void refreshWork();
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
                color={unreadCount > 0 ? theme.color.helper : theme.color.muted}
              />
              {unreadCount > 0 && (
                <View style={[layoutStyles.notifBadge, { backgroundColor: theme.color.helper }]}>
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

              {employmentEnded?.employment_ended_on ? (
                <View
                  style={{
                    marginBottom: 16,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: theme.color.surfaceElevated,
                    borderWidth: 1,
                    borderColor: theme.color.line,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.color.ink, marginBottom: 4 }}>
                    Employment ended
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.color.muted, lineHeight: 20 }}>
                    Your placement
                    {employmentEnded.job_title ? ` (${employmentEnded.job_title})` : ''} with{' '}
                    {employmentEnded.employer_name || 'your employer'} ended on{' '}
                    {new Date(employmentEnded.employment_ended_on.replace(/-/g, '/')).toLocaleDateString(
                      undefined,
                      { month: 'short', day: 'numeric', year: 'numeric' },
                    )}
                    . You are back in job-hunting mode.
                  </Text>
                </View>
              ) : null}

              <SectionHeader title="Your Overview" />
              <View style={layoutStyles.statsGrid}>
                <StatCard icon="briefcase" iconColor={theme.color.helper} iconBg={theme.color.helperSoft}
                  title="Applications" value={stats.applications} onPress={() => router.push('/(helper)/my_applications')} />
                <StatCard icon="bookmark" iconColor={theme.color.info} iconBg={theme.color.infoSoft}
                  title="Saved Jobs" value={stats.saved_jobs} onPress={() => router.push('/(helper)/saved_jobs')} />
                <StatCard icon="eye" iconColor={theme.color.success} iconBg={theme.color.successSoft}
                  title="Profile Views" value={stats.profile_views} />
              </View>

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
        accentColor={theme.color.helper}
        subtitle={showWorkDash ? 'Work Mode' : 'Helper Portal'}
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(helper)/notifications')}
      />
      <ScrollView
        contentContainerStyle={[
          layoutStyles.mobileScrollContent,
          { paddingBottom: showWorkDash ? 88 : 60 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              refresh();
              void refreshWork();
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

            {employmentEnded?.employment_ended_on ? (
              <View
                style={{
                  marginBottom: 14,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: theme.color.surfaceElevated,
                  borderWidth: 1,
                  borderColor: theme.color.line,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.color.ink, marginBottom: 4 }}>
                  Employment ended
                </Text>
                <Text style={{ fontSize: 14, color: theme.color.muted, lineHeight: 20 }}>
                  Your placement
                  {employmentEnded.job_title ? ` (${employmentEnded.job_title})` : ''} with{' '}
                  {employmentEnded.employer_name || 'your employer'} ended on{' '}
                  {new Date(employmentEnded.employment_ended_on.replace(/-/g, '/')).toLocaleDateString(
                    undefined,
                    { month: 'short', day: 'numeric', year: 'numeric' },
                  )}
                  .
                </Text>
              </View>
            ) : null}

            <View style={layoutStyles.mobileStatsRow}>
              <MobileStatCard icon="briefcase" color={theme.color.helper} value={stats.applications}
                label="Applied" onPress={() => router.push('/(helper)/my_applications')} />
              <MobileStatCard icon="bookmark" color={theme.color.info} value={stats.saved_jobs}
                label="Saved" onPress={() => router.push('/(helper)/saved_jobs')} />
              <MobileStatCard icon="eye" color={theme.color.success} value={stats.profile_views} label="Views" />
            </View>

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

            <View style={layoutStyles.recruitBanner}>
              <View style={layoutStyles.recruitBannerLeft}>
                <Text style={layoutStyles.recruitBannerTitle}>Ready to get hired?</Text>
                <Text style={layoutStyles.recruitBannerSub}>All jobs are PESO-verified and safe.</Text>
              </View>
              <TouchableOpacity
                style={[layoutStyles.recruitBannerBtn, { backgroundColor: theme.color.helper }]}
                onPress={() => router.push('/(helper)/browse_jobs')}
              >
                <Text style={layoutStyles.recruitBannerBtnText}>Browse</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {showWorkDash ? <WorkModeTabBar /> : null}

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
    <TouchableOpacity style={layoutStyles.qaDesktop} onPress={onPress} activeOpacity={0.88}>
      <View style={[layoutStyles.qaDesktopIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={layoutStyles.qaDesktopTitle}>{title}</Text>
      <Text style={layoutStyles.qaDesktopDesc}>{desc}</Text>
    </TouchableOpacity>
  );
}

