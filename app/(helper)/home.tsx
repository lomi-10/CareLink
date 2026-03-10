// app/(helper)/home.tsx
// Helper Home Screen - Modularized & Clean
// Main orchestration file - delegates to components and hooks

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

// Custom Hooks
import { useAuth } from '@/hooks/useAuth';
import { useHelperStats } from '@/hooks/useHelperStats';
import { useResponsive } from '@/hooks/useResponsive';

// Components
import { 
  Sidebar, 
  MobileHeader, 
  GreetingCard, 
  StatCard, 
  MobileStatCard, 
  QuickAction, 
  SectionHeader 
} from '@/components/helper/home';

export default function HelperHome() {
  const router = useRouter();
  const navigation = useNavigation();

  // Custom hooks for logic
  const { userData, loading: authLoading, handleLogout, getFullName } = useAuth();
  const { stats, loading: statsLoading, refresh } = useHelperStats();
  const { isDesktop, isMobile } = useResponsive();

  // Combined loading state
  const loading = authLoading || statsLoading;

  // Show loading spinner
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
      </View>
    );
  }

  // Render desktop layout
  if (isDesktop) {
    return (
      <View style={styles.container}>
        <Sidebar onLogout={handleLogout} />
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
        >
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="briefcase"
              iconColor="#FF9500"
              iconBg="#FFF4E5"
              title="Applications"
              value={stats.applications}
              onPress={() => router.push('/(helper)/applications')}
            />
            <StatCard
              icon="bookmark"
              iconColor="#007AFF"
              iconBg="#E3F2FD"
              title="Saved Jobs"
              value={stats.saved_jobs}
              onPress={() => router.push('/(helper)/jobs')}
            />
            <StatCard
              icon="eye"
              iconColor="#34C759"
              iconBg="#E8F5E9"
              title="Profile Views"
              value={stats.profile_views}
            />
          </View>

          {/* Quick Actions */}
          <SectionHeader title="Quick Actions" />
          {/* Add more desktop content here */}
        </ScrollView>
      </View>
    );
  }

  // Render mobile layout
  return (
    <View style={styles.container}>
      <MobileHeader
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />
      <ScrollView
        contentContainerStyle={styles.mobileScrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      >
        <GreetingCard userName={getFullName()} />

        {/* Mobile Stats Row */}
        <View style={styles.mobileStatsRow}>
          <MobileStatCard
            icon="briefcase"
            color="#FF9500"
            value={stats.applications}
            label="Applications"
            onPress={() => router.push('/(helper)/applications')}
          />
          <MobileStatCard
            icon="bookmark"
            color="#007AFF"
            value={stats.saved_jobs}
            label="Saved"
            onPress={() => router.push('/(helper)/jobs')}
          />
          <MobileStatCard
            icon="eye"
            color="#34C759"
            value={stats.profile_views}
            label="Views"
          />
        </View>

        {/* Quick Actions Grid */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="search"
            label="Find Jobs"
            color="#007AFF"
            onPress={() => router.push('/(helper)/jobs')}
          />
          <QuickAction
            icon="person"
            label="My Profile"
            color="#FF9500"
            onPress={() => router.push('/(helper)/profile')}
          />
          <QuickAction
            icon="chatbubbles"
            label="Messages"
            color="#34C759"
            onPress={() => router.push('/(helper)/messages')}
          />
          <QuickAction
            icon="document"
            label="Documents"
            color="#9C27B0"
            onPress={() => router.push('/(helper)/profile')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 32,
    paddingBottom: 60,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  mobileScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mobileStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
});
