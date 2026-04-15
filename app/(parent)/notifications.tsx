// app/(parent)/notifications.tsx
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useNotifications } from '@/hooks/shared';
import type { Notification } from '@/hooks/shared';

const TYPE_CONFIG: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  application_received: { icon: 'person-add-outline',      color: theme.color.helper,  bg: theme.color.helperSoft },
  status_changed:       { icon: 'refresh-circle-outline',  color: theme.color.info,    bg: theme.color.infoSoft },
  account_verified:     { icon: 'shield-checkmark',        color: theme.color.success, bg: theme.color.successSoft },
  account_rejected:     { icon: 'close-circle-outline',    color: theme.color.danger,  bg: theme.color.dangerSoft },
  document_verified:    { icon: 'document-text',           color: theme.color.success, bg: theme.color.successSoft },
  document_rejected:    { icon: 'document-text-outline',   color: theme.color.danger,  bg: theme.color.dangerSoft },
  job_verified:         { icon: 'briefcase',               color: theme.color.parent,  bg: theme.color.parentSoft },
  job_rejected:         { icon: 'briefcase-outline',       color: theme.color.danger,  bg: theme.color.dangerSoft },
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function NotifItem({ item, accent, onPress }: { item: Notification; accent: string; onPress: () => void }) {
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
      {!item.is_read && <View style={[s.unreadDot, { backgroundColor: accent }]} />}
    </TouchableOpacity>
  );
}

export default function ParentNotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, loading, refresh, markAllRead, markOneRead } = useNotifications('parent');

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.color.parent} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[s.headerBadge, { backgroundColor: theme.color.parent }]}>
              <Text style={s.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={s.markAllBtn} hitSlop={8}>
            <Text style={[s.markAllText, { color: theme.color.parent }]}>Mark all read</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 90 }} />}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.color.parent} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.empty}>
          <View style={[s.emptyCircle, { backgroundColor: theme.color.parentSoft }]}>
            <Ionicons name="notifications-off-outline" size={40} color={theme.color.parent} />
          </View>
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptyBody}>New applications, job verification results, and updates will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.notification_id)}
          renderItem={({ item }) => (
            <NotifItem
              item={item}
              accent={theme.color.parent}
              onPress={() => { if (!item.is_read) markOneRead(item.notification_id); }}
            />
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.color.canvasParent },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, backgroundColor: theme.color.surfaceElevated, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  backBtn:{ padding: 8 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: theme.color.ink },
  headerBadge:  { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  markAllBtn:  { paddingHorizontal: 12, paddingVertical: 8 },
  markAllText: { fontSize: 13, fontWeight: '700' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  list: { paddingTop: 8, paddingBottom: 40 },
  sep:  { height: 1, backgroundColor: theme.color.line, marginLeft: 72 },

  item:      { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.color.surfaceElevated, gap: 12 },
  itemUnread:{ backgroundColor: theme.color.parentSoft + '55' },
  iconWrap:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  itemBody:  { flex: 1 },
  itemTopRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.color.inkMuted, paddingRight: 8 },
  itemTitleUnread: { color: theme.color.ink, fontWeight: '800' },
  itemTime:  { fontSize: 11, color: theme.color.subtle },
  itemMsg:   { fontSize: 13, color: theme.color.muted, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start' },

  empty:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle:  { fontSize: 20, fontWeight: '800', color: theme.color.ink, marginBottom: 10 },
  emptyBody:   { fontSize: 15, color: theme.color.muted, textAlign: 'center', lineHeight: 22 },
});
