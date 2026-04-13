// app/(helper)/home.tsx
// Helper Home Screen - Modularized & Clean
// Main orchestration file - delegates to components and hooks

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';

// Styles
import { styles } from './home.styles';
import { theme } from '@/constants/theme';

// Custom Hooks
import { useHelperStats } from '@/hooks/helper';
import { useAuth, useResponsive } from '@/hooks/shared';

// Components
import { NotificationModal, ConfirmationModal } from '@/components/shared'; // <-- Added ConfirmationModal
import { 
  Sidebar, 
  MobileHeader, 
  GreetingCard, 
  StatCard, 
  MobileStatCard, 
  QuickAction, 
  SectionHeader,
  MobileMenu,
  RecommendationsSection
} from '@/components/helper/home';

export default function HelperHome() {
  const router = useRouter();
  const navigation = useNavigation();

  // Custom hooks for logic
  const { 
    userData, 
    loading: authLoading, 
    handleLogout, getFullName } = useAuth();
  const { stats, loading: statsLoading, refresh } = useHelperStats();
  const { isDesktop, isMobile } = useResponsive();

  // UI States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // NEW: Split into two separate states
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

  // STEP 1: Trigger the "Are you sure?" modal
  const initiateLogout = () => {
    setIsMobileMenuOpen(false); 
    setConfirmLogoutVisible(true); 
  };

  // STEP 2: If they click "Yes", hide confirm modal and show success modal
  const executeLogout = () => {
    setConfirmLogoutVisible(false);
    setSuccessLogoutVisible(true);
  };

  const loading = authLoading || statsLoading;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.color.helper} />
      </View>
    );
  }

  // --- REUSABLE MODALS TO INJECT AT THE BOTTOM OF BOTH LAYOUTS ---
  const renderModals = () => (
    <>
      <ConfirmationModal
        visible={confirmLogoutVisible}
        title="Log Out"
        message="Are you sure you want to log out of your account?"
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
        autoClose={true}
        duration={1500} 
        onClose={() => {
          setSuccessLogoutVisible(false);
          handleLogout(); // The actual logout happens after success modal closes!
        }}
      />
    </>
  );

  // Render desktop layout
  if (isDesktop) {
    return (
      <View style={[styles.container, {flexDirection: 'row'}]}>
        <Sidebar onLogout={initiateLogout} />
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
        >
          <GreetingCard userName={getFullName()} />
          <View style={styles.statsGrid}>
            <StatCard
              icon="briefcase"
              iconColor={theme.color.helper}
              iconBg={theme.color.helperSoft}
              title="Applications"
              value={stats.applications}
              onPress={() => router.push('/(helper)/my_applications')}
            />
            <StatCard
              icon="bookmark"
              iconColor={theme.color.info}
              iconBg={theme.color.infoSoft}
              title="Saved Jobs"
              value={stats.saved_jobs}
              onPress={() => router.push('/(helper)/saved_jobs')}
            />
            <StatCard
              icon="eye"
              iconColor={theme.color.success}
              iconBg={theme.color.successSoft}
              title="Profile Views"
              value={stats.profile_views}
            />
          </View>

          <SectionHeader title="Quick Actions" />
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon="search"
              label="Find Jobs"
              color={theme.color.info}
              onPress={() => router.push('/(helper)/browse_jobs')}
            />
            <QuickAction
              icon="person"
              label="My Profile"
              color={theme.color.helper}
              onPress={() => router.push('/(helper)/profile')}
            />
            <QuickAction
              icon="chatbubbles"
              label="Messages"
              color={theme.color.success}
              onPress={() => router.push('/(helper)/messages')}
            />
            <QuickAction
              icon="document"
              label="Documents"
              color={theme.color.peso}
              onPress={() => router.push('/(helper)/profile')}
            />
          </View>
          
          <RecommendationsSection />
        </ScrollView>
        {renderModals()}
      </View>
    );
  }

  // Render mobile layout
  return (
    <SafeAreaView style={styles.container}>
      <MobileHeader
        onMenuPress={() => setIsMobileMenuOpen(true)}
        accentColor={theme.color.helper}
        subtitle="Helper Portal"
        onNotificationPress={() => router.push('/(helper)/notifications')}
      />
      <ScrollView
        contentContainerStyle={styles.mobileScrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      >
        <GreetingCard userName={getFullName()} />

        <View style={styles.mobileStatsRow}>
          <MobileStatCard
            icon="briefcase"
            color={theme.color.helper}
            value={stats.applications}
            label="Applications"
            onPress={() => router.push('/(helper)/my_applications')}
          />
          <MobileStatCard
            icon="bookmark"
            color={theme.color.info}
            value={stats.saved_jobs}
            label="Saved"
            onPress={() => router.push('/(helper)/saved_jobs')}
          />
          <MobileStatCard icon="eye" color={theme.color.success} value={stats.profile_views} label="Views" />
        </View>

        <SectionHeader title="Quick Actions" />
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="search"
            label="Find Jobs"
            color={theme.color.info}
            onPress={() => router.push('/(helper)/browse_jobs')}
          />
          <QuickAction
            icon="person"
            label="My Profile"
            color={theme.color.helper}
            onPress={() => router.push('/(helper)/profile')}
          />
          <QuickAction
            icon="chatbubbles"
            label="Messages"
            color={theme.color.success}
            onPress={() => router.push('/(helper)/messages')}
          />
          <QuickAction
            icon="document"
            label="Documents"
            color={theme.color.peso}
            onPress={() => router.push('/(helper)/profile')}
          />
        </View>
      </ScrollView>
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} stats={stats} handleLogout={initiateLogout} />
      {renderModals()}
    </SafeAreaView>
  );
}
