import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MobileHeader, MobileMenu } from '@/components/helper/home';
import { HelperTopNav } from '@/components/helper/web/HelperTopNav';
import { WorkModeTabBar } from './WorkModeTabBar';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import { useHelperProfile } from '@/hooks/helper';
import { PAGE_BG } from '@/components/helper/home/helperWarmTheme';

type Props = {
  children: React.ReactNode;
  /** Desktop-only page heading */
  desktopTitle: string;
  desktopSubtitle?: string;
};

export function WorkModeShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { isDesktop } = useResponsive();
  const { handleLogout, getFullName } = useAuth();
  const { unreadCount } = useNotifications('helper');
  const { profileData } = useHelperProfile();

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const initiateLogout = () => {
    setMenuOpen(false);
    setConfirmLogout(true);
  };

  const activeNav = pathname.includes('/work/tasks') ? 'mywork' : pathname.includes('/work') ? 'schedule' : 'home';

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <HelperTopNav
          workMode
          active={activeNav}
          userName={getFullName()}
          avatar={(profileData?.profile?.profile_image as string) ?? null}
          verified={profileData?.profile?.verification_status === 'Verified'}
          onLogout={initiateLogout}
        />
        <View style={styles.desktopMain}>
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
  // Column layout: full-width top nav, then centered content (no left sidebar).
  desktopRoot: { flex: 1, backgroundColor: PAGE_BG },
  desktopMain: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 16 },
  mobileRoot: { flex: 1, backgroundColor: PAGE_BG },
  mobileBody: { flex: 1 },
});
