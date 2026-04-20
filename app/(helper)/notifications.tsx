// app/(helper)/notifications.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity,
  FlatList, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useNotifications } from '@/hooks/shared';
import { useResponsive } from '@/hooks/shared';
import { Sidebar } from '@/components/helper/home';
import { WorkModeTabBar } from '@/components/helper/work';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useAuth } from '@/hooks/shared';
import type { Notification } from '@/hooks/shared';

import { styles as s } from './notifications.styles';

const TYPE_CONFIG: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  application_received: { icon: 'person-add-outline',      color: theme.color.parent,  bg: theme.color.parentSoft },
  status_changed:       { icon: 'refresh-circle-outline',  color: theme.color.info,    bg: theme.color.infoSoft },
  account_verified:     { icon: 'shield-checkmark',        color: theme.color.success, bg: theme.color.successSoft },
  account_rejected:     { icon: 'close-circle-outline',    color: theme.color.danger,  bg: theme.color.dangerSoft },
  document_verified:    { icon: 'document-text',           color: theme.color.success, bg: theme.color.successSoft },
  document_rejected:    { icon: 'document-text-outline',   color: theme.color.danger,  bg: theme.color.dangerSoft },
  job_verified:         { icon: 'briefcase',               color: theme.color.helper,  bg: theme.color.helperSoft },
  job_rejected:         { icon: 'briefcase-outline',       color: theme.color.danger,  bg: theme.color.dangerSoft },
  job_invite:           { icon: 'mail-open-outline',       color: theme.color.parent,  bg: theme.color.parentSoft },
  new_message:          { icon: 'chatbubble-outline',      color: theme.color.info,    bg: theme.color.infoSoft },
  profile_update:       { icon: 'person-circle-outline',   color: theme.color.helper,  bg: theme.color.helperSoft },
  interview_scheduled:  { icon: 'calendar-outline',        color: '#7C3AED',           bg: '#F3E8FF' },
  interview_confirmed:  { icon: 'checkmark-circle-outline',color: theme.color.success, bg: theme.color.successSoft },
  interview_declined:   { icon: 'close-circle-outline',    color: theme.color.danger,  bg: theme.color.dangerSoft },
  interview_request:    { icon: 'calendar-outline',        color: theme.color.parent,  bg: theme.color.parentSoft },
  peso_queue_user:      { icon: 'people-outline',          color: theme.color.peso,    bg: theme.color.pesoSoft },
  peso_queue_job:       { icon: 'briefcase-outline',       color: theme.color.peso,    bg: theme.color.pesoSoft },
  message_received:     { icon: 'chatbubble-outline',      color: theme.color.info,    bg: theme.color.infoSoft },
  task_completed:       { icon: 'checkmark-done-outline',  color: theme.color.success, bg: theme.color.successSoft },
  attendance_checkin:   { icon: 'log-in-outline',            color: theme.color.success, bg: theme.color.successSoft },
  leave_request_submitted: { icon: 'umbrella-outline',      color: theme.color.warning, bg: theme.color.warningSoft },
  leave_request_responded: { icon: 'checkmark-circle-outline', color: theme.color.info, bg: theme.color.infoSoft },
  contract_terminated: { icon: 'document-text-outline', color: theme.color.danger, bg: theme.color.danger + '22' },
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function NotifItem({ item, onPress }: { item: Notification; onPress: () => void }) {
  const cfg = TYPE_CONFIG[item.type] ?? { icon: 'notifications-outline' as const, color: theme.color.muted, bg: theme.color.surface };
  return (
    <TouchableOpacity
      style={[s.item, !item.is_read && s.itemUnread]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={s.itemBody}>
        <View style={s.itemTopRow}>
          <Text style={[s.itemTitle, !item.is_read && s.itemTitleUnread]} numberOfLines={1}>{item.title}</Text>
          <Text style={s.itemTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={s.itemMsg} numberOfLines={2}>{item.message}</Text>
      </View>
      {!item.is_read && <View style={[s.unreadDot, { backgroundColor: theme.color.helper }]} />}
    </TouchableOpacity>
  );
}

function NotifContent({ accent, listBottomExtra = 0 }: { accent: string; listBottomExtra?: number }) {
  const { notifications, unreadCount, loading, refresh, markAllRead, markOneRead } = useNotifications('helper');

  return (
    <View style={s.panel}>
      {/* Panel header */}
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
          <View style={[s.emptyCircle, { backgroundColor: theme.color.helperSoft }]}>
            <Ionicons name="notifications-off-outline" size={36} color={accent} />
          </View>
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptyBody}>Application updates and account notifications will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.notification_id)}
          renderItem={({ item }) => (
            <NotifItem
              item={item}
              onPress={() => { if (!item.is_read) markOneRead(item.notification_id); }}
            />
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={accent} />}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          contentContainerStyle={[
            s.listContent,
            listBottomExtra > 0 ? { paddingBottom: 20 + listBottomExtra } : null,
          ]}
        />
      )}
    </View>
  );
}

export default function HelperNotificationsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { isWorkMode } = useHelperWorkMode();

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
            <Text style={s.desktopPageSub}>Helper Portal</Text>
          </View>
          <NotifContent accent={theme.color.helper} />
        </ScrollView>
        {renderModals()}
      </View>
    );
  }

  // ── MOBILE ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.mobileRoot, { backgroundColor: theme.color.canvasHelper }]} edges={['top']}>
      <View style={s.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.color.helper} />
        </TouchableOpacity>
        <Text style={s.mobileHeaderTitle}>Notifications</Text>
        <View style={{ width: 42 }} />
      </View>
      <View style={s.mobileBody}>
        <NotifContent
          accent={theme.color.helper}
          listBottomExtra={isWorkMode ? 72 : 0}
        />
      </View>
      {isWorkMode ? <WorkModeTabBar /> : null}
    </SafeAreaView>
  );
}
