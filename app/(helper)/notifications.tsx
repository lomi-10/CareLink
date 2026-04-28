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
import type { ThemeColor } from '@/constants/theme';
import { useNotifications } from '@/hooks/shared';
import { useResponsive } from '@/hooks/shared';
import { Sidebar, HelperTabBar } from '@/components/helper/home';
import { WorkModeTabBar } from '@/components/helper/work';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useAuth } from '@/hooks/shared';
import type { Notification } from '@/hooks/shared';

import { createHelperNotificationsStyles } from './notifications.styles';

function buildNotificationTypeConfig(c: ThemeColor) {
  const config: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
    application_received: { icon: 'person-add-outline', color: c.parent, bg: c.parentSoft },
    status_changed: { icon: 'refresh-circle-outline', color: c.info, bg: c.infoSoft },
    account_verified: { icon: 'shield-checkmark', color: c.success, bg: c.successSoft },
    account_rejected: { icon: 'close-circle-outline', color: c.danger, bg: c.dangerSoft },
    document_verified: { icon: 'document-text', color: c.success, bg: c.successSoft },
    document_rejected: { icon: 'document-text-outline', color: c.danger, bg: c.dangerSoft },
    job_verified: { icon: 'briefcase', color: c.helper, bg: c.helperSoft },
    job_rejected: { icon: 'briefcase-outline', color: c.danger, bg: c.dangerSoft },
    job_invite: { icon: 'mail-open-outline', color: c.parent, bg: c.parentSoft },
    new_message: { icon: 'chatbubble-outline', color: c.info, bg: c.infoSoft },
    profile_update: { icon: 'person-circle-outline', color: c.helper, bg: c.helperSoft },
    interview_scheduled: { icon: 'calendar-outline', color: c.parent, bg: c.parentSoft },
    interview_confirmed: { icon: 'checkmark-circle-outline', color: c.success, bg: c.successSoft },
    interview_declined: { icon: 'close-circle-outline', color: c.danger, bg: c.dangerSoft },
    interview_request: { icon: 'calendar-outline', color: c.parent, bg: c.parentSoft },
    peso_queue_user: { icon: 'people-outline', color: c.peso, bg: c.pesoSoft },
    peso_queue_job: { icon: 'briefcase-outline', color: c.peso, bg: c.pesoSoft },
    message_received: { icon: 'chatbubble-outline', color: c.info, bg: c.infoSoft },
    task_completed: { icon: 'checkmark-done-outline', color: c.success, bg: c.successSoft },
    attendance_checkin: { icon: 'log-in-outline', color: c.success, bg: c.successSoft },
    leave_request_submitted: { icon: 'umbrella-outline', color: c.warning, bg: c.warningSoft },
    leave_request_responded: { icon: 'checkmark-circle-outline', color: c.info, bg: c.infoSoft },
    contract_terminated: { icon: 'document-text-outline', color: c.danger, bg: c.danger + '22' },
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
  c,
}: {
  item: Notification;
  onPress: () => void;
  s: NotifStyles;
  typeCfg: ReturnType<typeof buildNotificationTypeConfig>;
  accent: string;
  c: ThemeColor;
}) {
  const cfg = typeCfg[item.type] ?? { icon: 'notifications-outline' as const, color: c.muted, bg: c.surface };
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
  c,
  typeCfg,
}: {
  accent: string;
  listBottomExtra?: number;
  s: NotifStyles;
  c: ThemeColor;
  typeCfg: ReturnType<typeof buildNotificationTypeConfig>;
}) {
  const { notifications, unreadCount, loading, refresh, markAllRead, markOneRead } = useNotifications('helper');

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
          <View style={[s.emptyCircle, { backgroundColor: c.helperSoft }]}>
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
              c={c}
              typeCfg={typeCfg}
              accent={accent}
              onPress={() => {
                if (!item.is_read) markOneRead(item.notification_id);
              }}
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
  const { color: c } = useHelperTheme();
  const accent = c.helper;

  const s = useMemo(() => createHelperNotificationsStyles(c), [c]);
  const typeCfg = useMemo(() => buildNotificationTypeConfig(c), [c]);

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
          <NotifContent accent={accent} s={s} c={c} typeCfg={typeCfg} />
        </ScrollView>
        {renderModals()}
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.mobileRoot, { backgroundColor: c.canvasHelper }]} edges={['top']}>
      <View style={s.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={accent} />
        </TouchableOpacity>
        <Text style={s.mobileHeaderTitle}>Notifications</Text>
        <View style={{ width: 42 }} />
      </View>
      <View style={s.mobileBody}>
        <NotifContent accent={accent} s={s} c={c} typeCfg={typeCfg} listBottomExtra={72} />
      </View>
      {isWorkMode && activeHire ? <WorkModeTabBar /> : <HelperTabBar />}
      {renderModals()}
    </SafeAreaView>
  );
}
