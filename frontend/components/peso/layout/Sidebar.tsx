// components/peso/layout/Sidebar.tsx
// Desktop PESO sidebar — theme-aware (light/dark), grouped nav with a gradient
// active pill, hover feedback, a light/dark toggle and logout.
import { Ionicons } from '@expo/vector-icons';
import type { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { usePesoTheme, font, radius } from '@/contexts/PesoThemeContext';
import { NAV_GROUPS, type BadgeKey } from './navConfig';

type Props = {
  router: ReturnType<typeof useRouter>;
  pathname: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userName: string;
  badges: Record<BadgeKey, number>;
  onLogout: () => void;
};

export function Sidebar({ router, pathname, collapsed, onToggleCollapse, userName, badges, onLogout }: Props) {
  const { c, dark, toggle } = usePesoTheme();
  const isActive = (path: string) => pathname === path;
  const W = collapsed ? 76 : 250;

  return (
    <View style={{ width: W, backgroundColor: c.surface, borderRightWidth: 1, borderRightColor: c.line, paddingVertical: 16, paddingHorizontal: 12, height: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8, gap: 10 }}>
        <CareLinkLogoMark size={38} />
        {!collapsed && (
          <View>
            <Text style={{ fontFamily: font.display, fontSize: 17, color: c.ink }}>CareLink</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 10.5, color: c.subtle }}>PESO Administrator</Text>
          </View>
        )}
      </View>

      <TouchableOpacity onPress={onToggleCollapse} style={{ alignSelf: collapsed ? 'center' : 'flex-end', width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: c.sunken, marginBottom: 6 }}>
        <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={17} color={c.muted} />
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {NAV_GROUPS.map((group) => (
          <View key={group.label} style={{ marginBottom: 16 }}>
            {!collapsed && <Text style={{ fontFamily: font.semibold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: c.subtle, marginLeft: 8, marginBottom: 6, marginTop: 6 }}>{group.label}</Text>}
            {group.items.map((item) => {
              const active = isActive(item.path);
              const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
              return (
                <NavItem key={item.path} item={item} active={active} collapsed={collapsed} badge={badgeCount} onPress={() => router.push(item.path as never)} />
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10, gap: 4 }}>
        {/* Light / dark toggle */}
        <Pressable onPress={toggle} style={({ hovered }: any) => [{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md }, hovered && { backgroundColor: c.raise }]}>
          <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={19} color={c.muted} />
          {!collapsed && <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: c.muted }}>{dark ? 'Light mode' : 'Dark mode'}</Text>}
        </Pressable>

        {!collapsed && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 6 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person" size={17} color={c.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: c.ink }} numberOfLines={1}>{userName}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 11, color: c.subtle }}>PESO Officer</Text>
            </View>
          </View>
        )}
        <Pressable onPress={onLogout} style={({ hovered }: any) => [{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md }, hovered && { backgroundColor: c.badSoft }]}>
          <Ionicons name="log-out-outline" size={20} color={c.bad} />
          {!collapsed && <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: c.bad }}>Log Out</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function NavItem({ item, active, collapsed, badge, onPress }: { item: (typeof NAV_GROUPS)[number]['items'][number]; active: boolean; collapsed: boolean; badge: number; onPress: () => void }) {
  const { c } = usePesoTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}>
      <MotiView animate={{ translateX: hovered && !active ? 2 : 0 }} transition={{ type: 'timing', duration: 130 }}
        style={{ borderRadius: radius.md, overflow: 'hidden', marginBottom: 3 }}>
        {active && <LinearGradient colors={c.accentGrad as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, gap: collapsed ? 0 : 11, backgroundColor: !active && hovered ? c.raise : 'transparent' }}>
          <Ionicons name={item.icon} size={19} color={active ? c.onAccent : c.muted} />
          {!collapsed && <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13.5, color: active ? c.onAccent : c.muted }} numberOfLines={1}>{item.label}</Text>}
          {!collapsed && badge > 0 && (
            <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: active ? 'rgba(255,255,255,0.28)' : c.bad, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontFamily: font.semibold }}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </View>
      </MotiView>
    </Pressable>
  );
}
