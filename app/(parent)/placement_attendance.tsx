import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useResponsive } from '@/hooks/shared';
import { Sidebar } from '@/components/parent/home';
import { theme } from '@/constants/theme';
import { fetchAttendanceWeek, type AttendanceDay } from '@/lib/attendanceApi';
import {
  addDaysYmd,
  mondayOfWeekContaining,
  ymdLocal,
} from '@/lib/helperWorkApi';
import { attendanceDotBackground } from '@/lib/attendanceUi';
import { ConfirmationModal, NotificationModal } from '@/components/shared';

export default function PlacementAttendanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    application_id?: string;
    helper_name?: string;
  }>();
  const applicationId = params.application_id ? Number(params.application_id) : 0;
  const helperName = params.helper_name ? decodeURIComponent(params.helper_name) : 'Helper';

  const { isDesktop } = useResponsive();
  const { userData, handleLogout } = useAuth();
  const parentId = userData ? Number(userData.user_id) : 0;

  const [anchorMonday, setAnchorMonday] = useState(() => mondayOfWeekContaining(ymdLocal()));
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const load = useCallback(async () => {
    if (!applicationId || !parentId) return;
    setLoading(true);
    try {
      const res = await fetchAttendanceWeek(applicationId, parentId, 'parent', anchorMonday);
      if (res.success && res.days) setDays(res.days);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [applicationId, parentId, anchorMonday]);

  useEffect(() => {
    if (applicationId && parentId) void load();
  }, [applicationId, parentId, load]);

  const thisWeekMon = mondayOfWeekContaining(ymdLocal());
  const todayYmd = ymdLocal();
  const goPrev = () => setAnchorMonday((m) => addDaysYmd(m, -7));
  const goNext = () => setAnchorMonday((m) => addDaysYmd(m, 7));

  const headerBlock = (
    <View style={styles.pageHead}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={theme.color.parent} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.pageTitle}>Attendance</Text>
        <Text style={styles.pageSub}>{helperName}</Text>
      </View>
    </View>
  );

  const weekNav = (
    <View style={styles.weekNav}>
      <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
        <Ionicons name="chevron-back" size={22} color={theme.color.parent} />
      </TouchableOpacity>
      <Text style={styles.weekLabel}>
        Week of {anchorMonday}
        {anchorMonday === thisWeekMon ? ' · This week' : ''}
      </Text>
      <TouchableOpacity onPress={goNext} style={styles.navBtn}>
        <Ionicons name="chevron-forward" size={22} color={theme.color.parent} />
      </TouchableOpacity>
    </View>
  );

  const legend = (
    <View style={styles.legendRow}>
      <LegendDot color={theme.color.success} label="Present" />
      <LegendDot color={theme.color.line} label="Absent" />
      <LegendDot color={theme.color.warning} label="Leave" />
      <LegendDot color="#9333EA" label="Holiday" />
    </View>
  );

  const grid = (
    <View style={styles.gridRow}>
      {days.map((d) => {
        const isToday = d.date === todayYmd;
        const dot = attendanceDotBackground(d.status, d.checked_in);
        return (
          <View key={d.date} style={[styles.gridCell, isToday && styles.gridCellToday]}>
            <Text style={styles.gridWeekday}>{d.weekday}</Text>
            <Text style={styles.gridDate}>{d.date.slice(5)}</Text>
            <View style={[styles.gridDot, { backgroundColor: dot }]} />
            <Text style={styles.gridStatus} numberOfLines={1}>
              {labelForDay(d)}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const body = (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      contentContainerStyle={styles.scrollContent}
    >
      {weekNav}
      {legend}
      {loading && days.length === 0 ? (
        <ActivityIndicator color={theme.color.parent} style={{ marginTop: 24 }} />
      ) : (
        grid
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

function labelForDay(d: AttendanceDay): string {
  if (d.checked_in) return 'Present';
  if (d.status === 'leave') return 'Leave';
  if (d.status === 'holiday') return 'Holiday';
  return 'Absent';
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
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
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.color.parentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: { fontSize: 15, fontWeight: '800', color: theme.color.ink },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '600', color: theme.color.muted },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderRadius: 12,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
    minWidth: 0,
  },
  gridCellToday: {
    borderColor: theme.color.parent,
    borderWidth: 2,
  },
  gridWeekday: { fontSize: 11, fontWeight: '800', color: theme.color.muted },
  gridDate: { fontSize: 10, color: theme.color.muted, marginTop: 2 },
  gridDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 8,
    marginBottom: 6,
  },
  gridStatus: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.color.ink,
    textAlign: 'center',
  },
});
