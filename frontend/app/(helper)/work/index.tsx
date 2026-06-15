// app/(helper)/work/index.tsx  — Work Schedule (attendance calendar)
// PHP: v1/applications/attendance.php, v1/applications/attendance_month.php, v1/attendance/checkin.php, v1/attendance/checkout.php, v1/contracts/special_days.php
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { WorkModeShell } from '@/components/helper/work';
import {
  DARK,
  MUTED,
  SUBTLE,
  ORANGE,
  GREEN,
  DIVIDER,
  ICON_BG,
  SURFACE,
  SUCCESS_BG,
  WARNING_BG,
  DANGER,
  DANGER_BG,
  INFO,
} from '@/components/helper/home/helperWarmTheme';

import {
  createHelperWorkScheduleStyles,
  type HelperWorkScheduleStyles,
} from './work_schedule.styles';
import { ymdLocal, fetchWeekAttendance, postAttendance, type WeekDayAttendance } from '@/lib/helperWorkApi';
import { monthOverlapsContract } from '@/lib/contractAttendanceNav';
import {
  fetchAttendanceMonth,
  formatAttendanceTime,
  type AttendanceDay,
} from '@/lib/attendanceApi';
import { attendanceDayCellType, weekDotState, nextRestDayYmd, type WeekDotState } from '@/lib/attendanceUi';
import { AttendanceCalendarGrid } from '@/components/shared/AttendanceCalendarGrid';
import {
  fetchLeaveBalance,
  submitLeaveRequest,
  fetchLeaveRequests,
  labelForLeaveReasonCode,
  LEAVE_REASON_OPTIONS,
  type LeaveBalanceData,
  type LeaveReasonCode,
  type LeaveRequestRow,
} from '@/lib/leaveRequestsApi';
import { Picker } from '@react-native-picker/picker';

const HERO_GRADIENT = ['#6B2E0A', '#3B1508', '#1E0A04'] as const;
const WARNING = '#D97706';
const GREEN_ON_DARK = '#4ADE80';
const AMBER_ON_DARK = '#FCD34D';
const RED_ON_DARK = '#F87171';

export default function WorkScheduleScreen() {
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const styles = useMemo(() => createHelperWorkScheduleStyles(), []);
  const { isDesktop } = useResponsive();
  const { userData, loading: authLoading } = useAuth();
  const { ready, isWorkMode, activeHire } = useHelperWorkMode();

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<{ used: number; limit: number; remaining: number | null } | null>(
    null,
  );
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRow[]>([]);
  const [weekDays, setWeekDays] = useState<WeekDayAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState(() => ymdLocal());
  const [leaveReasonCode, setLeaveReasonCode] = useState<LeaveReasonCode>('personal');
  const [leaveHelperNote, setLeaveHelperNote] = useState('');
  const [modalLeaveBalance, setModalLeaveBalance] = useState<LeaveBalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const [detailDay, setDetailDay] = useState<AttendanceDay | null>(null);

  const [contractStart, setContractStart] = useState<string | null>(null);
  const [contractEnd, setContractEnd] = useState<string | null>(null);

  const helperId = userData ? Number(userData.user_id) : 0;

  useEffect(() => {
    if (!ready || authLoading) return;
    if (!isWorkMode || !activeHire) {
      router.replace('/(helper)/home');
    }
  }, [ready, isWorkMode, activeHire, authLoading, router]);

  const load = useCallback(async () => {
    if (!activeHire || !helperId) return;
    setLoading(true);
    try {
      const [res, leaveRes, weekRes] = await Promise.all([
        fetchAttendanceMonth(activeHire.application_id, helperId, 'helper', year, month),
        fetchLeaveRequests(activeHire.application_id, helperId, 'helper'),
        fetchWeekAttendance(helperId, activeHire.application_id),
      ]);
      if (res.success && res.days) {
        setDays(res.days);
        if (res.leave_balance) {
          setLeaveBalance({
            used: res.leave_balance.used,
            limit: res.leave_balance.limit,
            remaining: res.leave_balance.remaining ?? null,
          });
        } else {
          setLeaveBalance(null);
        }
      }
      if (res.success) {
        if (res.employment_start_date !== undefined) setContractStart(res.employment_start_date ?? null);
        if (res.employment_end_date !== undefined) setContractEnd(res.employment_end_date ?? null);
      }
      if (leaveRes.success && leaveRes.data) setLeaveRequests(leaveRes.data);
      if (weekRes.success && weekRes.days) setWeekDays(weekRes.days);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [helperId, activeHire, year, month]);

  useEffect(() => {
    if (isWorkMode && activeHire && helperId) void load();
  }, [isWorkMode, activeHire, helperId, load]);

  // Keep an open detail modal in sync after a check-in/out or month reload.
  useEffect(() => {
    setDetailDay((prev) => {
      if (!prev) return prev;
      const fresh = days.find((d) => d.date === prev.date);
      return fresh ?? prev;
    });
  }, [days]);

  useEffect(() => {
    if (!contractStart && !contractEnd) return;
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
  }, [contractStart, contractEnd]);

  const minLeaveYmd = useMemo(() => {
    const today = ymdLocal();
    if (contractStart && contractStart > today) return contractStart;
    return today;
  }, [contractStart]);

  const maxLeaveYmd = contractEnd;

  const leaveDateObj = useMemo(() => {
    const [y, m, d] = leaveDate.split('-').map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  }, [leaveDate]);

  const minDateObj = useMemo(() => {
    const [y, m, d] = minLeaveYmd.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [minLeaveYmd]);

  const maxDateObj = useMemo(() => {
    if (!maxLeaveYmd) return undefined;
    const [y, m, d] = maxLeaveYmd.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [maxLeaveYmd]);

  const canPrevMonth = useMemo(() => {
    let nm = month - 1;
    let ny = year;
    if (nm < 1) {
      nm = 12;
      ny -= 1;
    }
    return monthOverlapsContract(ny, nm, contractStart, contractEnd);
  }, [year, month, contractStart, contractEnd]);

  const canNextMonth = useMemo(() => {
    let nm = month + 1;
    let ny = year;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    return monthOverlapsContract(ny, nm, contractStart, contractEnd);
  }, [year, month, contractStart, contractEnd]);

  const openLeaveModal = () => {
    setLeaveDate(minLeaveYmd);
    setLeaveReasonCode('personal');
    setLeaveHelperNote('');
    setLeaveOpen(true);
  };

  // Deep link from the Work dashboard's "Request Leave" quick action.
  useEffect(() => {
    if (action === 'request-leave') {
      openLeaveModal();
    }
  }, [action]);

  useEffect(() => {
    if (!leaveOpen || !activeHire || !helperId) return;
    let cancelled = false;
    setBalanceLoading(true);
    void (async () => {
      const res = await fetchLeaveBalance(activeHire.application_id, helperId);
      if (!cancelled && res.success && res.data) {
        setModalLeaveBalance(res.data);
      }
      if (!cancelled) setBalanceLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [leaveOpen, activeHire, helperId]);

  const isDateBlocked = (ymd: string) => modalLeaveBalance?.blocked_dates?.includes(ymd) ?? false;

  const submitLeave = async () => {
    if (!activeHire || !helperId) return;
    if (leaveDate < minLeaveYmd) {
      Alert.alert('Day off', 'Choose a date within your employment that is not in the past.');
      return;
    }
    if (maxLeaveYmd && leaveDate > maxLeaveYmd) {
      Alert.alert('Day off', `Choose a date on or before your contract end (${maxLeaveYmd}).`);
      return;
    }
    if (isDateBlocked(leaveDate)) {
      Alert.alert(
        'Day off',
        'That date is not available (rest day, employer-marked day off, or you already have leave pending/approved).',
      );
      return;
    }
    setLeaveSubmitting(true);
    try {
      const res = await submitLeaveRequest(activeHire.application_id, helperId, {
        date: leaveDate,
        reason_code: leaveReasonCode,
        helper_note: leaveHelperNote.trim() || null,
      });
      if (!res.success) {
        Alert.alert('Day off', res.message || 'Request failed');
        return;
      }
      if (res.warnings?.includes('paid_limit_reached')) {
        Alert.alert(
          'Request sent',
          'You have used your paid leave days for this year. If your employer approves, it will be recorded as unpaid leave.',
        );
      } else {
        Alert.alert('Sent', 'Your employer will be notified.');
      }
      setLeaveOpen(false);
      await load();
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const onCheckIn = async () => {
    if (!activeHire || !helperId) return;
    setActionBusy(true);
    try {
      const res = await postAttendance(helperId, activeHire.application_id, 'check_in');
      if (!res.success) {
        Alert.alert('Check in', res.message || 'Failed to check in.');
        return;
      }
      await load();
    } finally {
      setActionBusy(false);
    }
  };

  const onCheckOut = async () => {
    if (!activeHire || !helperId) return;
    setActionBusy(true);
    try {
      const res = await postAttendance(helperId, activeHire.application_id, 'check_out');
      if (!res.success) {
        Alert.alert('Check out', res.message || 'Failed to check out.');
        return;
      }
      await load();
    } finally {
      setActionBusy(false);
    }
  };

  const todayYmd = ymdLocal();

  const goPrevMonth = () => {
    if (!canPrevMonth) return;
    if (month <= 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (!canNextMonth) return;
    if (month >= 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  if (!ready || authLoading || !isWorkMode || !activeHire) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // ── Derived data for the new cards ──────────────────────────────────────
  const recentLeaveRequests = [...leaveRequests].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const beforeStart = !!contractStart && todayYmd < contractStart;

  const upcomingRestDayYmd = (() => {
    if (beforeStart) {
      return nextRestDayYmd(activeHire.rest_days, contractStart as string);
    }
    const fromWeek = weekDays.find((d) => d.date >= todayYmd && attendanceDayCellType(d) === 'rest');
    if (fromWeek) return fromWeek.date;
    return nextRestDayYmd(activeHire.rest_days, todayYmd);
  })();

  const upcomingLeave =
    leaveRequests
      .filter((l) => l.status === 'approved' && l.date >= todayYmd)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

  const presentCount = weekDays.filter((d) => weekDotState(d) === 'present').length;
  const scheduledWorkdays = weekDays.filter((d) => attendanceDayCellType(d) !== 'rest').length;
  const attendanceEncouragement =
    scheduledWorkdays === 0
      ? 'No work days scheduled this week.'
      : presentCount >= scheduledWorkdays
        ? "Great job — you're on track this week!"
        : 'Keep it up — check in on your scheduled work days.';

  // ── Selected-date modal derived state ───────────────────────────────────
  const detailCellType = detailDay ? attendanceDayCellType(detailDay) : 'future';
  const detailIsToday = detailDay?.date === todayYmd;
  const detailCheckedIn = !!detailDay?.checked_in;
  const detailCheckedOut = !!detailDay?.check_out_at;
  const detailIsRestNoCheckIn = detailCellType === 'rest' && !detailCheckedIn;
  const detailStatusColor =
    detailCellType === 'present'
      ? GREEN_ON_DARK
      : detailCellType === 'leave' || detailCellType === 'unpaid_leave' || detailCellType === 'holiday'
        ? AMBER_ON_DARK
        : detailCellType === 'absent'
          ? RED_ON_DARK
          : SUBTLE;

  // ── Leave Balance hero ───────────────────────────────────────────────────
  const hero = (
    <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroSection}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="calendar-outline" size={16} color={SUBTLE} />
          </View>
          <Text style={styles.heroLabel}>Leave Balance</Text>
        </View>

        {leaveBalance ? (
          <>
            <Text style={styles.heroBigValue}>{leaveBalance.remaining ?? 0} Days Remaining</Text>
            <Text style={styles.heroSubtitle}>of {leaveBalance.limit} days this year</Text>
          </>
        ) : (
          <>
            <Text style={styles.heroBigValue}>Need a day off?</Text>
            <Text style={styles.heroSubtitle}>Request leave from your employer anytime.</Text>
          </>
        )}
      </View>

      <View style={styles.heroDivider} />

      <View style={styles.heroSection}>
        <Text style={styles.heroInfoTitle}>Need a time off?</Text>
        <Text style={styles.heroInfoText}>
          Request a leave and your employer will be notified right away.
        </Text>
      </View>

      <View style={styles.heroDivider} />

      <TouchableOpacity style={styles.heroCta} onPress={openLeaveModal} activeOpacity={0.88}>
        <Ionicons name="sunny-outline" size={18} color={ORANGE} />
        <Text style={styles.heroCtaText}>Request Leave</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  // ── Schedule Calendar card ──────────────────────────────────────────────
  const calendarCard = (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderIconWrap}>
          <Ionicons name="calendar-outline" size={16} color={ORANGE} />
        </View>
        <Text style={styles.cardHeaderTitle}>Schedule Calendar</Text>
        {!isCurrentMonth ? (
          <TouchableOpacity style={styles.todayBtn} onPress={goToday} activeOpacity={0.85}>
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.weekNav}>
        <TouchableOpacity
          onPress={goPrevMonth}
          style={[styles.navBtn, !canPrevMonth && styles.navBtnDisabled]}
          disabled={!canPrevMonth}
        >
          <Ionicons name="chevron-back" size={22} color={ORANGE} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {new Date(year, month - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity
          onPress={goNextMonth}
          style={[styles.navBtn, !canNextMonth && styles.navBtnDisabled]}
          disabled={!canNextMonth}
        >
          <Ionicons name="chevron-forward" size={22} color={ORANGE} />
        </TouchableOpacity>
      </View>

      {loading && days.length === 0 ? (
        <ActivityIndicator color={ORANGE} style={{ marginTop: 24 }} />
      ) : (
        <AttendanceCalendarGrid
          year={year}
          month={month}
          days={days}
          todayYmd={todayYmd}
          onDayPress={(d) => setDetailDay(d)}
        />
      )}

      <View style={styles.calLegendRow}>
        <CalLegendItem styles={styles} color="#22C55E" label="Checked In" />
        <CalLegendItem styles={styles} color="#DC2626" label="Absent" />
        <CalLegendItem styles={styles} color="#78350F" label="Day Off" />
        <CalLegendItem styles={styles} color="#2563EB" label="Today" outline />
      </View>
    </View>
  );

  // ── Leave Requests card ──────────────────────────────────────────────────
  const leaveRequestsCard = (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderIconWrap}>
          <Ionicons name="document-text-outline" size={16} color={ORANGE} />
        </View>
        <Text style={styles.cardHeaderTitle}>Leave Requests</Text>
      </View>

      {recentLeaveRequests.length === 0 ? (
        <Text style={styles.emptyText}>No leave requests yet.</Text>
      ) : (
        recentLeaveRequests.map((req, i) => {
          const pill =
            req.status === 'approved'
              ? { bg: SUCCESS_BG, fg: GREEN, label: 'Approved' }
              : req.status === 'declined'
                ? { bg: DANGER_BG, fg: DANGER, label: 'Declined' }
                : { bg: WARNING_BG, fg: WARNING, label: 'Pending' };
          return (
            <View
              key={req.id}
              style={[styles.listRow, i === recentLeaveRequests.length - 1 && styles.listRowLast]}
            >
              <View style={[styles.rowIconWrap, { backgroundColor: ICON_BG }]}>
                <Ionicons name="sunny-outline" size={18} color={ORANGE} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>{labelForLeaveReasonCode(req.reason_code)}</Text>
                <Text style={styles.rowSub}>{formatDisplayYmd(req.date)}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  // ── Attendance Summary card ─────────────────────────────────────────────
  const attendanceSummaryCard = (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderIconWrap}>
          <Ionicons name="stats-chart-outline" size={16} color={ORANGE} />
        </View>
        <Text style={styles.cardHeaderTitle}>Attendance Summary</Text>
      </View>

      <View style={styles.weekRow}>
        {weekDays.map((d) => {
          const state = weekDotState(d);
          return (
            <View key={d.date} style={styles.dayCol}>
              <Text style={styles.dayLbl}>{d.weekday.slice(0, 1)}</Text>
              <WeekDot state={state} styles={styles} />
            </View>
          );
        })}
      </View>

      <Text style={styles.daysWorkedText}>
        {presentCount}/{scheduledWorkdays} Days Worked
      </Text>
      <Text style={styles.encourageText}>{attendanceEncouragement}</Text>

      <View style={styles.weekLegendRow}>
        <WeekLegendItem styles={styles} state="present" label="Present" />
        <WeekLegendItem styles={styles} state="scheduled" label="Scheduled" />
        <WeekLegendItem styles={styles} state="missed" label="Missed" />
      </View>
    </View>
  );

  // ── Upcoming Schedule card ──────────────────────────────────────────────
  const upcomingCard = (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderIconWrap}>
          <Ionicons name="notifications-outline" size={16} color={ORANGE} />
        </View>
        <Text style={styles.cardHeaderTitle}>Upcoming Schedule</Text>
      </View>

      {upcomingRestDayYmd || upcomingLeave ? (
        <View style={styles.upcomingList}>
          {upcomingRestDayYmd ? (
            <View style={styles.upcomingRow}>
              <View style={[styles.rowIconWrap, { backgroundColor: ICON_BG }]}>
                <Ionicons name="bed-outline" size={18} color={ORANGE} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Rest Day</Text>
                <Text style={styles.rowSub}>{formatDisplayYmd(upcomingRestDayYmd)}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: DIVIDER }]}>
                <Text style={[styles.pillText, { color: MUTED }]}>Scheduled</Text>
              </View>
            </View>
          ) : null}

          {upcomingLeave ? (
            <View style={styles.upcomingRow}>
              <View style={[styles.rowIconWrap, { backgroundColor: SUCCESS_BG }]}>
                <Ionicons name="sunny-outline" size={18} color={GREEN} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  Approved Leave — {labelForLeaveReasonCode(upcomingLeave.reason_code)}
                </Text>
                <Text style={styles.rowSub}>{formatDisplayYmd(upcomingLeave.date)}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: SUCCESS_BG }]}>
                <Text style={[styles.pillText, { color: GREEN }]}>Approved</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.emptyText}>Nothing scheduled — enjoy your work!</Text>
      )}
    </View>
  );

  const body = (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      contentContainerStyle={[styles.scroll, !isDesktop && { paddingBottom: 24 }]}
    >
      {hero}

      {beforeStart ? (
        <View style={styles.previewBanner}>
          <View style={styles.previewBannerIconWrap}>
            <Ionicons name="eye-outline" size={20} color={INFO} />
          </View>
          <Text style={styles.previewBannerText}>
            Preview — your work starts on {formatLongDateFull(contractStart!)}.
          </Text>
        </View>
      ) : null}

      {calendarCard}
      {leaveRequestsCard}
      {attendanceSummaryCard}
      {upcomingCard}

      <TouchableOpacity
        style={styles.historyLink}
        onPress={() => router.push('/(helper)/work/history')}
        activeOpacity={0.88}
      >
        <Ionicons name="time-outline" size={18} color={ORANGE} />
        <Text style={styles.historyLinkText}>View attendance history</Text>
        <Ionicons name="chevron-forward" size={16} color={ORANGE} />
      </TouchableOpacity>
    </ScrollView>
  );

  const rem = modalLeaveBalance?.remaining ?? 0;
  const atPaidLimit = modalLeaveBalance?.at_paid_limit ?? false;
  const remainingAfter = atPaidLimit ? rem : Math.max(0, rem - 1);

  const leaveModal = (
    <Modal visible={leaveOpen} animationType="slide" transparent onRequestClose={() => setLeaveOpen(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setLeaveOpen(false)} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Request day off</Text>
          {balanceLoading ? (
            <ActivityIndicator color={ORANGE} style={{ marginBottom: 12 }} />
          ) : null}
          <Text style={styles.modalLabel}>Date</Text>
          {Platform.OS === 'web' ? (
            WebDateInput({
              value: leaveDate,
              min: minLeaveYmd,
              max: maxLeaveYmd ?? undefined,
              lineColor: DIVIDER,
              onChange: (v: string) => {
                setLeaveDate(v);
                if (modalLeaveBalance?.blocked_dates?.includes(v)) {
                  Alert.alert(
                    'Date not available',
                    'Rest day, scheduled day off, or leave already requested for that date.',
                  );
                }
              },
            })
          ) : (
            <>
              <TouchableOpacity
                style={styles.datePickRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={20} color={ORANGE} />
                <Text style={styles.datePickText}>{formatDisplayYmd(leaveDate)}</Text>
                <Ionicons name="chevron-down" size={18} color={MUTED} />
              </TouchableOpacity>
              {showDatePicker ? (
                <DateTimePicker
                  value={leaveDateObj}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={minDateObj}
                  maximumDate={maxDateObj}
                  onChange={(ev, selected) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (ev.type === 'set' && selected) {
                      const ymd = ymdLocal(selected);
                      setLeaveDate(ymd);
                      if (modalLeaveBalance?.blocked_dates?.includes(ymd)) {
                        Alert.alert(
                          'Date not available',
                          'Rest day, scheduled day off, or leave already requested for that date.',
                        );
                      }
                    }
                    if (Platform.OS === 'ios' && ev.type === 'dismissed') {
                      setShowDatePicker(false);
                    }
                  }}
                />
              ) : null}
            </>
          )}
          <Text style={styles.modalLabel}>Reason</Text>
          {Platform.OS === 'web' ? (
            WebReasonSelect({
              value: leaveReasonCode,
              onChange: setLeaveReasonCode,
              lineColor: DIVIDER,
              inputBg: SURFACE,
            })
          ) : (
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={leaveReasonCode}
                onValueChange={(v) => setLeaveReasonCode(v as LeaveReasonCode)}
                style={styles.picker}
              >
                {LEAVE_REASON_OPTIONS.map((o) => (
                  <Picker.Item key={o.value} label={o.label} value={o.value} />
                ))}
              </Picker>
            </View>
          )}
          <Text style={styles.modalLabel}>Note (optional)</Text>
          <TextInput
            style={styles.reasonInput}
            value={leaveHelperNote}
            onChangeText={setLeaveHelperNote}
            placeholder="Add details if needed"
            placeholderTextColor={SUBTLE}
            multiline
            numberOfLines={3}
          />
          {modalLeaveBalance ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewLine}>
                Remaining paid balance after this: {remainingAfter} of {modalLeaveBalance.total} days
              </Text>
              {atPaidLimit ? (
                <Text style={styles.previewWarn}>
                  You are at your paid leave limit. If approved, this day will be recorded as unpaid leave.
                </Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setLeaveOpen(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmit, leaveSubmitting && styles.modalSubmitDisabled]}
              onPress={() => void submitLeave()}
              disabled={leaveSubmitting}
            >
              {leaveSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ── Selected-date modal ─────────────────────────────────────────────────
  const detailModal = (
    <Modal visible={!!detailDay} animationType="fade" transparent onRequestClose={() => setDetailDay(null)}>
      <View style={styles.detailOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailDay(null)} />
        {detailDay ? (
          <View style={styles.detailCard}>
            <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.detailHero}>
              <View style={styles.detailHeroRow}>
                <View>
                  <Text style={styles.detailWeekday}>{detailDay.weekday}</Text>
                  <Text style={styles.detailDateText}>{formatLongDateFull(detailDay.date)}</Text>
                </View>
                <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setDetailDay(null)}>
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailStatusPill}>
                <Text style={[styles.detailStatusPillText, { color: detailStatusColor }]}>
                  {labelForDetail(detailDay)}
                </Text>
              </View>

              <View style={styles.detailInfoGrid}>
                <View style={styles.detailInfoCol}>
                  <Text style={styles.detailInfoLabel}>Work Hours</Text>
                  <Text style={styles.detailInfoValue}>{activeHire.work_hours || 'Not set'}</Text>
                </View>
                <View style={styles.detailInfoCol}>
                  <Text style={styles.detailInfoLabel}>Check-in</Text>
                  <Text style={styles.detailInfoValue}>
                    {detailDay.check_in_at ? formatAttendanceTime(detailDay.check_in_at) : '—'}
                  </Text>
                </View>
                <View style={styles.detailInfoCol}>
                  <Text style={styles.detailInfoLabel}>Check-out</Text>
                  <Text style={styles.detailInfoValue}>
                    {detailDay.check_out_at ? formatAttendanceTime(detailDay.check_out_at) : '—'}
                  </Text>
                </View>
                <View style={styles.detailInfoCol}>
                  <Text style={styles.detailInfoLabel}>Tasks Completed</Text>
                  <Text style={styles.detailInfoValue}>
                    {detailDay.tasks_completed != null ? String(detailDay.tasks_completed) : '—'}
                  </Text>
                </View>
              </View>

              {detailDay.special_note || detailDay.note ? (
                <Text style={styles.detailNote}>{detailDay.special_note || detailDay.note}</Text>
              ) : null}

              {detailIsToday ? (
                <TouchableOpacity
                  style={[
                    styles.detailCheckBtn,
                    !beforeStart && !detailCheckedIn && !detailCheckedOut && !detailIsRestNoCheckIn && styles.detailCheckBtnIn,
                    !beforeStart && detailCheckedIn && !detailCheckedOut && styles.detailCheckBtnOut,
                    (beforeStart || detailCheckedOut || detailIsRestNoCheckIn) && styles.detailCheckBtnDisabled,
                  ]}
                  onPress={() => {
                    if (beforeStart || detailCheckedOut || detailIsRestNoCheckIn) return;
                    if (!detailCheckedIn) void onCheckIn();
                    else void onCheckOut();
                  }}
                  disabled={actionBusy || beforeStart || detailCheckedOut || detailIsRestNoCheckIn}
                  activeOpacity={0.9}
                >
                  {actionBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          beforeStart
                            ? 'time-outline'
                            : detailCheckedOut
                              ? 'checkmark-done'
                              : detailCheckedIn
                                ? 'log-out-outline'
                                : 'log-in-outline'
                        }
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.detailCheckBtnText}>
                        {beforeStart
                          ? `Starts ${formatLongDateFull(contractStart!)}`
                          : detailIsRestNoCheckIn
                            ? 'Rest day'
                            : detailCheckedOut
                              ? 'Done for today'
                              : detailCheckedIn
                                ? 'Check out'
                                : 'Check in'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </LinearGradient>
          </View>
        ) : null}
      </View>
    </Modal>
  );

  return (
    <WorkModeShell desktopTitle="Schedule" desktopSubtitle="Attendance by day">
      <View style={{ flex: 1 }}>
        {body}
        {leaveModal}
        {detailModal}
      </View>
    </WorkModeShell>
  );
}

function labelForDetail(d: AttendanceDay): string {
  const ct = attendanceDayCellType(d);
  switch (ct) {
    case 'present':
      return 'Present';
    case 'leave':
      return 'Approved leave (paid)';
    case 'unpaid_leave':
      return 'Approved leave (unpaid)';
    case 'holiday':
      return 'Holiday';
    case 'no_work':
      return 'No work (employer)';
    case 'rest':
      return 'Rest day';
    case 'absent':
      return 'Absent';
    case 'future':
      return 'Scheduled';
    case 'out_of_contract':
      return 'Outside employment period';
    default:
      return d.status || '—';
  }
}

function CalLegendItem({
  styles,
  color,
  label,
  outline,
}: {
  styles: HelperWorkScheduleStyles;
  color: string;
  label: string;
  outline?: boolean;
}) {
  return (
    <View style={styles.calLegendItem}>
      <View
        style={[
          styles.calLegendDot,
          { backgroundColor: color },
          outline && { borderWidth: 2, borderColor: '#2563EB' },
        ]}
      />
      <Text style={styles.calLegendText}>{label}</Text>
    </View>
  );
}

function WeekDot({ state, styles }: { state: WeekDotState; styles: HelperWorkScheduleStyles }) {
  if (state === 'present') {
    return (
      <View style={[styles.weekDot, styles.weekDotPresent]}>
        <Ionicons name="checkmark" size={12} color="#fff" />
      </View>
    );
  }
  if (state === 'missed') {
    return <View style={[styles.weekDot, styles.weekDotMissed]} />;
  }
  return <View style={[styles.weekDot, styles.weekDotScheduled]} />;
}

function WeekLegendItem({
  styles,
  state,
  label,
}: {
  styles: HelperWorkScheduleStyles;
  state: WeekDotState;
  label: string;
}) {
  return (
    <View style={styles.weekLegendItem}>
      <WeekDot state={state} styles={styles} />
      <Text style={styles.weekLegendText}>{label}</Text>
    </View>
  );
}

function WebReasonSelect({
  value,
  onChange,
  lineColor,
  inputBg,
}: {
  value: LeaveReasonCode;
  onChange: (v: LeaveReasonCode) => void;
  lineColor: string;
  inputBg: string;
}) {
  return React.createElement(
    'select',
    {
      value,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value as LeaveReasonCode),
      style: {
        padding: '12px',
        border: `1px solid ${lineColor}`,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 16,
        width: '100%',
        boxSizing: 'border-box' as const,
        fontFamily: 'inherit',
        backgroundColor: inputBg,
      },
    } as any,
    LEAVE_REASON_OPTIONS.map((o) =>
      React.createElement('option', { key: o.value, value: o.value }, o.label),
    ),
  );
}

function WebDateInput({
  value,
  min,
  max,
  onChange,
  lineColor,
}: {
  value: string;
  min: string;
  max?: string;
  onChange: (ymd: string) => void;
  lineColor: string;
}) {
  return React.createElement('input', {
    type: 'date',
    value,
    min,
    ...(max ? { max } : {}),
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value;
      if (v) onChange(v);
    },
    style: {
      padding: '12px',
      border: `1px solid ${lineColor}`,
      borderRadius: 12,
      fontSize: 16,
      marginBottom: 12,
      width: '100%',
      boxSizing: 'border-box' as const,
      fontFamily: 'inherit',
    },
  } as any);
}

function formatDisplayYmd(ymd: string) {
  try {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return ymd;
  }
}

function formatLongDateFull(ymd: string) {
  try {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return ymd;
  }
}
