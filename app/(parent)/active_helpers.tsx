import React, { useCallback, useState } from 'react';
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

import { theme } from '@/constants/theme';
import { Sidebar, MobileMenu, ParentTabBar } from '@/components/parent/home';
import { MobileHeader } from '@/components/helper/home';
import { ActiveHelperCard } from '@/components/parent/home/ActiveHelperCard';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import { ConfirmationModal, NotificationModal } from '@/components/shared';

import { styles } from './active_helpers.styles';

export default function ActiveHelpersScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout, userData } = useAuth();
  const parentId = userData ? Number(userData.user_id) : 0;
  const { placements, loading, refresh } = useParentActivePlacements();
  const { unreadCount } = useNotifications('parent');

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

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
          tintColor={theme.color.parent}
        />
      }
    >
      <Text style={styles.lead}>
        Each card is one active placement. Use <Text style={styles.bold}>My Job Posts</Text> to add more roles
        and hire additional helpers (for example a cook and a yaya).
      </Text>

      {loading && placements.length === 0 ? (
        <ActivityIndicator color={theme.color.parent} style={{ marginTop: 40 }} />
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
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <MobileHeader
        onMenuPress={() => setMenuOpen(true)}
        accentColor={theme.color.parent}
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
      <ParentTabBar />
    </SafeAreaView>
  );
}
