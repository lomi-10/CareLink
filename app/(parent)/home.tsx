// app/(parent)/home.tsx
// Parent Home Screen - Modularized & Clean

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Custom Hooks
import { useAuth } from '@/hooks/useAuth';
import { useParentStats } from '@/hooks/useParentStats';
import { useResponsive } from '@/hooks/useResponsive';

// Components
import { NotificationModal } from '@/components/common';
import { Sidebar, MobileMenu } from '@/components/parent/home';
import {
  MobileHeader,
  GreetingCard,
  StatCard,
  MobileStatCard,
  QuickAction,
  SectionHeader,
} from '@/components/helper/home'; // Reusing helper components!

export function ParentHome() {
  const router = useRouter();
  const navigation = useNavigation();

  const { handleLogout, getFullName } = useAuth();
  const { stats, loading: statsLoading, refresh } = useParentStats();
  const { isDesktop } = useResponsive();

  //Custom Menu with logout notif
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const initiateLogout = () => {
    setIsMobileMenuOpen(false);
    setLogoutModalVisible(true);
  }

  if (statsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // DESKTOP LAYOUT
  if (isDesktop) {
    return (
      <View style={[styles.container, { flexDirection: 'row' }]}>
        <Sidebar onLogout={initiateLogout} />
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
        >

          <View style={[styles.greetingCard, styles.blueGradient]}>
          <View style={styles.greetingContent}>
            <Text style={styles.greeting}>
              {new Date().getHours() < 12 ? 'Good Morning' : 
               new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
            </Text>
            <Text style={styles.userName}>{getFullName()}</Text>
            <Text style={styles.subtext}>Find the perfect helper for your family</Text>
          </View>
        </View>
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="briefcase"
              iconColor="#007AFF"
              iconBg="#E3F2FD"
              title="Posted Jobs"
              value={stats.posted_jobs}
              onPress={() => router.push('/(parent)/jobs')}
            />
            <StatCard
              icon="people"
              iconColor="#34C759"
              iconBg="#E8F5E9"
              title="Applications"
              value={stats.active_applications}
              onPress={() => router.push('/(parent)/applications')}
            />
            <StatCard
              icon="chatbubbles"
              iconColor="#FF9500"
              iconBg="#FFF4E5"
              title="Messages"
              value={stats.messages}
              onPress={() => router.push('/(parent)/messages')}
            />
            <StatCard
              icon="checkmark-circle"
              iconColor="#9C27B0"
              iconBg="#F3E5F5"
              title="Hired Helpers"
              value={stats.hired_helpers}
            />
          </View>

          {/* Quick Actions */}
          <SectionHeader title="Quick Actions" />
          <View style={styles.quickActionsDesktop}>
            <QuickActionDesktop
              icon="add-circle"
              title="Post a Job"
              description="Find the perfect helper"
              color="#007AFF"
              onPress={() => router.push('/(parent)/jobs')}
            />
            <QuickActionDesktop
              icon="search"
              title="Browse Helpers"
              description="View verified helpers"
              color="#34C759"
              onPress={() => router.push('/(parent)/browse_helpers')}
            />
            <QuickActionDesktop
              icon="chatbubble"
              title="Messages"
              description="Chat with applicants"
              color="#FF9500"
              onPress={() => router.push('/(parent)/messages')}
            />
          </View>
        </ScrollView>

        {/* LOGOUT NOTIFICATION MODAL */}
        <NotificationModal
          visible={logoutModalVisible}
          message="Logged Out Successfully!"
          type="success"
          autoClose={true}
          duration={1500} // It will show for 1.5 seconds, then auto-close
          onClose={() => {
            setLogoutModalVisible(false);
            handleLogout(); // ⬅️ The actual logout happens HERE, after the modal closes!
          }}
        />
      </View>
    );
  }

  // MOBILE LAYOUT
  return (
    <SafeAreaView style={styles.container}>
      <MobileHeader
        onMenuPress={() => setIsMobileMenuOpen(true)}
      />
      <ScrollView
        contentContainerStyle={styles.mobileScrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      >
        <View style={[styles.greetingCard, styles.blueGradient]}>
          <View style={styles.greetingContent}>
            <Text style={styles.greeting}>
              {new Date().getHours() < 12 ? 'Good Morning' : 
               new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
            </Text>
            <Text style={styles.userName}>{getFullName()}</Text>
            <Text style={styles.subtext}>Find the perfect helper for your family</Text>
          </View>
        </View>

        {/* Mobile Stats Row */}
        <View style={styles.mobileStatsRow}>
          <MobileStatCard
            icon="briefcase"
            color="#007AFF"
            value={stats.posted_jobs}
            label="Jobs"
            onPress={() => router.push('/(parent)/jobs')}
          />
          <MobileStatCard
            icon="people"
            color="#34C759"
            value={stats.active_applications}
            label="Applications"
            onPress={() => router.push('/(parent)/applications')}
          />
          <MobileStatCard
            icon="chatbubbles"
            color="#FF9500"
            value={stats.messages}
            label="Messages"
            onPress={() => router.push('/(parent)/messages')}
          />
        </View>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="add-circle"
            label="Post Job"
            color="#007AFF"
            onPress={() => router.push('/(parent)/jobs')}
          />
          <QuickAction
            icon="search"
            label="Find Helpers"
            color="#34C759"
            onPress={() => router.push('/(parent)/browse_helpers')}
          />
          <QuickAction
            icon="chatbubbles"
            label="Messages"
            color="#FF9500"
            onPress={() => router.push('/(parent)/messages')}
          />
          <QuickAction
            icon="person"
            label="My Profile"
            color="#9C27B0"
            onPress={() => router.push('/(parent)/profile')}
          />
        </View>
      </ScrollView>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        stats={stats}
        handleLogout={initiateLogout}
      />

      {/* LOGOUT NOTIFICATION MODAL */}
      <NotificationModal
        visible={logoutModalVisible}
        message="Logged Out Successfully!"
        type="success"
        autoClose={true}
        duration={1500} // It will show for 1.5 seconds, then auto-close
        onClose={() => {
          setLogoutModalVisible(false);
          handleLogout(); // ⬅️ The actual logout happens HERE, after the modal closes!
        }}
      />
    </SafeAreaView>
  );
}

// Desktop Quick Action (larger card)
function QuickActionDesktop({ icon, title, description, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.quickActionDesktopCard} onPress={onPress}>
      <View style={[styles.quickActionDesktopIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <Text style={styles.quickActionDesktopTitle}>{title}</Text>
      <Text style={styles.quickActionDesktopDesc}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  quickActionsDesktop: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  quickActionDesktopCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  quickActionDesktopIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  quickActionDesktopTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  quickActionDesktopDesc: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  mobileScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  greetingCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  blueGradient: {
    backgroundColor: '#007AFF',
  },
  greetingContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
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

export default ParentHome;
