// MobileMenu.tsx
// Parent mobile drawer — same routes as web sidebar + native CareBot row; active states match nested routes

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
import { useParentTheme } from '@/contexts/ParentThemeContext';
import { useCareBot } from '@/contexts/CareBotContext';
import { useNotifications } from '@/hooks/shared';
import {
  getParentMobileDrawerNavRows,
  isParentNavActive,
  parentNavIconName,
  type ParentNavItem,
} from './parentPortalNav';

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
      backgroundColor: c.parentSoft,
      borderWidth: 1,
      borderColor: c.parent + '28',
      borderLeftWidth: 3,
      borderLeftColor: c.parent,
    },
    drawerItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    drawerItemText: { fontSize: 15, fontWeight: '600', color: c.ink },
    drawerItemTextActive: { color: c.parent, fontWeight: '800' },
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

function isRowActive(
  item: ParentNavItem | { carebot: true; baseIcon: string; label: string },
  pathname: string | null,
  carebotOpen: boolean,
): boolean {
  if ('carebot' in item && item.carebot) return carebotOpen;
  return isParentNavActive(pathname, (item as ParentNavItem).path);
}

export function MobileMenu({
  isOpen,
  onClose,
  handleLogout,
  notificationUnread,
}: {
  isOpen: boolean;
  onClose: () => void;
  handleLogout: () => void;
  /** Optional override; otherwise unread is read from notifications hook */
  notificationUnread?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { color: c } = useParentTheme();
  const styles = useMemo(() => createMobileMenuStyles(c), [c]);
  const { unreadCount: hookUnread } = useNotifications('parent');
  const unread = notificationUnread ?? hookUnread;
  const careBot = useCareBot();
  const navRows = useMemo(() => getParentMobileDrawerNavRows(), []);
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
              <Text style={styles.brandSub}>Parent Portal</Text>
            </View>
          </View>

          <Text style={styles.hint}>
            Here: Active Helpers, notifications, and settings — not duplicated from the bar. The bottom bar has Home,
            Find, Jobs, Applicants, Messages, and Profile.
          </Text>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.navLabel}>MENU</Text>
            {navRows.map((item) => {
              const key = 'carebot' in item && item.carebot ? 'carebot' : (item as ParentNavItem).path;
              const active = isRowActive(item, pathname, careBot.isOpen);
              const count =
                'path' in item && item.useNotificationBadge ? unread : 0;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.drawerItem, active && styles.drawerItemActive]}
                  onPress={() => {
                    onClose();
                    if ('carebot' in item && item.carebot) {
                      careBot.open();
                    } else {
                      router.push((item as ParentNavItem).path as never);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.drawerItemLeft}>
                    <Ionicons
                      name={parentNavIconName(item.baseIcon, active)}
                      size={22}
                      color={active ? c.parent : c.muted}
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
