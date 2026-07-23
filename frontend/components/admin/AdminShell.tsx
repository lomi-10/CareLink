// components/admin/AdminShell.tsx
// The single frame every Super Admin screen renders inside: a themeable dark
// sidebar (identical on every screen — previously only the dashboard had one, the
// rest had ad-hoc back-button headers) plus a header bar with the page title, a
// notification bell that always routes to Complaints, a navy<->brown theme toggle,
// and the avatar. Screens pass their content as children and stop worrying about
// chrome.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal, Platform, ScrollView, StatusBar, Text, TouchableOpacity,
  useWindowDimensions, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { useAdminTheme } from '@/contexts/AdminThemeContext';

export type AdminNavKey = 'dashboard' | 'users' | 'accounts' | 'logs' | 'complaints';

const NAV: { key: AdminNavKey; icon: keyof typeof Ionicons.glyphMap; label: string; route: string; group: string }[] = [
  { key: 'dashboard', icon: 'grid', label: 'Dashboard', route: '/admin/dashboard', group: 'OVERVIEW' },
  { key: 'users', icon: 'people', label: 'User Verification', route: '/admin/user_management', group: 'USER & ADMIN' },
  { key: 'accounts', icon: 'person-add', label: 'Admin & PESO Accounts', route: '/admin/create_admin_user', group: 'USER & ADMIN' },
  { key: 'logs', icon: 'list', label: 'Audit Trail', route: '/admin/logs', group: 'SYSTEM' },
  { key: 'complaints', icon: 'warning', label: 'Complaints', route: '/admin/complaints', group: 'SYSTEM' },
];

export function AdminShell({
  active,
  title,
  subtitle,
  complaintsBadge = 0,
  headerRight,
  scroll = true,
  contentMaxWidth = 1440,
  children,
}: {
  active: AdminNavKey;
  title: string;
  subtitle?: string;
  complaintsBadge?: number;
  headerRight?: React.ReactNode;
  scroll?: boolean;
  contentMaxWidth?: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { palette: c, name, toggle } = useAdminTheme();
  const { width } = useWindowDimensions();
  const wide = width > 900;
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // mobile drawer

  const go = (route: string) => { setNavOpen(false); router.push(route as any); };
  const confirmLogout = async () => { await AsyncStorage.clear(); setLogoutOpen(false); router.replace('/welcome'); };

  const NavItem = ({ item }: { item: (typeof NAV)[number] }) => {
    const on = item.key === active;
    return (
      <TouchableOpacity
        onPress={() => (on ? setNavOpen(false) : go(item.route))}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 11,
          paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10,
          backgroundColor: on ? c.accent : 'transparent',
        }}
      >
        <Ionicons name={item.icon} size={18} color={on ? c.accentText : c.muted} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: on ? c.accentText : c.muted }}>{item.label}</Text>
        {item.key === 'complaints' && complaintsBadge > 0 && (
          <View style={{ backgroundColor: c.red, borderRadius: 999, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{complaintsBadge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const Sidebar = () => (
    <View style={{ backgroundColor: c.panel2, borderRightWidth: 1, borderRightColor: c.border, padding: 16, height: '100%', width: 250 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22, paddingHorizontal: 4 }}>
        <CareLinkLogoMark size={34} containerStyle={{ marginRight: 10 }} />
        <View>
          <Text style={{ fontSize: 18, fontWeight: '900', color: c.text }}>CareLink</Text>
          <Text style={{ fontSize: 10, color: c.muted, fontWeight: '700', letterSpacing: 0.5, marginTop: 1 }}>Super Admin Portal</Text>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {['OVERVIEW', 'USER & ADMIN', 'SYSTEM'].map((group) => (
          <View key={group}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: c.subtle, letterSpacing: 1, marginTop: 18, marginBottom: 8, marginLeft: 6 }}>{group}</Text>
            {NAV.filter((n) => n.group === group).map((item) => <NavItem key={item.key} item={item} />)}
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity
        onPress={() => setLogoutOpen(true)}
        activeOpacity={0.85}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: c.border, marginTop: 8 }}
      >
        <Ionicons name="log-out-outline" size={18} color={c.red} />
        <Text style={{ color: c.red, fontSize: 14, fontWeight: '700' }}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );

  const Header = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 12, flexWrap: 'wrap' }}>
      {!wide && (
        <TouchableOpacity onPress={() => setNavOpen(true)} style={iconBox(c)} activeOpacity={0.8}>
          <Ionicons name="menu" size={20} color={c.text} />
        </TouchableOpacity>
      )}
      <View style={{ flex: 1, minWidth: 160 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: c.text }}>{title}</Text>
        {!!subtitle && <Text style={{ fontSize: 13, color: c.muted, marginTop: 3 }}>{subtitle}</Text>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {headerRight}
        {/* Theme toggle — flip the dark surface between navy and brown. */}
        <TouchableOpacity onPress={toggle} style={iconBox(c)} activeOpacity={0.8} accessibilityLabel="Switch admin theme">
          <Ionicons name={name === 'navy' ? 'color-palette-outline' : 'moon-outline'} size={18} color={c.text} />
        </TouchableOpacity>
        {/* Notification bell — ALWAYS goes to Complaints (was inconsistent before). */}
        <TouchableOpacity onPress={() => go('/admin/complaints')} style={iconBox(c)} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={18} color={c.text} />
          {complaintsBadge > 0 && (
            <View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: c.red, borderWidth: 1.5, borderColor: c.panel }} />
          )}
        </TouchableOpacity>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={18} color="#fff" />
        </View>
      </View>
    </View>
  );

  const Body = (
    <View style={{ width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}>
      <Header />
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {wide && <Sidebar />}
        {scroll ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: wide ? 26 : 16, paddingBottom: 60 }}>
            {Body}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, padding: wide ? 26 : 16 }}>{Body}</View>
        )}
      </View>

      {/* Mobile nav drawer */}
      {!wide && (
        <Modal visible={navOpen} animationType="fade" transparent onRequestClose={() => setNavOpen(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' }} activeOpacity={1} onPress={() => setNavOpen(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}><Sidebar /></TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Logout confirm */}
      <Modal visible={logoutOpen} animationType="fade" transparent onRequestClose={() => setLogoutOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
          <View style={{ backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 22, width: '100%', maxWidth: 360, alignItems: 'center' }}>
            <Ionicons name="log-out-outline" size={34} color={c.red} />
            <Text style={{ fontSize: 17, fontWeight: '800', color: c.text, marginTop: 10 }}>Log Out?</Text>
            <Text style={{ fontSize: 13.5, color: c.muted, marginTop: 6, textAlign: 'center' }}>You'll need to sign in again to access the portal.</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 18 }}>
              <TouchableOpacity onPress={() => setLogoutOpen(false)} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}>
                <Text style={{ color: c.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmLogout} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: c.red, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const iconBox = (c: ReturnType<typeof useAdminTheme>['palette']) => ({
  width: 40, height: 40, borderRadius: 10, backgroundColor: c.panel,
  borderWidth: 1, borderColor: c.border, alignItems: 'center' as const, justifyContent: 'center' as const,
});
