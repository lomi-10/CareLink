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

// Custom Hooks
import { useAuth } from '@/hooks/useAuth';
import { useHelperStats } from '@/hooks/useHelperStats';
import { useResponsive } from '@/hooks/useResponsive';

// Components
import { NotificationModal, ConfirmationModal } from '@/components/common'; // <-- Added ConfirmationModal
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
        <ActivityIndicator size="large" color="#FF9500" />
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
            <StatCard icon="briefcase" iconColor="#FF9500" iconBg="#FFF4E5" title="Applications" value={stats.applications} onPress={() => router.push('/(helper)/my_applications')} />
            <StatCard icon="bookmark" iconColor="#007AFF" iconBg="#E3F2FD" title="Saved Jobs" value={stats.saved_jobs} onPress={() => router.push('/(helper)/saved_jobs')} />
            <StatCard icon="eye" iconColor="#34C759" iconBg="#E8F5E9" title="Profile Views" value={stats.profile_views} />
          </View>

          <SectionHeader title="Quick Actions" />
          <View style={styles.quickActionsGrid}>
            <QuickAction icon="search" label="Find Jobs" color="#007AFF" onPress={() => router.push('/(helper)/browse_jobs')} />
            <QuickAction icon="person" label="My Profile" color="#FF9500" onPress={() => router.push('/(helper)/profile')} />
            <QuickAction icon="chatbubbles" label="Messages" color="#34C759" onPress={() => router.push('/(helper)/messages')} />
            <QuickAction icon="document" label="Documents" color="#9C27B0" onPress={() => router.push('/(helper)/profile')} />
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
      <MobileHeader onMenuPress={() => setIsMobileMenuOpen(true)} />
      <ScrollView
        contentContainerStyle={styles.mobileScrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      >
        <GreetingCard userName={getFullName()} />

        <View style={styles.mobileStatsRow}>
          <MobileStatCard icon="briefcase" color="#FF9500" value={stats.applications} label="Applications" onPress={() => router.push('/(helper)/my_applications')} />
          <MobileStatCard icon="bookmark" color="#007AFF" value={stats.saved_jobs} label="Saved" onPress={() => router.push('/(helper)/saved_jobs')} />
          <MobileStatCard icon="eye" color="#34C759" value={stats.profile_views} label="Views" />
        </View>

        <SectionHeader title="Quick Actions" />
        <View style={styles.quickActionsGrid}>
          <QuickAction icon="search" label="Find Jobs" color="#007AFF" onPress={() => router.push('/(helper)/browse_jobs')} />
          <QuickAction icon="person" label="My Profile" color="#FF9500" onPress={() => router.push('/(helper)/profile')} />
          <QuickAction icon="chatbubbles" label="Messages" color="#34C759" onPress={() => router.push('/(helper)/messages')} />
          <QuickAction icon="document" label="Documents" color="#9C27B0" onPress={() => router.push('/(helper)/profile')} />
        </View>
      </ScrollView>
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} stats={stats} handleLogout={initiateLogout} />
      {renderModals()}
    </SafeAreaView>
  );
}
