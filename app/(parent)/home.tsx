// app/(parent)/home.tsx
// Parent Home Screen - Modularized & Clean

import React, { useState } from 'react';
import {
  View,
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

// Import your separated styles!
import { styles } from './home.styles';

// Custom Hooks
import { useAuth } from '@/hooks/useAuth';
import { useParentStats } from '@/hooks/useParentStats';
import { useResponsive } from '@/hooks/useResponsive';

// Components
import { NotificationModal, ConfirmationModal } from '@/components/common';
import { Sidebar, MobileMenu, GreetingCard } from '@/components/parent/home';
import {
  MobileHeader,
  StatCard,
  MobileStatCard,
  QuickAction,
  SectionHeader,
} from '@/components/helper/home'; // Reusing helper components!

export default function ParentHome() {
  const router = useRouter();
  const navigation = useNavigation();

  const { handleLogout, getFullName } = useAuth();
  const { stats, loading: statsLoading, refresh } = useParentStats();
  const { isDesktop } = useResponsive();

  //Custom Menu with logout notif
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

  if (statsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

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

          <GreetingCard userName={getFullName()} />
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
        {renderModals()}
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
        <GreetingCard userName={getFullName()} />

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

      {renderModals()}
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
