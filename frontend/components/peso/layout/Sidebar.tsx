// components/peso/layout/Sidebar.tsx
// Desktop PESO sidebar — grouped nav, badge counts, orange active pill.
import { Ionicons } from '@expo/vector-icons';
import type { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { theme } from '@/constants/theme';
import { styles } from '@/constants/pesoLayout.styles';
import { NAV_GROUPS, type BadgeKey } from './navConfig';

const ORANGE = theme.color.peso;

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
  const isActive = (path: string) => pathname === path;

  return (
    <View style={[styles.sidebar, collapsed ? styles.sidebarCollapsed : styles.sidebarWide]}>
      <View style={styles.sidebarHeader}>
        <CareLinkLogoMark size={40} containerStyle={{ marginRight: 12 }} />
        {!collapsed && (
          <View>
            <Text style={styles.logoText}>CareLink</Text>
            <Text style={styles.logoSubtext}>PESO Administrator Portal</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.toggleBtn} onPress={onToggleCollapse}>
        <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={20} color="#666" />
      </TouchableOpacity>

      <ScrollView style={styles.navItems}>
        {NAV_GROUPS.map((group) => (
          <View key={group.label} style={{ marginBottom: 18 }}>
            {!collapsed && <Text style={styles.navLabel}>{group.label}</Text>}
            {group.items.map((item) => {
              const active = isActive(item.path);
              const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[styles.sidebarItem, active && styles.sidebarItemActive]}
                  onPress={() => router.push(item.path as never)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? '#fff' : '#5B5B5B'}
                    style={{ marginRight: collapsed ? 0 : 12 }}
                  />
                  {!collapsed && (
                    <Text style={[styles.sidebarText, active && styles.sidebarTextActive]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  )}
                  {!collapsed && badgeCount > 0 && (
                    <View style={[badgeStyle(active)]}>
                      <Text style={badgeTextStyle(active)}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.sidebarFooter}>
        {!collapsed && (
          <View style={styles.userInfo}>
            <Ionicons name="person-circle" size={40} color="#ccc" />
            <View style={styles.userText}>
              <Text style={styles.userNameText} numberOfLines={1}>{userName}</Text>
              <Text style={styles.userRoleText}>PESO Administrator</Text>
            </View>
          </View>
        )}
        <TouchableOpacity style={styles.sidebarLogout} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
          {!collapsed && <Text style={styles.logoutTextSide}>Log Out</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function badgeStyle(active: boolean) {
  return {
    marginLeft: 'auto' as const,
    backgroundColor: active ? 'rgba(255,255,255,0.25)' : ORANGE,
    borderRadius: 10,
    minWidth: 22,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 5,
  };
}

function badgeTextStyle(active: boolean) {
  return { color: active ? '#fff' : '#fff', fontSize: 11, fontWeight: '700' as const };
}
