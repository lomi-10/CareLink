// app/(parent)/notifications/index.tsx
// PHP: parent/get_notifications.php (via useNotifications hook), shared/mark_read.php
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  FlatList, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, useResponsive, useAuth } from '@/hooks/shared';
import { Sidebar, ParentTabBar } from '@/components/parent/home';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import type { Notification } from '@/hooks/shared';
import { getParentNotificationRoute } from '@/utils/notification-routes';
import { BROWN, ICON_BG } from '@/components/parent/home/parentWarmTheme';

import { ns } from './notifications.styles';

type IconCfg = { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string };

const NOTIF_PALETTE: Record<string, IconCfg> = {
  application_received:    { icon: 'person-add-outline',       color: '#059669', bg: '#ECFDF5' },
  status_changed:          { icon: 'refresh-circle-outline',   color: '#3B82F6', bg: '#DBEAFE' },
  account_verified:        { icon: 'shield-checkmark',         color: '#059669', bg: '#ECFDF5' },
  account_rejected:        { icon: 'close-circle-outline',     color: '#DC2626', bg: '#FEE2E2' },
  document_verified:       { icon: 'document-text',            color: '#059669', bg: '#ECFDF5' },
  document_rejected:       { icon: 'document-text-outline',    color: '#DC2626', bg: '#FEE2E2' },
  job_verified:            { icon: 'briefcase',                color: BROWN,     bg: ICON_BG   },
  job_rejected:            { icon: 'briefcase-outline',        color: '#DC2626', bg: '#FEE2E2' },
  new_message:             { icon: 'chatbubble-outline',       color: '#3B82F6', bg: '#DBEAFE' },
  profile_update:          { icon: 'person-circle-outline',   color: BROWN,     bg: ICON_BG   },
  interview_scheduled:     { icon: 'calendar-outline',         color: '#7C3AED', bg: '#F3E8FF' },
  interview_confirmed:     { icon: 'checkmark-circle-outline', color: '#059669', bg: '#ECFDF5' },
  interview_declined:      { icon: 'close-circle-outline',     color: '#DC2626', bg: '#FEE2E2' },
  interview_request:       { icon: 'calendar-outline',         color: '#059669', bg: '#ECFDF5' },
  peso_queue_user:         { icon: 'people-outline',           color: '#065F46', bg: '#D1FAE5' },
  peso_queue_job:          { icon: 'briefcase-outline',        color: '#065F46', bg: '#D1FAE5' },
  message_received:        { icon: 'chatbubble-outline',       color: '#3B82F6', bg: '#DBEAFE' },
  task_completed:          { icon: 'checkmark-done-outline',   color: '#059669', bg: '#ECFDF5' },
  attendance_checkin:      { icon: 'log-in-outline',           color: '#059669', bg: '#ECFDF5' },
  leave_request_submitted: { icon: 'umbrella-outline',         color: '#D97706', bg: '#FEF3C7' },
  leave_request_responded: { icon: 'checkmark-circle-outline', color: '#3B82F6', bg: '#DBEAFE' },
  contract_terminated:     { icon: 'document-text-outline',   color: '#DC2626', bg: '#FEE2E2' },
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function NotifItem({ item, onPress }: { item: Notification; onPress: () => void }) {
  const cfg = NOTIF_PALETTE[item.type] ?? { icon: 'notifications-outline' as const, color: BROWN, bg: ICON_BG };
  return (
    <TouchableOpacity
      style={[ns.item, !item.is_read && ns.itemUnread]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[ns.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={ns.itemBody}>
        <View style={ns.itemTopRow}>
          <Text style={[ns.itemTitle, !item.is_read && ns.itemTitleUnread]} numberOfLines={1}>{item.title}</Text>
          <Text style={ns.itemTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={ns.itemMsg} numberOfLines={2}>{item.message}</Text>
      </View>
      {!item.is_read && <View style={ns.unreadDot} />}
    </TouchableOpacity>
  );
}

function NotifContent() {
  const router = useRouter();
  const { notifications, unreadCount, loading, refresh, markAllRead, markOneRead } = useNotifications('parent');

  const handleNotificationPress = (item: Notification) => {
    if (!item.is_read) markOneRead(item.notification_id);
    const route = getParentNotificationRoute(item);
    if (route) router.push(route as any);
  };

  return (
    <View style={ns.panel}>
      <View style={ns.panelHeader}>
        <View style={ns.panelHeaderLeft}>
          <Text style={ns.panelTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={ns.headerBadge}>
              <Text style={ns.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} hitSlop={8}>
            <Text style={ns.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={ns.center}>
          <ActivityIndicator size="large" color={BROWN} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={ns.empty}>
          <View style={ns.emptyCircle}>
            <Ionicons name="notifications-off-outline" size={36} color={BROWN} />
          </View>
          <Text style={ns.emptyTitle}>All caught up!</Text>
          <Text style={ns.emptyBody}>New applications, job verification results, and updates will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.notification_id)}
          renderItem={({ item }) => (
            <NotifItem item={item} onPress={() => handleNotificationPress(item)} />
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={BROWN} />}
          ItemSeparatorComponent={() => <View style={ns.sep} />}
          contentContainerStyle={ns.listContent}
        />
      )}
    </View>
  );
}

export default function ParentNotificationsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const renderModals = () => (
    <>
      <ConfirmationModal
        visible={confirmLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out" cancelText="Cancel" type="danger"
        onConfirm={() => { setConfirmLogout(false); setSuccessLogout(true); }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout}
        message="Logged Out Successfully!"
        type="success" autoClose duration={1500}
        onClose={() => { setSuccessLogout(false); handleLogout(); }}
      />
    </>
  );

  if (isDesktop) {
    return (
      <View style={ns.desktopRoot}>
        <Sidebar onLogout={() => setConfirmLogout(true)} />
        <ScrollView style={ns.desktopMain} contentContainerStyle={ns.desktopScroll}>
          <View style={ns.desktopTopBar}>
            <Text style={ns.desktopPageTitle}>Notifications</Text>
            <Text style={ns.desktopPageSub}>Parent Portal</Text>
          </View>
          <NotifContent />
        </ScrollView>
        {renderModals()}
      </View>
    );
  }

  return (
    <SafeAreaView style={ns.mobileRoot} edges={['top']}>
      <View style={ns.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={ns.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={BROWN} />
        </TouchableOpacity>
        <Text style={ns.mobileHeaderTitle}>Notifications</Text>
        <View style={{ width: 42 }} />
      </View>
      <View style={ns.mobileBody}>
        <NotifContent />
      </View>
      <ParentTabBar />
    </SafeAreaView>
  );
}
