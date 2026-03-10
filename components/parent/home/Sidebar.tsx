// components/parent/home/Sidebar.tsx
// Parent desktop sidebar navigation

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

interface SidebarProps {
  onLogout: () => void;
}

const navigationItems = [
  { icon: 'home', label: 'Home', path: '/(parent)/home' },
  { icon: 'search', label: 'Find Helpers', path: '/(parent)/helpers' },
  { icon: 'briefcase', label: 'My Job Posts', path: '/(parent)/jobs' },
  { icon: 'people', label: 'Applications', path: '/(parent)/applications' },
  { icon: 'chatbubbles', label: 'Messages', path: '/(parent)/messages' },
  { icon: 'person', label: 'Profile', path: '/(parent)/profile' },
  { icon: 'settings', label: 'Settings', path: '/(parent)/settings' },
] as const;

export function Sidebar({ onLogout }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Ionicons name="home" size={28} color="#fff" />
        </View>
        <View>
          <Text style={styles.logoText}>CareLink</Text>
          <Text style={styles.logoSubtext}>Parent Portal</Text>
        </View>
      </View>

      <ScrollView style={styles.nav}>
        <Text style={styles.navLabel}>MAIN MENU</Text>
        {navigationItems.map((item) => (
          <TouchableOpacity
            key={item.path}
            style={[styles.navItem, isActive(item.path) && styles.navItemActive]}
            onPress={() => router.push(item.path as any)}
          >
            <View style={styles.navItemContent}>
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive(item.path) ? '#007AFF' : '#666'}
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
            {isActive(item.path) && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#E3F2FD',
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
    color: '#666',
  },
  navItemTextActive: {
    color: '#007AFF',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -12,
    width: 3,
    height: 24,
    backgroundColor: '#007AFF',
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
