// app/(parent)/notifications.tsx
import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity,
  FlatList, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColor } from '@/constants/theme';
import { useNotifications, useResponsive, useAuth } from '@/hooks/shared';
import { useParentTheme } from '@/contexts/ParentThemeContext';
import { Sidebar, ParentTabBar } from '@/components/parent/home';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import type { Notification } from '@/hooks/shared';
import { getParentNotificationRoute } from '@/utils/notification-routes';

import { createParentNotificationsStyles } from './notifications.styles';

type IconCfg = { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string };

function notificationIconPalette(c: ThemeColor): Record<string, IconCfg> {
  return {
    application_received: { icon: 'person-add-outline', color: c.helper, bg: c.helperSoft },
    status_changed: { icon: 'refresh-circle-outline', color: c.info, bg: c.infoSoft },
    account_verified: { icon: 'shield-checkmark', color: c.success, bg: c.successSoft },
    account_rejected: { icon: 'close-circle-outline', color: c.danger, bg: c.dangerSoft },
    document_verified: { icon: 'document-text', color: c.success, bg: c.successSoft },
    document_rejected: { icon: 'document-text-outline', color: c.danger, bg: c.dangerSoft },
    job_verified: { icon: 'briefcase', color: c.parent, bg: c.parentSoft },
    job_rejected: { icon: 'briefcase-outline', color: c.danger, bg: c.dangerSoft },
    new_message: { icon: 'chatbubble-outline', color: c.info, bg: c.infoSoft },
    profile_update: { icon: 'person-circle-outline', color: c.parent, bg: c.parentSoft },
    interview_scheduled: { icon: 'calendar-outline', color: '#7C3AED', bg: '#F3E8FF' },
    interview_confirmed: { icon: 'checkmark-circle-outline', color: c.success, bg: c.successSoft },
    interview_declined: { icon: 'close-circle-outline', color: c.danger, bg: c.dangerSoft },
    interview_request: { icon: 'calendar-outline', color: c.helper, bg: c.helperSoft },
    peso_queue_user: { icon: 'people-outline', color: c.peso, bg: c.pesoSoft },
    peso_queue_job: { icon: 'briefcase-outline', color: c.peso, bg: c.pesoSoft },
    message_received: { icon: 'chatbubble-outline', color: c.info, bg: c.infoSoft },
    task_completed: { icon: 'checkmark-done-outline', color: c.success, bg: c.successSoft },
    attendance_checkin: { icon: 'log-in-outline', color: c.success, bg: c.successSoft },
    leave_request_submitted: { icon: 'umbrella-outline', color: c.warning, bg: c.warningSoft },
    leave_request_responded: { icon: 'checkmark-circle-outline', color: c.info, bg: c.infoSoft },
    contract_terminated: { icon: 'document-text-outline', color: c.danger, bg: `${c.danger}22` },
  };
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function NotifItem({
  item,
  accent,
  palette,
  styles: st,
  onPress,
}: {
  item: Notification;
  accent: string;
  palette: Record<string, IconCfg>;
  styles: ReturnType<typeof createParentNotificationsStyles>;
  onPress: () => void;
}) {
  const cfg =
    palette[item.type] ?? { icon: 'notifications-outline' as const, color: accent, bg: accent + '22' };
  return (
    <TouchableOpacity
      style={[st.item, !item.is_read && st.itemUnread]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[st.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={st.itemBody}>
        <View style={st.itemTopRow}>
          <Text style={[st.itemTitle, !item.is_read && st.itemTitleUnread]} numberOfLines={1}>{item.title}</Text>
          <Text style={st.itemTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={st.itemMsg} numberOfLines={2}>{item.message}</Text>
      </View>
      {!item.is_read && <View style={[st.unreadDot, { backgroundColor: accent }]} />}
    </TouchableOpacity>
  );
}

function NotifContent({
  accent,
  parentSoft,
  styles: st,
  palette,
}: {
  accent: string;
  parentSoft: string;
  styles: ReturnType<typeof createParentNotificationsStyles>;
  palette: Record<string, IconCfg>;
}) {
  const router = useRouter();
  const { notifications, unreadCount, loading, refresh, markAllRead, markOneRead } = useNotifications('parent');

  const handleNotificationPress = (item: Notification) => {
    if (!item.is_read) markOneRead(item.notification_id);
    const route = getParentNotificationRoute(item);
    if (route) {
      router.push(route as any);
    }
  };

  return (
    <View style={st.panel}>
      <View style={st.panelHeader}>
        <View style={st.panelHeaderLeft}>
          <Text style={st.panelTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[st.headerBadge, { backgroundColor: accent }]}>
              <Text style={st.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} hitSlop={8}>
            <Text style={[st.markAllText, { color: accent }]}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={st.empty}>
          <View style={[st.emptyCircle, { backgroundColor: parentSoft }]}>
            <Ionicons name="notifications-off-outline" size={36} color={accent} />
          </View>
          <Text style={st.emptyTitle}>All caught up!</Text>
          <Text style={st.emptyBody}>New applications, job verification results, and updates will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.notification_id)}
          renderItem={({ item }) => (
            <NotifItem
              item={item}
              accent={accent}
              styles={st}
              palette={palette}
              onPress={() => handleNotificationPress(item)}
            />
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={accent} />}
          ItemSeparatorComponent={() => <View style={st.sep} />}
          contentContainerStyle={st.listContent}
        />
      )}
    </View>
  );
}

export default function ParentNotificationsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { color: c } = useParentTheme();
  const s = useMemo(() => createParentNotificationsStyles(c), [c]);
  const palette = useMemo(() => notificationIconPalette(c), [c]);

  const [confirmLogout, setConfirmLogout] = React.useState(false);
  const [successLogout, setSuccessLogout] = React.useState(false);

  const renderModals = () => (
    <>
      <ConfirmationModal
        visible={confirmLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => { setConfirmLogout(false); setSuccessLogout(true); }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout}
        message="Logged Out Successfully!"
        type="success"
        autoClose
        duration={1500}
        onClose={() => { setSuccessLogout(false); handleLogout(); }}
      />
    </>
  );

  // ── DESKTOP ──────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={s.desktopRoot}>
        <Sidebar onLogout={() => setConfirmLogout(true)} />
        <ScrollView style={s.desktopMain} contentContainerStyle={s.desktopScroll}>
          <View style={s.desktopTopBar}>
            <Text style={s.desktopPageTitle}>Notifications</Text>
            <Text style={s.desktopPageSub}>Parent Portal</Text>
          </View>
          <NotifContent accent={c.parent} parentSoft={c.parentSoft} styles={s} palette={palette} />
        </ScrollView>
        {renderModals()}
      </View>
    );
  }

  // ── MOBILE ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.mobileRoot} edges={['top']}>
      <View style={s.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.parent} />
        </TouchableOpacity>
        <Text style={s.mobileHeaderTitle}>Notifications</Text>
        <View style={{ width: 42 }} />
      </View>
      <View style={s.mobileBody}>
        <NotifContent accent={c.parent} parentSoft={c.parentSoft} styles={s} palette={palette} />
      </View>
      <ParentTabBar />
    </SafeAreaView>
  );
}
