// MobileMenu.tsx
// Parent Mobile Menu Component - Modularized & Clean
// Main orchestration file - delegates to components and hooks

import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Animated, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export function MobileMenu({
  isOpen,
  onClose,
  handleLogout,
  notificationUnread = 0,
}: {
  isOpen: boolean;
  onClose: () => void;
  handleLogout: () => void;
  notificationUnread?: number;
}) {
  const router = useRouter();
  
  // This is the magic for the SIDEWAYS slide
  const slideAnim = useRef(new Animated.Value(-width)).current; 

  useEffect(() => {
    if (isOpen) {
      // Slide in
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    } else {
      // Slide out
      Animated.timing(slideAnim, { toValue: -width, duration: 250, useNativeDriver: true }).start();
    }
  }, [isOpen]);

  // Mini component just for the menu buttons
  const DrawerItem = ({ icon, label, path, badge }: any) => (
    <TouchableOpacity
      style={styles.drawerItem}
      onPress={() => { onClose(); router.push(path); }}
    >
      <View style={styles.drawerItemLeft}>
        <Ionicons name={icon} size={22} color="#666" />
        <Text style={styles.drawerItemText}>{label}</Text>
      </View>
      {badge > 0 && (
        <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Invisible button to close when tapping outside */}
        <TouchableOpacity style={styles.backgroundTap} onPress={onClose} activeOpacity={1} />
        
        {/* The Animated Sideways Drawer */}
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Menu</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Text style={styles.sectionHint}>
              Use the bar below for Home, Find, Jobs, Applicants, and Messages.
            </Text>
            <DrawerItem icon="heart" label="Active Helpers" path="/(parent)/active_helpers" />
            <DrawerItem
              icon="notifications"
              label="Notifications"
              path="/(parent)/notifications"
              badge={notificationUnread}
            />
            <DrawerItem icon="person" label="Profile" path="/(parent)/profile" />
            <DrawerItem icon="settings" label="Settings" path="/(parent)/settings" />
            
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  backgroundTap: { flex: 1 },
  drawer: { width: '80%', maxWidth: 320, backgroundColor: '#fff', height: '100%', padding: 24, position: 'absolute', left: 0, top: 0, bottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  headerText: { fontSize: 20, fontWeight: 'bold' },
  sectionHint: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  drawerItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, marginBottom: 4 },
  drawerItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  drawerItemText: { fontSize: 16, fontWeight: "500", color: "#333" },
  badge: { backgroundColor: "#FF3B30", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  logoutButton: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, backgroundColor: "#FFF5F5", gap: 10, marginTop: 40 },
  logoutText: { color: "#FF3B30", fontSize: 15, fontWeight: "700" }
});