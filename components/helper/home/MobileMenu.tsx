// Helper mobile drawer — theme-aware; omits items on the bottom tab bar (non-work).

import React, { useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import type { ThemeColor } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { useNotifications } from '@/hooks/shared';
import {
  getHelperNonWorkMobileDrawerItems,
  getHelperWorkModeDrawerItems,
  helperNavIconName,
  isHelperNavActive,
  type HelperNavItem,
} from './helperPortalNav';

const { width } = Dimensions.get('window');

function createMobileMenuStyles(c: ThemeColor) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay, flexDirection: 'row' },
    backgroundTap: { flex: 1 },
    drawer: {
      width: '85%',
      maxWidth: 340,
      backgroundColor: c.surfaceElevated,
      height: '100%',
      paddingTop: Platform.OS === 'ios' ? 8 : 16,
      paddingHorizontal: 16,
      paddingBottom: 24,
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      ...Platform.select({
        web: { boxShadow: '4px 0 32px rgba(15, 23, 42, 0.12)' },
        default: {},
      }),
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    brandTitle: { fontSize: 18, fontWeight: '800', color: c.ink },
    brandSub: { fontSize: 11, color: c.muted, fontWeight: '600', marginTop: 2 },
    header: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 },
    navLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: c.subtle,
      marginBottom: 8,
      marginLeft: 4,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    drawerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 4,
      borderRadius: 12,
    },
    drawerItemActive: {
      backgroundColor: c.helperSoft,
      borderWidth: 1,
      borderColor: c.helper + '28',
      borderLeftWidth: 3,
      borderLeftColor: c.helper,
    },
    drawerItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    drawerItemText: { fontSize: 15, fontWeight: '600', color: c.ink },
    drawerItemTextActive: { color: c.helper, fontWeight: '800' },
    hint: {
      fontSize: 12,
      color: c.muted,
      lineHeight: 17,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    badge: {
      backgroundColor: c.danger,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 22,
      alignItems: 'center',
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: c.dangerSoft,
      gap: 10,
      marginTop: 16,
    },
    logoutText: { color: c.danger, fontSize: 15, fontWeight: '700' },
  });
}

export function MobileMenu({
  isOpen,
  onClose,
  stats,
  handleLogout,
  notificationUnread = 0,
}: {
  isOpen: boolean;
  onClose: () => void;
  stats?: { applications?: number };
  handleLogout: () => void;
  notificationUnread?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createMobileMenuStyles(c), [c]);
  const { isWorkMode, activeHire } = useHelperWorkMode();
  const { unreadCount: hookUnread } = useNotifications('helper');
  const notif = notificationUnread ?? hookUnread;

  const workShell = isWorkMode && activeHire;
  const items: HelperNavItem[] = useMemo(
    () => (workShell ? getHelperWorkModeDrawerItems() : getHelperNonWorkMobileDrawerItems()),
    [workShell],
  );

  const slideAnim = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: -width, duration: 220, useNativeDriver: true }).start();
    }
  }, [isOpen, slideAnim]);

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backgroundTap} onPress={onClose} activeOpacity={1} accessibilityLabel="Close menu" />
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close menu">
              <Ionicons name="close" size={28} color={c.ink} />
            </TouchableOpacity>
          </View>

          <View style={styles.brandRow}>
            <CareLinkLogoMark size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>CareLink</Text>
              <Text style={styles.brandSub}>{workShell ? 'Work mode' : 'Helper portal'}</Text>
            </View>
          </View>

          {workShell ? (
            <Text style={styles.hint}>
              Use the bar below for Home, tasks, schedule, history, messages, and profile. This menu is for
              notifications and settings.
            </Text>
          ) : (
            <Text style={styles.hint}>
              Home, find jobs, applications, messages, and profile are on the bottom bar. Open this menu for
              saved jobs, notifications, and settings.
            </Text>
          )}

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.navLabel}>Menu</Text>
            {items.map((item) => {
              const active = isHelperNavActive(pathname, item.path);
              const count = item.useNotificationBadge ? notif : 0;
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[styles.drawerItem, active && styles.drawerItemActive]}
                  onPress={() => {
                    onClose();
                    router.push(item.path as never);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.drawerItemLeft}>
                    <Ionicons
                      name={helperNavIconName(item.baseIcon, active)}
                      size={22}
                      color={active ? c.helper : c.muted}
                    />
                    <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </View>
                  {count > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={22} color={c.danger} />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
