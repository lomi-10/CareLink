// app/(parent)/hire/WorkModeHelpersScreen.tsx
// Parent Work Mode — Helper Management (roster). Payroll totals and the
// "needs attention" list already live on Work Home, so this screen stays
// focused on one job: here are your helpers, tap one to manage them (the
// 3-tab Overview / Attendance / Payroll detail). No duplicate hero or stat
// grid — just a calm, compact list.
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, DARK, MUTED, SUBTLE, DIVIDER, ICON_BG, GREEN, SURFACE,
} from '@/components/parent/home/parentWarmTheme';
import { ParentWorkModeTabBar, MobileMenu } from '@/components/parent/home';
import { ParentTopNav } from '@/components/parent/web/ParentTopNav';
import { MobileHeader } from '@/components/helper/home';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useParentWorkDashboard, type PlacementDashData } from '@/hooks/parent/useParentWorkDashboard';
import { useParentProfile } from '@/hooks/parent/useParentProfile';
import { useAuth, useNotifications, useResponsive } from '@/hooks/shared';

// ── Utils ────────────────────────────────────────────────────────────────
function formatTime(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
}
function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

// ── Compact helper row ──────────────────────────────────────────────────
function HelperRow({ data, onPress }: { data: PlacementDashData; onPress: () => void }) {
  const { placement, checkedIn, checkInAt, tasksTotal, tasksDone } = data;
  const initials = getInitials(placement.helper_name);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.row}>
      <View style={s.photoWrap}>
        {placement.helper_photo ? (
          <Image source={{ uri: placement.helper_photo }} style={s.photo} contentFit="cover" />
        ) : (
          <View style={[s.photo, s.photoFb]}><Text style={s.photoText}>{initials}</Text></View>
        )}
        <View style={[s.checkDot, { backgroundColor: checkedIn ? GREEN : SUBTLE }]} />
      </View>

      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <Text style={s.name} numberOfLines={1}>{placement.helper_name}</Text>
        <Text style={s.role} numberOfLines={1}>{placement.job_title}</Text>
        <Text style={s.checkText} numberOfLines={1}>
          {checkedIn ? `Checked in${checkInAt ? ` · ${formatTime(checkInAt)}` : ''}` : 'Not checked in'}
          {tasksTotal > 0 ? `  ·  ${tasksDone}/${tasksTotal} tasks` : ''}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={SUBTLE} />
    </TouchableOpacity>
  );
}

type SortKey = 'checkin' | 'name';

function HelperList({ perPlacement, loading, onOpen }: {
  perPlacement: PlacementDashData[]; loading: boolean; onOpen: (p: PlacementDashData) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('checkin');

  const sorted = useMemo(() => {
    const arr = [...perPlacement];
    if (sortKey === 'name') arr.sort((a, b) => a.placement.helper_name.localeCompare(b.placement.helper_name));
    else arr.sort((a, b) => (b.checkedIn ? 1 : 0) - (a.checkedIn ? 1 : 0));
    return arr;
  }, [perPlacement, sortKey]);

  return (
    <>
      <Text style={s.lead}>Tap a helper to manage their tasks, attendance and payroll.</Text>

      <View style={s.headRow}>
        <Text style={s.count}>{perPlacement.length} active helper{perPlacement.length !== 1 ? 's' : ''}</Text>
        {perPlacement.length > 1 && (
          <TouchableOpacity style={s.sortToggle} onPress={() => setSortKey(k => k === 'checkin' ? 'name' : 'checkin')} activeOpacity={0.8}>
            <Ionicons name="swap-vertical-outline" size={13} color={BROWN} />
            <Text style={s.sortToggleText}>Sort: {sortKey === 'checkin' ? 'Check-in' : 'Name'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && sorted.length === 0 ? (
        <ActivityIndicator color={BROWN} style={{ marginTop: 24 }} />
      ) : sorted.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="people-outline" size={30} color={MUTED} />
          <Text style={s.emptyText}>No active helpers yet</Text>
          <Text style={s.emptySub}>Hire a helper from the recruitment portal to see them here.</Text>
        </View>
      ) : (
        sorted.map(pd => <HelperRow key={pd.placement.application_id} data={pd} onPress={() => onOpen(pd)} />)
      )}
    </>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────
export function WorkModeHelpersScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout, getFullName } = useAuth();
  const { profileData } = useParentProfile();
  const { unreadCount } = useNotifications('parent');
  const { perPlacement, loading, refresh } = useParentWorkDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  }, [refresh]);

  const openHelper = (pd: PlacementDashData) => {
    router.push({
      pathname: '/(parent)/hire/helper_profile' as never,
      params: {
        application_id: String(pd.placement.application_id),
        helper_id: String(pd.placement.helper_id),
        helper_name: encodeURIComponent(pd.placement.helper_name),
        helper_photo: pd.placement.helper_photo ? encodeURIComponent(pd.placement.helper_photo) : '',
        job_title: encodeURIComponent(pd.placement.job_title),
        status: encodeURIComponent(pd.placement.status),
        salary_offered: String(pd.placement.salary_offered ?? ''),
        salary_period: encodeURIComponent(pd.placement.salary_period ?? ''),
        helper_phone: pd.placement.helper_phone ? encodeURIComponent(pd.placement.helper_phone) : '',
      },
    });
  };

  const initiateLogout = () => { setMenuOpen(false); setConfirmLogout(true); };

  const modals = (
    <>
      <ConfirmationModal
        visible={confirmLogout} title="Log Out" message="Are you sure you want to log out?"
        confirmText="Log Out" cancelText="Cancel" type="danger"
        onConfirm={() => { setConfirmLogout(false); setSuccessLogout(true); }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout} message="Logged out successfully" type="success" autoClose duration={1500}
        onClose={() => { setSuccessLogout(false); handleLogout(); }}
      />
    </>
  );

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <ParentTopNav
          mode="work"
          active="helpers"
          userName={getFullName()}
          avatar={(profileData?.profile?.profile_image as string) ?? null}
          verified={profileData?.profile?.verification_status === 'Verified'}
          onLogout={initiateLogout}
        />
        <ScrollView contentContainerStyle={s.desktopScroll} showsVerticalScrollIndicator={false}>
          <View style={s.desktopInner}>
            <Text style={s.pageTitle}>Helper Management</Text>
            <HelperList perPlacement={perPlacement} loading={loading} onOpen={openHelper} />
          </View>
        </ScrollView>
        {modals}
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <MobileHeader
        onMenuPress={() => setMenuOpen(true)}
        subtitle="Helper Management"
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(parent)/notifications')}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BROWN} />}
        showsVerticalScrollIndicator={false}
      >
        <HelperList perPlacement={perPlacement} loading={loading} onOpen={openHelper} />
      </ScrollView>

      <ParentWorkModeTabBar />
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} handleLogout={initiateLogout} notificationUnread={unreadCount} />
      {modals}
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  desktopScroll: { paddingBottom: 60 },
  desktopInner: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24 },
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: DARK, marginBottom: 6 },

  lead: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, marginBottom: 14, lineHeight: 19 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  count: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  sortToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: ICON_BG, borderRadius: 10, borderWidth: 1, borderColor: DIVIDER },
  sortToggleText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: BROWN },

  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE,
    borderRadius: 16, padding: 13, borderWidth: 1, borderColor: DIVIDER, marginBottom: 9,
  },
  photoWrap: { position: 'relative' },
  photo: { width: 50, height: 50, borderRadius: 25 },
  photoFb: { backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  photoText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: BROWN },
  checkDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: SURFACE },
  name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  role: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginTop: 1 },
  checkText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: MUTED, marginTop: 3 },

  emptyCard: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 8, borderRadius: 16, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER },
  emptyText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: MUTED },
  emptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: SUBTLE, textAlign: 'center', lineHeight: 18 },
});
