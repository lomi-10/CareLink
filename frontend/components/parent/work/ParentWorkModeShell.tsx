import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MobileHeader } from '@/components/helper/home';
import { MobileMenu } from '@/components/parent/home';
import { ParentTopNav, type ParentNavKey } from '@/components/parent/web/ParentTopNav';
import { ParentWorkModeTabBar } from '@/components/parent/home/ParentWorkModeTabBar';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useAuth, useNotifications, useResponsive } from '@/hooks/shared';
import { useParentProfile } from '@/hooks/parent';
import { BG, BG_WEB, BROWN } from '@/components/parent/home/parentWarmTheme';

type Props = {
  children: React.ReactNode;
  active: ParentNavKey;
  title: string;
  subtitle: string;
};

export function ParentWorkModeShell({ children, active, title, subtitle }: Props) {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout, getFullName } = useAuth();
  const { unreadCount } = useNotifications('parent');
  const { profileData } = useParentProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const initiateLogout = () => {
    setMenuOpen(false);
    setConfirmLogout(true);
  };

  const modals = (
    <>
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
    </>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <ParentTopNav
          active={active}
          mode="work"
          userName={getFullName()}
          avatar={(profileData?.profile?.profile_image as string) ?? null}
          verified={profileData?.profile?.verification_status === 'Verified'}
          onLogout={initiateLogout}
        />
        <View style={styles.desktopMain}>
          <View style={styles.heading}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>
          {children}
        </View>
        {modals}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mobileRoot}>
      <MobileHeader
        onMenuPress={() => setMenuOpen(true)}
        subtitle="Work Mode"
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(parent)/notifications')}
      />
      <View style={styles.mobileBody}>
        <View style={styles.mobileHeading}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {children}
      </View>
      <ParentWorkModeTabBar />
      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        handleLogout={initiateLogout}
        notificationUnread={unreadCount}
      />
      {modals}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  desktopRoot: { flex: 1, backgroundColor: BG_WEB },
  desktopMain: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 20 },
  heading: { marginBottom: 14 },
  title: { color: BROWN, fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#796B5B', fontSize: 13, marginTop: 4 },
  mobileRoot: { flex: 1, backgroundColor: BG },
  mobileBody: { flex: 1 },
  mobileHeading: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
});
