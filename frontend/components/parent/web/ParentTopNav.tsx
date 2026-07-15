// components/parent/web/ParentTopNav.tsx — top navigation for parent WEB screens.
// Mode-aware: the parent portal runs in either "recruitment" or "work" mode, and
// each mode shows a different tab set (mirrors the mobile ParentWorkModeTabBar).
// The Recruitment | Work Mode toggle lives in the bar so the changing tabs are
// never a surprise.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { FontFamily } from '@/constants/GlobalStyles';
import { useNotifications } from '@/hooks/shared';
import { useConversations } from '@/hooks/shared/useMessages';
import { pt } from './parentWebTheme';

export type ParentNavKey = 'home' | 'browse' | 'jobs' | 'applications' | 'messages' | 'helpers' | 'tasks' | 'attendance' | 'requests';
type Mode = 'recruitment' | 'work';
type Item = { key: ParentNavKey; label: string; icon: keyof typeof Ionicons.glyphMap; path: string };

// Recruitment mode: hiring-focused tabs.
const RECRUITMENT_TABS: Item[] = [
  { key: 'home',         label: 'Dashboard',      icon: 'grid-outline',          path: '/(parent)/home' },
  { key: 'browse',       label: 'Browse Helpers', icon: 'search-outline',        path: '/(parent)/browse' },
  { key: 'jobs',         label: 'Job Posts',      icon: 'briefcase-outline',     path: '/(parent)/jobs' },
  { key: 'applications', label: 'Applications',   icon: 'document-text-outline', path: '/(parent)/jobs?tab=applicants' },
  { key: 'messages',     label: 'Messages',       icon: 'chatbubble-outline',    path: '/(parent)/messages' },
];
// Work mode: managing active helpers. Mirrors the mobile work-mode screens so
// switching to web keeps everything as tabs instead of separate screens.
const WORK_TABS: Item[] = [
  { key: 'home',       label: 'Dashboard',  icon: 'grid-outline',        path: '/(parent)/home' },
  { key: 'helpers',    label: 'My Helpers', icon: 'people-outline',      path: '/(parent)/hire' },
  { key: 'tasks',      label: 'Tasks',      icon: 'clipboard-outline',   path: '/(parent)/hire/placement_tasks' },
  { key: 'attendance', label: 'Attendance', icon: 'calendar-outline',    path: '/(parent)/hire/placement_attendance' },
  { key: 'requests',   label: 'Requests',   icon: 'file-tray-outline',   path: '/(parent)/hire/requests' },
  { key: 'messages',   label: 'Messages',   icon: 'chatbubble-outline',  path: '/(parent)/messages' },
];

export function ParentTopNav({
  active, mode, userName, avatar, verified, onLogout,
}: {
  active: ParentNavKey | 'none';
  mode: Mode;
  userName: string;
  avatar: string | null;
  verified: boolean;
  onLogout: () => void;
}) {
  const router = useRouter();
  const { unreadCount } = useNotifications('parent');
  const { conversations } = useConversations();
  const unreadMsgs = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (path: string) => router.push(path as never);
  const tabs = mode === 'work' ? WORK_TABS : RECRUITMENT_TABS;
  const initials = (userName || 'Parent').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={s.bar}>
      <TouchableOpacity style={s.logo} onPress={() => go('/(parent)/home')} activeOpacity={0.85}>
        <CareLinkLogoMark size={44} />
        <View>
          <Text style={s.logoName}>Care<Text style={{ color: pt.accent }}>Link</Text></Text>
          <Text style={s.logoSub}>Parent Portal</Text>
        </View>
      </TouchableOpacity>

      <View style={s.menu}>
        {tabs.map((it) => {
          const on = active === it.key;
          const badge = it.key === 'messages' ? unreadMsgs : 0;
          return (
            <TouchableOpacity key={it.key} style={[s.item, on && s.itemOn]} onPress={() => go(it.path)} activeOpacity={0.85}>
              <Ionicons name={it.icon} size={18} color={on ? pt.accent : pt.muted} />
              <Text style={[s.itemText, on && s.itemTextOn]}>{it.label}</Text>
              {badge > 0 && <View style={s.itemBadge}><Text style={s.itemBadgeText}>{badge > 9 ? '9+' : badge}</Text></View>}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.right}>
        <TouchableOpacity style={s.bell} onPress={() => go('/(parent)/notifications')} hitSlop={8}>
          <Ionicons name="notifications-outline" size={24} color={pt.muted} />
          {unreadCount > 0 && <View style={s.bellBadge}><Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
        </TouchableOpacity>

        <View>
          <TouchableOpacity style={s.user} onPress={() => setMenuOpen((v) => !v)} activeOpacity={0.85}>
            {avatar ? <Image source={{ uri: avatar }} style={s.userImg} /> : <View style={[s.userImg, s.userImgFb]}><Text style={s.userInitials}>{initials}</Text></View>}
            <View>
              <Text style={s.userName} numberOfLines={1}>{userName || 'Parent'}</Text>
              {verified ? (
                <View style={s.userVer}><Ionicons name="shield-checkmark" size={11} color={pt.green} /><Text style={s.userVerText}>PESO Verified</Text></View>
              ) : <Text style={s.userSub}>Employer</Text>}
            </View>
            <Ionicons name="chevron-down" size={16} color={pt.muted} />
          </TouchableOpacity>

          {menuOpen && (
            <>
              <Pressable style={s.backdrop} onPress={() => setMenuOpen(false)} />
              <View style={s.menuCard}>
                <MenuRow icon="person-outline" label="My Profile" onPress={() => { setMenuOpen(false); go('/(parent)/profile'); }} />
                <MenuRow icon="settings-outline" label="Settings" onPress={() => { setMenuOpen(false); go('/(parent)/settings'); }} />
                <View style={s.menuDiv} />
                <MenuRow icon="log-out-outline" label="Log Out" danger onPress={() => { setMenuOpen(false); onLogout(); }} />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function MenuRow({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={18} color={danger ? pt.red : pt.muted} />
      <Text style={[s.menuRowText, danger && { color: pt.red }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: pt.surface, borderBottomWidth: 1, borderBottomColor: pt.line, zIndex: 20 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logoName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 21, color: pt.ink, letterSpacing: -0.3 },
  logoSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.muted, marginTop: -1 },

  menu: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, minHeight: 44 },
  itemOn: { backgroundColor: pt.accentSoft },
  itemText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.muted },
  itemTextOn: { color: pt.accent },
  itemBadge: { backgroundColor: pt.accent, borderRadius: 9, paddingHorizontal: 6, minWidth: 18, alignItems: 'center' },
  itemBadgeText: { color: '#fff', fontSize: 11, fontFamily: FontFamily.fredokaSemiBold },

  right: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  bell: { position: 'relative', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: pt.accent, borderRadius: 9, paddingHorizontal: 5, minWidth: 18, alignItems: 'center', borderWidth: 2, borderColor: pt.surface },
  bellBadgeText: { color: '#fff', fontSize: 10, fontFamily: FontFamily.fredokaSemiBold },

  user: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  userImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: pt.accentSoft },
  userImgFb: { backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  userInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.caramel },
  userName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink },
  userVer: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  userVerText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: pt.green },
  userSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted },

  backdrop: { position: 'absolute', top: -100, left: -2000, right: -2000, bottom: -2000, width: 4000, height: 4000 },
  menuCard: {
    position: 'absolute', top: 50, right: 0, width: 190, backgroundColor: pt.surface, borderRadius: 14,
    borderWidth: 1, borderColor: pt.line, paddingVertical: 6, zIndex: 30,
    ...Platform.select({ web: { boxShadow: '0 12px 30px rgba(120,80,45,.18)' } as any, default: { elevation: 12 } }),
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, minHeight: 44 },
  menuRowText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink },
  menuDiv: { height: 1, backgroundColor: pt.line, marginVertical: 4 },
});
