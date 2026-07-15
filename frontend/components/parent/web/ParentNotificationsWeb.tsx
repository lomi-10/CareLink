// components/parent/web/ParentNotificationsWeb.tsx — desktop Notifications.
// Centered single column: header + All/Unread filter + date-grouped cards.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import { useNotifications, type Notification } from '@/hooks/shared';
import { useParentPortalMode } from '@/hooks/parent';
import { resolveParentNotificationRoute } from '@/utils/notification-routes';
import { ParentTopNav } from './ParentTopNav';
import { pt } from './parentWebTheme';

const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
type Cfg = { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string };
const CONFIG: Record<string, Cfg> = {
  application_received: { icon: 'person-add-outline', color: pt.accent, bg: pt.accentSoft },
  status_changed: { icon: 'refresh-circle-outline', color: pt.blue, bg: pt.blueSoft },
  account_verified: { icon: 'shield-checkmark', color: pt.green, bg: pt.greenSoft },
  account_rejected: { icon: 'close-circle-outline', color: pt.red, bg: pt.redSoft },
  document_verified: { icon: 'document-text', color: pt.green, bg: pt.greenSoft },
  document_rejected: { icon: 'document-text-outline', color: pt.red, bg: pt.redSoft },
  job_verified: { icon: 'briefcase', color: pt.green, bg: pt.greenSoft },
  job_rejected: { icon: 'briefcase-outline', color: pt.red, bg: pt.redSoft },
  new_message: { icon: 'chatbubble-outline', color: pt.blue, bg: pt.blueSoft },
  message_received: { icon: 'chatbubble-outline', color: pt.blue, bg: pt.blueSoft },
  profile_update: { icon: 'person-circle-outline', color: pt.accent, bg: pt.accentSoft },
  interview_scheduled: { icon: 'calendar-outline', color: pt.blue, bg: pt.blueSoft },
  interview_confirmed: { icon: 'checkmark-circle-outline', color: pt.green, bg: pt.greenSoft },
  interview_declined: { icon: 'close-circle-outline', color: pt.red, bg: pt.redSoft },
  interview_request: { icon: 'calendar-outline', color: pt.blue, bg: pt.blueSoft },
  task_completed: { icon: 'checkmark-done-outline', color: pt.green, bg: pt.greenSoft },
  attendance_checkin: { icon: 'log-in-outline', color: pt.green, bg: pt.greenSoft },
  leave_request_submitted: { icon: 'file-tray-outline', color: pt.amber, bg: pt.amberSoft },
  leave_request_responded: { icon: 'checkmark-circle-outline', color: pt.blue, bg: pt.blueSoft },
  contract_terminated: { icon: 'document-text-outline', color: pt.red, bg: pt.redSoft },
  placement_renewal: { icon: 'sync-outline', color: pt.blue, bg: pt.blueSoft },
  termination_requested: { icon: 'alert-circle-outline', color: pt.red, bg: pt.redSoft },
};
const cfgOf = (t: string): Cfg => CONFIG[t] ?? { icon: 'notifications-outline', color: pt.muted, bg: pt.lineSoft };

function timeAgo(v: string) {
  const diff = Math.floor((Date.now() - new Date(String(v).replace(' ', 'T')).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(String(v).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
function bucket(v: string): 'Today' | 'Yesterday' | 'Earlier' {
  const d = new Date(String(v).replace(' ', 'T'));
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return 'Earlier';
}

export function ParentNotificationsWeb({ userName, avatar, verified, onLogout }: { userName: string; avatar: string | null; verified: boolean; onLogout: () => void }) {
  const router = useRouter();
  const isWorkMode = useParentPortalMode();
  const { notifications, unreadCount, loading, refresh, markAllRead, markOneRead } = useNotifications('parent');
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const list = tab === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;
  const groups = useMemo(() => {
    const order: ('Today' | 'Yesterday' | 'Earlier')[] = ['Today', 'Yesterday', 'Earlier'];
    const map: Record<string, Notification[]> = {};
    for (const n of list) { const b = bucket(n.created_at); (map[b] ??= []).push(n); }
    return order.filter((k) => map[k]?.length).map((k) => ({ label: k, items: map[k] }));
  }, [list]);

  const press = async (n: Notification) => {
    if (!n.is_read) markOneRead(n.notification_id);
    const route = await resolveParentNotificationRoute(n);
    if (route) router.push(route as any);
  };

  return (
    <View style={s.root}>
      <ParentTopNav active="none" mode={isWorkMode ? 'work' : 'recruitment'} userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.page}>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <View style={s.titleRow}>
                <Text style={s.title}>Notifications</Text>
                {unreadCount > 0 && <View style={s.headBadge}><Text style={s.headBadgeText}>{unreadCount} new</Text></View>}
              </View>
              <Text style={s.sub}>Stay on top of applicants, interviews, and household updates.</Text>
            </View>
            <View style={s.headActions}>
              <Pressable onPress={refresh} style={({ hovered }: any) => [s.iconBtn, TRANS, hovered && { backgroundColor: pt.lineSoft }]}><Ionicons name="refresh" size={17} color={pt.muted} /></Pressable>
              {unreadCount > 0 && (
                <Pressable onPress={markAllRead} style={({ hovered }: any) => [s.markAll, TRANS, hovered && { backgroundColor: pt.accentSoft }]}>
                  <Ionicons name="checkmark-done" size={16} color={pt.accent} /><Text style={s.markAllText}>Mark all read</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={s.tabs}>
            {(['all', 'unread'] as const).map((t) => {
              const on = tab === t;
              return (
                <Pressable key={t} onPress={() => setTab(t)} style={({ hovered }: any) => [s.tab, on && s.tabOn, TRANS, hovered && !on && { backgroundColor: pt.lineSoft }]}>
                  <Text style={[s.tabText, on && { color: '#fff' }]}>{t === 'all' ? 'All' : 'Unread'}{t === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}</Text>
                </Pressable>
              );
            })}
          </View>

          {loading && notifications.length === 0 ? (
            <ActivityIndicator color={pt.accent} style={{ marginTop: 50 }} />
          ) : list.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Ionicons name="notifications-off-outline" size={34} color={pt.accent} /></View>
              <Text style={s.emptyTitle}>{tab === 'unread' ? 'No unread notifications' : 'All caught up!'}</Text>
              <Text style={s.emptySub}>Applicant updates, interview responses, and household notifications will appear here.</Text>
            </View>
          ) : (
            groups.map((g) => (
              <View key={g.label} style={{ marginTop: 18 }}>
                <Text style={s.groupLabel}>{g.label}</Text>
                <View style={s.groupCard}>
                  {g.items.map((n, i) => {
                    const c = cfgOf(n.type);
                    return (
                      <Pressable key={n.notification_id} onPress={() => press(n)}
                        style={({ hovered }: any) => [s.item, i < g.items.length - 1 && s.itemDiv, !n.is_read && s.itemUnread, TRANS, hovered && { backgroundColor: '#FFFBF3' }]}>
                        <View style={[s.itemIc, { backgroundColor: c.bg }]}><Ionicons name={c.icon} size={20} color={c.color} /></View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={s.itemTop}>
                            <Text style={[s.itemTitle, !n.is_read && { color: pt.ink }]} numberOfLines={1}>{n.title}</Text>
                            <Text style={s.itemTime}>{timeAgo(n.created_at)}</Text>
                          </View>
                          <Text style={s.itemMsg} numberOfLines={2}>{n.message}</Text>
                        </View>
                        {!n.is_read && <View style={s.unreadDot} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const shadowSm = { boxShadow: '0 3px 12px rgba(139,90,43,.07)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: pt.canvas },
  scroll: { paddingBottom: 20 },
  page: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 26 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 28, color: pt.ink, letterSpacing: -0.5 },
  headBadge: { backgroundColor: pt.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  headBadgeText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },
  sub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: pt.muted, marginTop: 3 },
  headActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, borderColor: pt.line, alignItems: 'center', justifyContent: 'center' },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1.4, borderColor: pt.accent, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9, minHeight: 44 },
  markAllText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 18 },
  tab: { borderWidth: 1, borderColor: pt.line, backgroundColor: pt.surface, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9, minHeight: 40 },
  tabOn: { backgroundColor: pt.ink, borderColor: pt.ink },
  tabText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.muted },
  groupLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },
  groupCard: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, overflow: 'hidden', ...shadowSm },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15, cursor: 'pointer' as any },
  itemDiv: { borderBottomWidth: 1, borderBottomColor: pt.lineSoft },
  itemUnread: { backgroundColor: '#FFFCF6' },
  itemIc: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: pt.muted },
  itemTime: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.subtle },
  itemMsg: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, marginTop: 2, lineHeight: 18 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: pt.accent },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 8 },
  emptyIcon: { width: 66, height: 66, borderRadius: 20, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: pt.ink },
  emptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.muted, textAlign: 'center', maxWidth: 380, lineHeight: 20 },
});
