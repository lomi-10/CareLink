// app/(helper)/notifications.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/hooks/shared';
import { useResponsive } from '@/hooks/shared';
import { Sidebar, HelperTabBar } from '@/components/helper/home';
import { WorkModeTabBar } from '@/components/helper/work';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useAuth } from '@/hooks/shared';
import type { Notification } from '@/hooks/shared';
import { getHelperNotificationRoute } from '@/utils/notification-routes';
import {
  MUTED, ORANGE, GREEN, BLUE, ICON_BG, PAGE_BG, SURFACE,
  SUCCESS_BG, WARNING_BG, DANGER, DANGER_BG, INFO, INFO_BG,
} from '@/components/helper/home/helperWarmTheme';

import { createHelperNotificationsStyles } from './notifications.styles';

const WARNING = '#D97706';

function buildNotificationTypeConfig() {
  const config: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
    application_received: { icon: 'person-add-outline', color: BLUE, bg: INFO_BG },
    status_changed: { icon: 'refresh-circle-outline', color: INFO, bg: INFO_BG },
    account_verified: { icon: 'shield-checkmark', color: GREEN, bg: SUCCESS_BG },
    account_rejected: { icon: 'close-circle-outline', color: DANGER, bg: DANGER_BG },
    document_verified: { icon: 'document-text', color: GREEN, bg: SUCCESS_BG },
    document_rejected: { icon: 'document-text-outline', color: DANGER, bg: DANGER_BG },
    job_verified: { icon: 'briefcase', color: ORANGE, bg: ICON_BG },
    job_rejected: { icon: 'briefcase-outline', color: DANGER, bg: DANGER_BG },
    job_invite: { icon: 'mail-open-outline', color: BLUE, bg: INFO_BG },
    new_message: { icon: 'chatbubble-outline', color: INFO, bg: INFO_BG },
    profile_update: { icon: 'person-circle-outline', color: ORANGE, bg: ICON_BG },
    interview_scheduled: { icon: 'calendar-outline', color: BLUE, bg: INFO_BG },
    interview_confirmed: { icon: 'checkmark-circle-outline', color: GREEN, bg: SUCCESS_BG },
    interview_declined: { icon: 'close-circle-outline', color: DANGER, bg: DANGER_BG },
    interview_request: { icon: 'calendar-outline', color: BLUE, bg: INFO_BG },
    peso_queue_user: { icon: 'people-outline', color: ORANGE, bg: ICON_BG },
    peso_queue_job: { icon: 'briefcase-outline', color: ORANGE, bg: ICON_BG },
    message_received: { icon: 'chatbubble-outline', color: INFO, bg: INFO_BG },
    task_completed: { icon: 'checkmark-done-outline', color: GREEN, bg: SUCCESS_BG },
    attendance_checkin: { icon: 'log-in-outline', color: GREEN, bg: SUCCESS_BG },
    leave_request_submitted: { icon: 'umbrella-outline', color: WARNING, bg: WARNING_BG },
    leave_request_responded: { icon: 'checkmark-circle-outline', color: INFO, bg: INFO_BG },
    contract_terminated: { icon: 'document-text-outline', color: DANGER, bg: DANGER_BG },
  };
  return config;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

type NotifStyles = ReturnType<typeof createHelperNotificationsStyles>;

function NotifItem({
  item,
  onPress,
  s,
  typeCfg,
  accent,
}: {
  item: Notification;
  onPress: () => void;
  s: NotifStyles;
  typeCfg: ReturnType<typeof buildNotificationTypeConfig>;
  accent: string;
}) {
  const cfg = typeCfg[item.type] ?? { icon: 'notifications-outline' as const, color: MUTED, bg: SURFACE };
  return (
    <TouchableOpacity style={[s.item, !item.is_read && s.itemUnread]} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={s.itemBody}>
        <View style={s.itemTopRow}>
          <Text style={[s.itemTitle, !item.is_read && s.itemTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={s.itemTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={s.itemMsg} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
      {!item.is_read && <View style={[s.unreadDot, { backgroundColor: accent }]} />}
    </TouchableOpacity>
  );
}

function NotifContent({
  accent,
  listBottomExtra = 0,
  s,
  typeCfg,
}: {
  accent: string;
  listBottomExtra?: number;
  s: NotifStyles;
  typeCfg: ReturnType<typeof buildNotificationTypeConfig>;
}) {
  const router = useRouter();
  const { notifications, unreadCount, loading, refresh, markAllRead, markOneRead } = useNotifications('helper');

  const handleNotificationPress = (item: Notification) => {
    if (!item.is_read) markOneRead(item.notification_id);
    const route = getHelperNotificationRoute(item);
    if (route) {
      router.push(route as any);
    }
  };

  return (
    <View style={s.panel}>
      <View style={s.panelHeader}>
        <View style={s.panelHeaderLeft}>
          <Text style={s.panelTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[s.headerBadge, { backgroundColor: accent }]}>
              <Text style={s.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} hitSlop={8}>
            <Text style={[s.markAllText, { color: accent }]}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.empty}>
          <View style={[s.emptyCircle, { backgroundColor: ICON_BG }]}>
            <Ionicons name="notifications-off-outline" size={36} color={accent} />
          </View>
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptyBody}>Application updates and account notifications will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.notification_id)}
          renderItem={({ item }) => (
            <NotifItem
              item={item}
              s={s}
              typeCfg={typeCfg}
              accent={accent}
              onPress={() => handleNotificationPress(item)}
            />
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={accent} />}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          contentContainerStyle={[s.listContent, listBottomExtra > 0 ? { paddingBottom: 20 + listBottomExtra } : null]}
        />
      )}
    </View>
  );
}

export default function HelperNotificationsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { isWorkMode, activeHire } = useHelperWorkMode();
  const accent = ORANGE;

  const s = useMemo(() => createHelperNotificationsStyles(), []);
  const typeCfg = useMemo(() => buildNotificationTypeConfig(), []);

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
        onConfirm={() => {
          setConfirmLogout(false);
          setSuccessLogout(true);
        }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout}
        message="Logged Out Successfully!"
        type="success"
        autoClose
        duration={1500}
        onClose={() => {
          setSuccessLogout(false);
          handleLogout();
        }}
      />
    </>
  );

  if (isDesktop) {
    return (
      <View style={s.desktopRoot}>
        <Sidebar onLogout={() => setConfirmLogout(true)} />
        <ScrollView style={s.desktopMain} contentContainerStyle={s.desktopScroll}>
          <View style={s.desktopTopBar}>
            <Text style={s.desktopPageTitle}>Notifications</Text>
            <Text style={s.desktopPageSub}>Stay on top of applications and interviews</Text>
          </View>
          <NotifContent accent={accent} s={s} typeCfg={typeCfg} />
        </ScrollView>
        {renderModals()}
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.mobileRoot, { backgroundColor: PAGE_BG }]} edges={['top']}>
      <View style={s.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={accent} />
        </TouchableOpacity>
        <Text style={s.mobileHeaderTitle}>Notifications</Text>
        <View style={{ width: 42 }} />
      </View>
      <View style={s.mobileBody}>
        <NotifContent accent={accent} s={s} typeCfg={typeCfg} listBottomExtra={72} />
      </View>
      {isWorkMode && activeHire ? <WorkModeTabBar /> : <HelperTabBar />}
      {renderModals()}
    </SafeAreaView>
  );
}
