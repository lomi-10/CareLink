import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar, MobileHeader, MobileMenu } from '@/components/helper/home';
import { WorkModeTabBar } from './WorkModeTabBar';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import { DARK, MUTED, ORANGE, ICON_BG, DIVIDER, SURFACE, PAGE_BG } from '@/components/helper/home/helperWarmTheme';

type Props = {
  children: React.ReactNode;
  /** Desktop-only page heading */
  desktopTitle: string;
  desktopSubtitle?: string;
};

export function WorkModeShell({ children, desktopTitle, desktopSubtitle }: Props) {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { unreadCount } = useNotifications('helper');

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const initiateLogout = () => {
    setMenuOpen(false);
    setConfirmLogout(true);
  };

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <Sidebar onLogout={initiateLogout} />
        <View style={styles.desktopMain}>
          <View style={styles.desktopTopBar}>
            <View>
              <Text style={styles.desktopTitle}>{desktopTitle}</Text>
              {desktopSubtitle ? (
                <Text style={styles.desktopSub}>{desktopSubtitle}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.notifBtn, unreadCount > 0 && styles.notifBtnActive]}
              onPress={() => router.push('/(helper)/notifications')}
            >
              <Ionicons
                name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                size={20}
                color={unreadCount > 0 ? ORANGE : MUTED}
              />
              {unreadCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: ORANGE }]}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
          {children}
        </View>
        <ConfirmationModal
          visible={confirmLogout}
          title="Log Out"
          message="Are you sure you want to log out?"
          confirmText="Log Out"
          cancelText="Cancel"
          type="danger"
          onConfirm={() => {
            setConfirmLogout(false);
            setSuccessLogout(true);
          }}
          onCancel={() => setConfirmLogout(false)}
        />
        <NotificationModal
          visible={successLogout}
          message="Logged Out Successfully!"
          type="success"
          autoClose
          duration={1500}
          onClose={() => {
            setSuccessLogout(false);
            handleLogout();
          }}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mobileRoot}>
      <MobileHeader
        onMenuPress={() => setMenuOpen(true)}
        subtitle="Work Mode"
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(helper)/notifications')}
      />
      <View style={styles.mobileBody}>{children}</View>
      <WorkModeTabBar />
      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        handleLogout={initiateLogout}
        notificationUnread={unreadCount}
      />
      <ConfirmationModal
        visible={confirmLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          setConfirmLogout(false);
          setSuccessLogout(true);
        }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout}
        message="Logged Out Successfully!"
        type="success"
        autoClose
        duration={1500}
        onClose={() => {
          setSuccessLogout(false);
          handleLogout();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: PAGE_BG },
  desktopMain: { flex: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 16 },
  desktopTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  desktopTitle: { fontSize: 24, fontWeight: '900', color: DARK, letterSpacing: -0.4 },
  desktopSub: { fontSize: 13, color: MUTED, marginTop: 4 },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  notifBtnActive: {
    backgroundColor: ICON_BG,
    borderColor: ORANGE + '40',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  mobileRoot: { flex: 1, backgroundColor: PAGE_BG },
  mobileBody: { flex: 1 },
});
