import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useResponsive } from '@/hooks/shared';
import { Sidebar } from '@/components/parent/home';
import { theme } from '@/constants/theme';
import {
  fetchLeaveRequests,
  respondToLeaveRequest,
  type LeaveRequestRow,
} from '@/lib/leaveRequestsApi';
import { ConfirmationModal, NotificationModal } from '@/components/shared';

export default function PlacementLeaveRequestsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    application_id?: string;
    helper_name?: string;
  }>();
  const applicationId = params.application_id ? Number(params.application_id) : 0;
  const defaultHelperName = params.helper_name ? decodeURIComponent(params.helper_name) : 'Helper';

  const { isDesktop } = useResponsive();
  const { userData, handleLogout } = useAuth();
  const parentId = userData ? Number(userData.user_id) : 0;

  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const load = useCallback(async () => {
    if (!applicationId || !parentId) return;
    setLoading(true);
    try {
      const res = await fetchLeaveRequests(applicationId, parentId, 'parent');
      if (res.success && res.data) setRows(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [applicationId, parentId]);

  useEffect(() => {
    if (applicationId && parentId) void load();
  }, [applicationId, parentId, load]);

  const { pending, history } = useMemo(() => {
    const p = rows.filter((r) => r.status === 'pending');
    const h = rows.filter((r) => r.status !== 'pending');
    return { pending: p, history: h };
  }, [rows]);

  const onRespond = async (id: number, status: 'approved' | 'declined') => {
    setBusyId(id);
    try {
      const res = await respondToLeaveRequest(id, parentId, status);
      if (!res.success) {
        Alert.alert('Leave request', res.message || 'Could not update');
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const headerBlock = (
    <View style={styles.pageHead}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={theme.color.parent} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.pageTitle}>Leave requests</Text>
        <Text style={styles.pageSub}>{defaultHelperName}</Text>
      </View>
    </View>
  );

  const renderCard = (r: LeaveRequestRow, showActions: boolean) => {
    const name = r.helper_name || defaultHelperName;
    const busy = busyId === r.id;
    return (
      <View key={r.id} style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardDate}>{formatDisplayDate(r.date)}</Text>
          <View style={[styles.badge, badgeStyle(r.status)]}>
            <Text style={[styles.badgeText, badgeTextStyle(r.status)]}>{r.status}</Text>
          </View>
        </View>
        <Text style={styles.cardHelper}>{name}</Text>
        {r.reason ? <Text style={styles.cardReason}>{r.reason}</Text> : <Text style={styles.cardNoReason}>No reason given</Text>}
        {showActions ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.declineBtn]}
              onPress={() => onRespond(r.id, 'declined')}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={theme.color.danger} size="small" />
              ) : (
                <Text style={styles.declineText}>Decline</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.approveBtn]}
              onPress={() => onRespond(r.id, 'approved')}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.approveText}>Approve</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : r.responded_at ? (
          <Text style={styles.respondedMeta}>Responded {formatDisplayDateTime(r.responded_at)}</Text>
        ) : null}
      </View>
    );
  };

  const body = (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      contentContainerStyle={styles.scrollContent}
    >
      {loading && rows.length === 0 ? (
        <ActivityIndicator color={theme.color.parent} style={{ marginTop: 24 }} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Pending</Text>
          {pending.length === 0 ? (
            <Text style={styles.emptySection}>No pending requests.</Text>
          ) : (
            pending.map((r) => renderCard(r, true))
          )}
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>History</Text>
          {history.length === 0 ? (
            <Text style={styles.emptySection}>No past requests yet.</Text>
          ) : (
            history.map((r) => renderCard(r, false))
          )}
        </>
      )}
    </ScrollView>
  );

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

  if (!applicationId) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.empty}>Missing application.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkBack}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <Sidebar onLogout={() => setConfirmLogout(true)} />
        <View style={styles.desktopMain}>
          {headerBlock}
          {body}
        </View>
        {modals}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mobileRoot} edges={['top']}>
      {headerBlock}
      <View style={{ flex: 1, minHeight: 0 }}>{body}</View>
      {modals}
    </SafeAreaView>
  );
}

function formatDisplayDate(ymd: string) {
  try {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return ymd;
  }
}

function formatDisplayDateTime(iso: string) {
  try {
    return new Date(iso.replace(' ', 'T')).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function badgeStyle(status: string) {
  if (status === 'pending') return { backgroundColor: theme.color.warningSoft };
  if (status === 'approved') return { backgroundColor: theme.color.successSoft };
  return { backgroundColor: theme.color.dangerSoft };
}

function badgeTextStyle(status: string) {
  if (status === 'pending') return { color: theme.color.warning };
  if (status === 'approved') return { color: theme.color.success };
  return { color: theme.color.danger };
}

const styles = StyleSheet.create({
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: theme.color.canvasParent },
  desktopMain: { flex: 1, padding: 24 },
  mobileRoot: { flex: 1, backgroundColor: theme.color.canvasParent },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  linkBack: { marginTop: 12, color: theme.color.parent, fontWeight: '700' },
  empty: { textAlign: 'center', color: theme.color.muted },
  pageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 22, fontWeight: '900', color: theme.color.ink },
  pageSub: { fontSize: 14, color: theme.color.muted, marginTop: 2 },
  scrollContent: { paddingBottom: 32 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.color.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionTitleSpaced: { marginTop: 20 },
  emptySection: { fontSize: 14, color: theme.color.muted, marginBottom: 8 },
  card: {
    borderRadius: 14,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { fontSize: 16, fontWeight: '800', color: theme.color.ink },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  cardHelper: { fontSize: 14, fontWeight: '700', color: theme.color.parent, marginBottom: 6 },
  cardReason: { fontSize: 14, color: theme.color.ink, lineHeight: 20 },
  cardNoReason: { fontSize: 14, color: theme.color.muted, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    backgroundColor: theme.color.dangerSoft,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  declineText: { fontSize: 15, fontWeight: '800', color: theme.color.danger },
  approveBtn: { backgroundColor: theme.color.parent },
  approveText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  respondedMeta: { fontSize: 12, color: theme.color.muted, marginTop: 10, fontWeight: '600' },
});
