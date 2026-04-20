import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  Alert,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useResponsive } from '@/hooks/shared';
import { Sidebar } from '@/components/parent/home';
import { theme } from '@/constants/theme';
import {
  fetchAttendanceWeek,
  fetchAttendanceMonth,
  postContractSpecialDays,
  formatAttendanceTime,
  type AttendanceDay,
  type AttendanceMonthSummary,
  type AttendanceSpecialDay,
} from '@/lib/attendanceApi';
import { monthOverlapsContract } from '@/lib/contractAttendanceNav';
import { addDaysYmd, mondayOfWeekContaining, ymdLocal } from '@/lib/helperWorkApi';
import { attendanceDayCellType, attendanceCalendarCellStyle } from '@/lib/attendanceUi';
import { AttendanceCalendarGrid } from '@/components/shared/AttendanceCalendarGrid';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { LeaveRequestsPanel } from '@/components/parent/LeaveRequestsPanel';

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

  const now = useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  const [anchorMonday, setAnchorMonday] = useState(() => mondayOfWeekContaining(ymdLocal()));
  const [weekDays, setWeekDays] = useState<AttendanceDay[]>([]);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthDays, setMonthDays] = useState<AttendanceDay[]>([]);
  const [monthSummary, setMonthSummary] = useState<AttendanceMonthSummary | null>(null);
  const [specialDays, setSpecialDays] = useState<AttendanceSpecialDay[]>([]);

  const [loading, setLoading] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const [detailDay, setDetailDay] = useState<AttendanceDay | null>(null);

  const [specOpen, setSpecOpen] = useState(false);
  const [specDate, setSpecDate] = useState(ymdLocal());
  const [specType, setSpecType] = useState<'holiday' | 'no_work'>('holiday');
  const [specNote, setSpecNote] = useState('');
  const [specSaving, setSpecSaving] = useState(false);

  const [contractStart, setContractStart] = useState<string | null>(null);
  const [contractEnd, setContractEnd] = useState<string | null>(null);

  const loadWeek = useCallback(async () => {
    if (!applicationId || !parentId) return;
    const res = await fetchAttendanceWeek(applicationId, parentId, 'parent', anchorMonday);
    if (res.success && res.days) setWeekDays(res.days);
    if (res.success) {
      if (res.employment_start_date !== undefined) setContractStart(res.employment_start_date ?? null);
      if (res.employment_end_date !== undefined) setContractEnd(res.employment_end_date ?? null);
    }
  }, [applicationId, parentId, anchorMonday]);

  const loadMonth = useCallback(async () => {
    if (!applicationId || !parentId) return;
    const res = await fetchAttendanceMonth(applicationId, parentId, 'parent', year, month);
    if (res.success && res.days) {
      setMonthDays(res.days);
      if (res.summary) setMonthSummary(res.summary);
      if (res.special_days) setSpecialDays(res.special_days);
    }
    if (res.success) {
      if (res.employment_start_date !== undefined) setContractStart(res.employment_start_date ?? null);
      if (res.employment_end_date !== undefined) setContractEnd(res.employment_end_date ?? null);
    }
  }, [applicationId, parentId, year, month]);

  const load = useCallback(async () => {
    if (!applicationId || !parentId) return;
    setLoading(true);
    try {
      if (viewMode === 'week') {
        await loadWeek();
      } else {
        await loadMonth();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [applicationId, parentId, viewMode, loadWeek, loadMonth]);

  useEffect(() => {
    if (applicationId && parentId) void load();
  }, [applicationId, parentId, load]);

  useEffect(() => {
    if (!contractStart && !contractEnd) return;
    setAnchorMonday((cur) => {
      const sun = addDaysYmd(cur, 6);
      if (contractStart && sun < contractStart) return mondayOfWeekContaining(contractStart);
      if (contractEnd && cur > contractEnd) return mondayOfWeekContaining(contractEnd);
      return cur;
    });
  }, [contractStart, contractEnd]);

  useEffect(() => {
    if (viewMode !== 'month' || (!contractStart && !contractEnd)) return;
    if (!monthOverlapsContract(year, month, contractStart, contractEnd)) {
      if (contractStart) {
        const [yy, mm] = contractStart.split('-').map(Number);
        setYear(yy);
        setMonth(mm);
      } else if (contractEnd) {
        const [yy, mm] = contractEnd.split('-').map(Number);
        setYear(yy);
        setMonth(mm);
      }
    }
  }, [viewMode, contractStart, contractEnd]);

  const todayYmd = ymdLocal();
  const thisWeekMon = mondayOfWeekContaining(todayYmd);
  const prevWeekMonday = addDaysYmd(anchorMonday, -7);
  const prevWeekSunday = addDaysYmd(prevWeekMonday, 6);
  const canPrevWeek = !contractStart || prevWeekSunday >= contractStart;
  const nextWeekMonday = addDaysYmd(anchorMonday, 7);
  const canNextWeek = !contractEnd || nextWeekMonday <= contractEnd;

  const goPrevWeek = () => {
    if (!canPrevWeek) return;
    setAnchorMonday((m) => addDaysYmd(m, -7));
  };
  const goNextWeek = () => {
    if (!canNextWeek) return;
    setAnchorMonday((m) => addDaysYmd(m, 7));
  };

  const goPrevMonth = () => {
    let nm = month - 1;
    let ny = year;
    if (nm < 1) {
      nm = 12;
      ny -= 1;
    }
    if (!monthOverlapsContract(ny, nm, contractStart, contractEnd)) return;
    setMonth(nm);
    setYear(ny);
  };

  const goNextMonth = () => {
    let nm = month + 1;
    let ny = year;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    if (!monthOverlapsContract(ny, nm, contractStart, contractEnd)) return;
    setMonth(nm);
    setYear(ny);
  };

  const saveSpecialDay = async () => {
    if (!applicationId || !parentId) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(specDate)) {
      Alert.alert('Schedule', 'Use a valid date (YYYY-MM-DD).');
      return;
    }
    if (contractStart && specDate < contractStart) {
      Alert.alert('Schedule', `Pick a date on or after the contract start (${contractStart}).`);
      return;
    }
    if (contractEnd && specDate > contractEnd) {
      Alert.alert('Schedule', `Pick a date on or before the contract end (${contractEnd}).`);
      return;
    }
    setSpecSaving(true);
    try {
      const next: AttendanceSpecialDay[] = [
        ...specialDays.filter((s) => s.date !== specDate),
        { date: specDate, type: specType, note: specNote.trim() || null },
      ].sort((a, b) => a.date.localeCompare(b.date));
      const res = await postContractSpecialDays(applicationId, parentId, next);
      if (!res.success) {
        Alert.alert('Schedule', res.message || 'Could not save');
        return;
      }
      setSpecialDays(res.special_days ?? next);
      setSpecOpen(false);
      setSpecNote('');
      await loadMonth();
    } finally {
      setSpecSaving(false);
    }
  };

  const removeSpecialDay = async (date: string) => {
    if (!applicationId || !parentId) return;
    const next = specialDays.filter((s) => s.date !== date);
    setSpecSaving(true);
    try {
      const res = await postContractSpecialDays(applicationId, parentId, next);
      if (!res.success) {
        Alert.alert('Schedule', res.message || 'Could not save');
        return;
      }
      setSpecialDays(res.special_days ?? next);
      await loadMonth();
    } finally {
      setSpecSaving(false);
    }
  };

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

  const modeToggle = (
    <View style={styles.toggleRow}>
      <TouchableOpacity
        style={[styles.toggleBtn, viewMode === 'week' && styles.toggleBtnOn]}
        onPress={() => setViewMode('week')}
      >
        <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextOn]}>Weekly</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleBtn, viewMode === 'month' && styles.toggleBtnOn]}
        onPress={() => setViewMode('month')}
      >
        <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextOn]}>Monthly</Text>
      </TouchableOpacity>
    </View>
  );

  const weekNav = (
    <View style={styles.weekNav}>
      <TouchableOpacity
        onPress={goPrevWeek}
        style={[styles.navBtn, !canPrevWeek && styles.navBtnDisabled]}
        disabled={!canPrevWeek}
      >
        <Ionicons name="chevron-back" size={22} color={canPrevWeek ? theme.color.parent : theme.color.subtle} />
      </TouchableOpacity>
      <Text style={styles.weekLabel}>
        Week of {anchorMonday}
        {anchorMonday === thisWeekMon ? ' · This week' : ''}
      </Text>
      <TouchableOpacity
        onPress={goNextWeek}
        style={[styles.navBtn, !canNextWeek && styles.navBtnDisabled]}
        disabled={!canNextWeek}
      >
        <Ionicons name="chevron-forward" size={22} color={canNextWeek ? theme.color.parent : theme.color.subtle} />
      </TouchableOpacity>
    </View>
  );

  const canPrevMonth = (() => {
    let nm = month - 1;
    let ny = year;
    if (nm < 1) {
      nm = 12;
      ny -= 1;
    }
    return monthOverlapsContract(ny, nm, contractStart, contractEnd);
  })();
  const canNextMonth = (() => {
    let nm = month + 1;
    let ny = year;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    return monthOverlapsContract(ny, nm, contractStart, contractEnd);
  })();

  const monthNav = (
    <View style={styles.weekNav}>
      <TouchableOpacity
        onPress={goPrevMonth}
        style={[styles.navBtn, !canPrevMonth && styles.navBtnDisabled]}
        disabled={!canPrevMonth}
      >
        <Ionicons name="chevron-back" size={22} color={canPrevMonth ? theme.color.parent : theme.color.subtle} />
      </TouchableOpacity>
      <Text style={styles.weekLabel}>
        {new Date(year, month - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
      </Text>
      <TouchableOpacity
        onPress={goNextMonth}
        style={[styles.navBtn, !canNextMonth && styles.navBtnDisabled]}
        disabled={!canNextMonth}
      >
        <Ionicons name="chevron-forward" size={22} color={canNextMonth ? theme.color.parent : theme.color.subtle} />
      </TouchableOpacity>
    </View>
  );

  const legend = (
    <View style={styles.legendRow}>
      <LegendDot color="#22C55E" label="Present" />
      <LegendDot color="#A855F7" label="Rest" />
      <LegendDot color="#EAB308" label="Leave" />
      <LegendDot color="#9CA3AF" label="Absent" />
      <LegendDot color="#EA580C" label="Holiday" />
      <LegendDot color="#6B7280" label="No work" />
      <LegendDot color={theme.color.surface} label="Outside contract" />
    </View>
  );

  const summaryRow =
    monthSummary && viewMode === 'month' ? (
      <Text style={styles.summaryText}>
        This month: {monthSummary.present} present, {monthSummary.absent} absent, {monthSummary.leave} leave,{' '}
        {monthSummary.rest_days} rest days
        {monthSummary.holiday > 0 ? `, ${monthSummary.holiday} holiday` : ''}
        {monthSummary.no_work > 0 ? `, ${monthSummary.no_work} no-work` : ''}
      </Text>
    ) : null;

  const weekTable = (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        <Text style={[styles.th, { flex: 1.1 }]}>Day</Text>
        <Text style={[styles.th, { width: 36 }]} />
        <Text style={[styles.th, { flex: 1.2 }]}>In</Text>
        <Text style={[styles.th, { flex: 1.2 }]}>Out</Text>
      </View>
      {weekDays.map((d) => {
        const ct = attendanceDayCellType(d);
        const st = attendanceCalendarCellStyle(ct, d.date === todayYmd);
        return (
          <TouchableOpacity
            key={d.date}
            style={styles.tableRow}
            onPress={() => setDetailDay(d)}
            activeOpacity={0.85}
          >
            <Text style={styles.td} numberOfLines={1}>
              {d.weekday} {d.date.slice(5)}
            </Text>
            <View style={[styles.tableDot, { backgroundColor: st.backgroundColor }]} />
            <Text style={styles.td}>{d.check_in_at ? formatAttendanceTime(d.check_in_at) : '—'}</Text>
            <Text style={styles.td}>{d.check_out_at ? formatAttendanceTime(d.check_out_at) : '—'}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const monthGrid = (
    <>
      {monthNav}
      {legend}
      {summaryRow}
      {loading && monthDays.length === 0 ? (
        <ActivityIndicator color={theme.color.parent} style={{ marginTop: 24 }} />
      ) : (
        <AttendanceCalendarGrid
          year={year}
          month={month}
          days={monthDays}
          todayYmd={todayYmd}
          onDayPress={(d) => setDetailDay(d)}
        />
      )}

      <Text style={styles.sectionTitle}>Holiday & no-work days</Text>
      <Text style={styles.sectionHint}>These override the usual workweek for your helper.</Text>
      {specialDays.length === 0 ? (
        <Text style={styles.mutedSmall}>None scheduled.</Text>
      ) : (
        specialDays.map((s) => (
          <View key={s.date} style={styles.specRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.specDate}>
                {s.date} · {s.type === 'holiday' ? 'Holiday' : 'No work'}
              </Text>
              {s.note ? <Text style={styles.specNote}>{s.note}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => void removeSpecialDay(s.date)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color={theme.color.danger} />
            </TouchableOpacity>
          </View>
        ))
      )}
      <TouchableOpacity style={styles.addSpecBtn} onPress={() => setSpecOpen(true)} activeOpacity={0.88}>
        <Ionicons name="add-circle-outline" size={22} color="#fff" />
        <Text style={styles.addSpecBtnText}>Mark holiday / no-work</Text>
      </TouchableOpacity>
    </>
  );

  const body = (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      contentContainerStyle={styles.scrollContent}
    >
      {applicationId && parentId ? (
        <LeaveRequestsPanel
          applicationId={applicationId}
          parentId={parentId}
          helperName={helperName}
          onResponded={() => void load()}
        />
      ) : null}
      {modeToggle}
      {viewMode === 'week' ? (
        <>
          {weekNav}
          {legend}
          {loading && weekDays.length === 0 ? (
            <ActivityIndicator color={theme.color.parent} style={{ marginTop: 24 }} />
          ) : (
            weekTable
          )}
        </>
      ) : (
        monthGrid
      )}
    </ScrollView>
  );

  const detailModal = (
    <Modal visible={!!detailDay} animationType="fade" transparent onRequestClose={() => setDetailDay(null)}>
      <View style={styles.modalWrap}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDetailDay(null)} />
        <View style={styles.modalCard}>
          {detailDay ? (
            <>
              <Text style={styles.modalTitle}>
                {detailDay.weekday} · {detailDay.date}
              </Text>
              <Text style={styles.modalLine}>
                <Text style={styles.modalKey}>Status: </Text>
                {labelForDay(detailDay)}
              </Text>
              <Text style={styles.modalLine}>
                <Text style={styles.modalKey}>Check-in: </Text>
                {detailDay.check_in_at ? formatAttendanceTime(detailDay.check_in_at) : '—'}
              </Text>
              <Text style={styles.modalLine}>
                <Text style={styles.modalKey}>Check-out: </Text>
                {detailDay.check_out_at ? formatAttendanceTime(detailDay.check_out_at) : '—'}
              </Text>
              {detailDay.tasks_completed != null ? (
                <Text style={styles.modalLine}>
                  <Text style={styles.modalKey}>Tasks done: </Text>
                  {String(detailDay.tasks_completed)}
                </Text>
              ) : null}
              {(detailDay.special_note || detailDay.note) && (
                <Text style={styles.modalLine}>
                  <Text style={styles.modalKey}>Note: </Text>
                  {detailDay.special_note || detailDay.note}
                </Text>
              )}
              <TouchableOpacity style={styles.modalClose} onPress={() => setDetailDay(null)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  const specModal = (
    <Modal visible={specOpen} animationType="slide" transparent onRequestClose={() => setSpecOpen(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.specOverlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setSpecOpen(false)} />
        <View style={styles.specCardCentered}>
          <Text style={styles.modalTitle}>Mark a day</Text>
          <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.fieldInput}
            value={specDate}
            onChangeText={setSpecDate}
            placeholder="2026-04-20"
            placeholderTextColor={theme.color.subtle}
            autoCapitalize="none"
          />
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeChip, specType === 'holiday' && styles.typeChipOn]}
              onPress={() => setSpecType('holiday')}
            >
              <Text style={[styles.typeChipText, specType === 'holiday' && styles.typeChipTextOn]}>Holiday</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeChip, specType === 'no_work' && styles.typeChipOn]}
              onPress={() => setSpecType('no_work')}
            >
              <Text style={[styles.typeChipText, specType === 'no_work' && styles.typeChipTextOn]}>No work</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            style={[styles.fieldInput, { minHeight: 72 }]}
            value={specNote}
            onChangeText={setSpecNote}
            multiline
          />
          <View style={styles.specActions}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSpecOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalPrimary, specSaving && { opacity: 0.6 }]}
              disabled={specSaving}
              onPress={() => void saveSpecialDay()}
            >
              {specSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
      {detailModal}
      {specModal}
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
  const ct = attendanceDayCellType(d);
  switch (ct) {
    case 'out_of_contract':
      return 'Outside contract period';
    case 'present':
      return 'Present';
    case 'leave':
      return 'Approved leave (paid)';
    case 'unpaid_leave':
      return 'Approved leave (unpaid)';
    case 'holiday':
      return 'Holiday';
    case 'no_work':
      return 'No work';
    case 'rest':
      return 'Rest day';
    case 'absent':
      return 'Absent';
    case 'future':
      return 'Scheduled';
    default:
      return d.status || '—';
  }
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
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnOn: { backgroundColor: theme.color.parentSoft },
  toggleText: { fontWeight: '800', color: theme.color.muted, fontSize: 14 },
  toggleTextOn: { color: theme.color.parent },
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
  navBtnDisabled: { opacity: 0.45 },
  weekLabel: { fontSize: 15, fontWeight: '800', color: theme.color.ink },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '600', color: theme.color.muted },
  summaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.color.ink,
    marginBottom: 12,
    lineHeight: 20,
  },
  table: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.color.line,
    overflow: 'hidden',
    backgroundColor: theme.color.surfaceElevated,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: theme.color.parentSoft,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  th: { fontSize: 11, fontWeight: '900', color: theme.color.muted, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  td: { fontSize: 13, fontWeight: '600', color: theme.color.ink, flex: 1.2 },
  tableDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: theme.color.ink, marginTop: 20 },
  sectionHint: { fontSize: 13, color: theme.color.muted, marginTop: 4, marginBottom: 8 },
  mutedSmall: { fontSize: 13, color: theme.color.muted, marginBottom: 8 },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  specDate: { fontSize: 14, fontWeight: '700', color: theme.color.ink },
  specNote: { fontSize: 13, color: theme.color.muted, marginTop: 2 },
  addSpecBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.color.parent,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addSpecBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.overlay,
  },
  modalCard: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  modalCardCentered: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: theme.color.ink, marginBottom: 12 },
  modalLine: { fontSize: 15, color: theme.color.ink, marginBottom: 8, lineHeight: 22 },
  modalKey: { fontWeight: '800', color: theme.color.muted },
  modalClose: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCloseText: { fontWeight: '800', color: theme.color.parent, fontSize: 16 },
  specOverlay: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.color.overlay,
    ...Platform.select({
      web: { justifyContent: 'center', padding: 20 },
      default: { justifyContent: 'flex-end' },
    }),
  },
  specCard: {
    backgroundColor: theme.color.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 36,
  },
  specCardCentered: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: theme.color.surfaceElevated,
    padding: 22,
    paddingBottom: 36,
    ...theme.shadow.card,
    ...Platform.select({
      web: { borderRadius: 20, maxHeight: '90%' as const },
      default: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    }),
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.color.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: theme.color.ink,
    marginBottom: 14,
  },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.color.line,
    alignItems: 'center',
  },
  typeChipOn: { backgroundColor: theme.color.parentSoft, borderColor: theme.color.parent },
  typeChipText: { fontWeight: '800', color: theme.color.muted },
  typeChipTextOn: { color: theme.color.parent },
  specActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalPrimary: {
    backgroundColor: theme.color.parent,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  modalPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
