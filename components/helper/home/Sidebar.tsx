// components/helper/home/Sidebar.tsx
// Desktop sidebar navigation with active highlighting

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { theme } from '@/constants/theme';

interface SidebarProps {
  onLogout: () => void;
}

interface NavItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  path: string;
  badge?: number;
}

const navigationItems: NavItem[] = [
  { icon: 'home', label: 'Home', path: '/(helper)/home' },
  { icon: 'search', label: 'Find Jobs', path: '/(helper)/browse_jobs' },
  { icon: 'briefcase', label: 'My Applications', path: '/(helper)/my_applications' },
  { icon: 'chatbubbles', label: 'Messages', path: '/(helper)/messages' },
  { icon: 'person', label: 'Profile', path: '/(helper)/profile' },
  { icon: 'settings', label: 'Settings', path: '/(helper)/settings' },
];

export function Sidebar({ onLogout }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const handleNavigation = (path: string) => {
    router.push(path as any);
  };

  return (
    <View style={styles.container}>
      {/* Logo Header */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Ionicons name="briefcase" size={28} color="#fff" />
        </View>
        <View>
          <Text style={styles.logoText}>CareLink</Text>
          <Text style={styles.logoSubtext}>Helper Portal</Text>
        </View>
      </View>

      {/* Navigation Items */}
      <ScrollView style={styles.nav}>
        <Text style={styles.navLabel}>MAIN MENU</Text>
        {navigationItems.map((item) => (
          <TouchableOpacity
            key={item.path}
            style={[styles.navItem, isActive(item.path) && styles.navItemActive]}
            onPress={() => handleNavigation(item.path)}
            activeOpacity={0.7}
          >
            <View style={styles.navItemContent}>
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive(item.path) ? theme.color.helper : theme.color.muted}
              />
              <Text
                style={[
                  styles.navItemText,
                  isActive(item.path) && styles.navItemTextActive,
                ]}
              >
                {item.label}
              </Text>
            </View>
            {item.badge && item.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
            {isActive(item.path) && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={onLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E5E5EA',
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.color.helper,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  logoSubtext: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  nav: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    marginBottom: 12,
    marginLeft: 12,
    letterSpacing: 1.2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: theme.color.helperSoft,
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  navItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.color.muted,
  },
  navItemTextActive: {
    color: theme.color.helper,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -12,
    width: 3,
    height: 24,
    backgroundColor: theme.color.helper,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFF5F5',
    gap: 10,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '700',
  },
});
