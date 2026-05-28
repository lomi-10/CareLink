// components/parent/home/Sidebar.tsx
// Parent desktop sidebar — web: shadow, full-height, Pressable hover, left accent on active
// Native: same nav + optional CareBot row (web uses CareBot fab instead)

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { theme, type ThemeColor } from '@/constants/theme';
import { useParentTheme } from '@/contexts/ParentThemeContext';
import { useCareBot } from '@/contexts/CareBotContext';
import { useNotifications } from '@/hooks/shared';
import {
  getParentNavRowsForShell,
  isParentNavActive,
  parentNavIconName,
  type ParentNavItem,
} from './parentPortalNav';

function createParentSidebarStyles(c: ThemeColor) {
  return StyleSheet.create({
    container: {
      width: 260,
      minHeight: Platform.OS === 'web' ? ('100vh' as never) : undefined,
      backgroundColor: c.surfaceElevated,
      borderRightWidth: 1,
      borderRightColor: c.line,
      paddingVertical: 24,
      justifyContent: 'space-between',
      ...Platform.select({
        web: {
          boxShadow: '2px 0 24px rgba(15, 23, 42, 0.08)',
        },
        default: {},
      }),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 28,
      gap: 12,
    },
    logoText: { fontSize: 18, fontWeight: '800', color: c.ink },
    logoSubtext: { fontSize: 11, color: c.muted, fontWeight: '600', marginTop: 1 },

    nav: { flex: 1, paddingHorizontal: 12 },
    navLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: c.subtle,
      marginBottom: 10,
      marginLeft: 12,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 11,
      paddingLeft: 14,
      paddingRight: 14,
      borderRadius: 12,
      marginBottom: 4,
      position: 'relative',
    },
    navItemActive: {
      backgroundColor: c.parentSoft,
      borderWidth: 1,
      borderColor: c.parent + '2E',
      borderLeftWidth: 3,
      borderLeftColor: c.parent,
      paddingLeft: 12,
      ...Platform.select({
        web: { boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)' } as object,
        default: { ...theme.shadow.nav },
      }),
    },
    /** Web hover only (see Pressable `hovered`) */
    navItemHover: {
      backgroundColor: 'rgba(15, 23, 42, 0.05)',
    },
    navItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    navItemText: { fontSize: 14, fontWeight: '500', color: c.muted },
    navItemTextActive: { color: c.parent, fontWeight: '800' },

    badge: {
      backgroundColor: c.danger,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 20,
      alignItems: 'center',
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

    activeBar: {
      position: 'absolute',
      right: 0,
      top: '50%',
      marginTop: -10,
      width: 3,
      height: 20,
      backgroundColor: c.parent,
      borderTopLeftRadius: 3,
      borderBottomLeftRadius: 3,
    },

    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: 20,
      marginHorizontal: 12,
      borderRadius: 10,
      backgroundColor: c.dangerSoft,
      gap: 10,
    },
    logoutText: { color: c.danger, fontSize: 14, fontWeight: '700' },
  });
}

interface SidebarProps {
  onLogout: () => void;
}

function isItemActive(
  item: ParentNavItem | { carebot: true; baseIcon: string; label: string },
  pathname: string | null,
  carebotOpen: boolean,
): boolean {
  if ('carebot' in item && item.carebot) return carebotOpen;
  return isParentNavActive(pathname, (item as ParentNavItem).path);
}

export function Sidebar({ onLogout }: SidebarProps) {
  const { color: c } = useParentTheme();
  const styles = useMemo(() => createParentSidebarStyles(c), [c]);
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications('parent');
  const careBot = useCareBot();
  const navRows = useMemo(() => getParentNavRowsForShell(), []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CareLinkLogoMark size={44} />
        <View>
          <Text style={styles.logoText}>CareLink</Text>
          <Text style={styles.logoSubtext}>Parent Portal</Text>
        </View>
      </View>

      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        <Text style={styles.navLabel}>MAIN MENU</Text>
        {navRows.map((item) => {
          const key = 'carebot' in item && item.carebot ? 'carebot' : (item as ParentNavItem).path;
          const active = isItemActive(item, pathname, careBot.isOpen);
          const count =
            'path' in item && item.useNotificationBadge ? unreadCount : 0;
          return (
            <Pressable
              key={key}
              onPress={() => {
                if ('carebot' in item && item.carebot) {
                  careBot.open();
                } else {
                  router.push((item as ParentNavItem).path as never);
                }
              }}
              style={({ pressed, hovered }) => [
                styles.navItem,
                active && styles.navItemActive,
                !active && Platform.OS === 'web' && hovered && styles.navItemHover,
                Platform.OS === 'web' && pressed && { opacity: 0.92 },
              ]}
            >
              <View style={styles.navItemContent}>
                <Ionicons
                  name={parentNavIconName(
                    item.baseIcon,
                    active,
                  )}
                  size={20}
                  color={active ? c.parent : c.muted}
                />
                <Text style={[styles.navItemText, active && styles.navItemTextActive]}>
                  {item.label}
                </Text>
              </View>

              {count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {count > 9 ? '9+' : count}
                  </Text>
                </View>
              )}

              {active ? <View style={styles.activeBar} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          Platform.OS === 'web' && pressed && { opacity: 0.9 },
        ]}
        onPress={onLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={c.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}
