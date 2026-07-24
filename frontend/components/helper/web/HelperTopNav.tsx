// components/helper/web/HelperTopNav.tsx — top navigation bar for helper WEB screens.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { FontFamily } from '@/constants/GlobalStyles';
import { useNotifications } from '@/hooks/shared';
import { useConversations } from '@/hooks/shared/useMessages';
import { wt } from './webTheme';

type NavKey = 'dashboard' | 'jobs' | 'applications' | 'messages';

const ITEMS: { key: NavKey; label: string; icon: keyof typeof Ionicons.glyphMap; path: string }[] = [
  { key: 'dashboard',    label: 'Dashboard',       icon: 'home-outline',        path: '/(helper)/home' },
  { key: 'jobs',         label: 'Find Jobs',        icon: 'search-outline',      path: '/(helper)/browse' },
  { key: 'applications', label: 'My Applications',  icon: 'document-text-outline', path: '/(helper)/applications' },
  { key: 'messages',     label: 'Messages',         icon: 'chatbubble-outline',  path: '/(helper)/messages' },
];

export function HelperTopNav({
  active, userName, avatar, verified, onLogout,
}: {
  active: NavKey;
  userName: string;
  avatar: string | null;
  verified: boolean;
  onLogout: () => void;
}) {
  const router = useRouter();
  const { unreadCount } = useNotifications('helper');
  const { conversations } = useConversations();
  const unreadMsgs = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (path: string) => router.push(path as never);

  return (
    <View style={s.bar}>
      <Pressable style={({ hovered }: any) => [s.logo, TRANS, hovered && { opacity: 0.8 }]} onPress={() => go('/(helper)/home')}>
        <CareLinkLogoMark size={44} />
        <View>
          <Text style={s.logoName}>Care<Text style={{ color: wt.accent }}>Link</Text></Text>
          <Text style={s.logoSub}>Helper Portal</Text>
        </View>
      </Pressable>

      <View style={s.menu}>
        {ITEMS.map((it) => {
          const on = active === it.key;
          const badge = it.key === 'messages' ? unreadMsgs : 0;
          return (
            <Pressable
              key={it.key}
              onPress={() => go(it.path)}
              style={({ hovered }: any) => [s.item, on && s.itemOn, TRANS, hovered && !on && s.itemHover]}
            >
              {({ hovered }: any) => (
                <>
                  <Ionicons name={it.icon} size={18} color={on || hovered ? wt.accent : wt.muted} />
                  <Text style={[s.itemText, (on || hovered) && s.itemTextOn]}>{it.label}</Text>
                  {badge > 0 && <View style={s.itemBadge}><Text style={s.itemBadgeText}>{badge > 9 ? '9+' : badge}</Text></View>}
                </>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={s.right}>
        <Pressable style={({ hovered }: any) => [s.bell, TRANS, hovered && { opacity: 0.7 }]} onPress={() => go('/(helper)/notifications')} hitSlop={8}>
          <Ionicons name="notifications-outline" size={24} color={wt.muted} />
          {unreadCount > 0 && <View style={s.bellBadge}><Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
        </Pressable>

        <View>
          <Pressable style={({ hovered }: any) => [s.user, TRANS, hovered && s.userHover]} onPress={() => setMenuOpen((v) => !v)}>
            {avatar ? <Image source={{ uri: avatar }} style={s.userImg} /> : <View style={[s.userImg, s.userImgFb]}><Ionicons name="person" size={18} color={wt.subtle} /></View>}
            <View>
              <Text style={s.userName} numberOfLines={1}>{userName || 'Helper'}</Text>
              {verified ? (
                <View style={s.userVer}><Ionicons name="shield-checkmark" size={11} color={wt.green} /><Text style={s.userVerText}>PESO Verified</Text></View>
              ) : <Text style={s.userSub}>Helper</Text>}
            </View>
            <Ionicons name="chevron-down" size={16} color={wt.muted} />
          </Pressable>

          {menuOpen && (
            <>
              <Pressable style={s.backdrop} onPress={() => setMenuOpen(false)} />
              <View style={s.menuCard}>
                <MenuRow icon="person-outline" label="My Profile" onPress={() => { setMenuOpen(false); go('/(helper)/profile'); }} />
                <MenuRow icon="settings-outline" label="Settings" onPress={() => { setMenuOpen(false); go('/(helper)/settings'); }} />
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
    <Pressable style={({ hovered }: any) => [s.menuRow, TRANS, hovered && { backgroundColor: danger ? wt.redSoft : wt.lineSoft }]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={danger ? wt.red : wt.muted} />
      <Text style={[s.menuRowText, danger && { color: wt.red }]}>{label}</Text>
    </Pressable>
  );
}

const TRANS = { transitionDuration: '140ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 26, paddingHorizontal: 34, paddingVertical: 14, backgroundColor: wt.surface, borderBottomWidth: 1, borderBottomColor: wt.line, zIndex: 20 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logoName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 21, color: wt.ink, letterSpacing: -0.3 },
  logoSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: wt.muted, marginTop: -1 },

  menu: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, cursor: 'pointer' as any },
  itemOn: { backgroundColor: wt.accentSoft },
  itemHover: { backgroundColor: wt.lineSoft },
  itemText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: wt.muted },
  itemTextOn: { color: wt.accent },
  itemBadge: { backgroundColor: wt.accent, borderRadius: 9, paddingHorizontal: 6, minWidth: 18, alignItems: 'center' },
  itemBadgeText: { color: '#fff', fontSize: 11, fontFamily: FontFamily.fredokaSemiBold },

  right: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  bell: { position: 'relative' },
  bellBadge: { position: 'absolute', top: -6, right: -8, backgroundColor: wt.accent, borderRadius: 9, paddingHorizontal: 5, minWidth: 18, alignItems: 'center', borderWidth: 2, borderColor: wt.surface },
  bellBadgeText: { color: '#fff', fontSize: 10, fontFamily: FontFamily.fredokaSemiBold },

  user: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, cursor: 'pointer' as any },
  userHover: { backgroundColor: wt.lineSoft },
  userImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: wt.accentSoft },
  userImgFb: { backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  userName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.ink },
  userVer: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  userVerText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: wt.green },
  userSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: wt.muted },

  backdrop: { position: 'absolute', top: -100, left: -2000, right: -2000, bottom: -2000, width: 4000, height: 4000 },
  menuCard: {
    position: 'absolute', top: 50, right: 0, width: 190, backgroundColor: wt.surface, borderRadius: 14,
    borderWidth: 1, borderColor: wt.line, paddingVertical: 6, zIndex: 30,
    ...Platform.select({ web: { boxShadow: '0 12px 30px rgba(120,80,45,.18)' } as any, default: { elevation: 12 } }),
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  menuRowText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.ink },
  menuDiv: { height: 1, backgroundColor: wt.line, marginVertical: 4 },
});
