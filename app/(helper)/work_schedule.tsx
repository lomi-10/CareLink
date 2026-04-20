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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { WorkModeShell } from '@/components/helper/work';
import { theme } from '@/constants/theme';

import { styles } from './work_schedule.styles';
import { ymdLocal } from '@/lib/helperWorkApi';
import { monthOverlapsContract } from '@/lib/contractAttendanceNav';
import {
  fetchAttendanceMonth,
  formatAttendanceTime,
  type AttendanceDay,
} from '@/lib/attendanceApi';
import { attendanceDayCellType } from '@/lib/attendanceUi';
import { AttendanceCalendarGrid } from '@/components/shared/AttendanceCalendarGrid';
import {
  fetchLeaveBalance,
  submitLeaveRequest,
  LEAVE_REASON_OPTIONS,
  type LeaveBalanceData,
  type LeaveReasonCode,
} from '@/lib/leaveRequestsApi';
import { Picker } from '@react-native-picker/picker';

export default function WorkScheduleScreen() {
  const router = useRouter();
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
  const [loading, setLoading] = useState(true);

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
      const res = await fetchAttendanceMonth(activeHire.application_id, helperId, 'helper', year, month);
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [helperId, activeHire, year, month]);

  useEffect(() => {
    if (isWorkMode && activeHire && helperId) void load();
  }, [isWorkMode, activeHire, helperId, load]);

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

  if (!ready || authLoading || !isWorkMode || !activeHire) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.color.helper} />
      </View>
    );
  }

  const balanceText =
    leaveBalance && leaveBalance.limit > 0
      ? `${leaveBalance.remaining ?? 0} of ${leaveBalance.limit} days remaining`
      : leaveBalance
        ? `${leaveBalance.used} approved leave day${leaveBalance.used === 1 ? '' : 's'} this year`
        : '—';

  const legend = (
    <View style={styles.legendRow}>
      <LegendItem color="#22C55E" label="Present" />
      <LegendItem color="#A855F7" label="Rest" />
      <LegendItem color="#EAB308" label="Leave" />
      <LegendItem color="#9CA3AF" label="Absent" />
      <LegendItem color="#FFFFFF" label="Future" />
      <LegendItem color="#2563EB" label="Today" outline />
    </View>
  );

  const body = (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      contentContainerStyle={[styles.scroll, !isDesktop && { paddingBottom: 24 }]}
    >
      <Text style={styles.balanceText}>Leave balance: {balanceText}</Text>

      <View style={styles.weekNav}>
        <TouchableOpacity
          onPress={goPrevMonth}
          style={[styles.navBtn, !canPrevMonth && styles.navBtnDisabled]}
          disabled={!canPrevMonth}
        >
          <Ionicons name="chevron-back" size={22} color={theme.color.helper} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {new Date(year, month - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity
          onPress={goNextMonth}
          style={[styles.navBtn, !canNextMonth && styles.navBtnDisabled]}
          disabled={!canNextMonth}
        >
          <Ionicons name="chevron-forward" size={22} color={theme.color.helper} />
        </TouchableOpacity>
      </View>

      {legend}

      {loading && days.length === 0 ? (
        <ActivityIndicator color={theme.color.helper} style={{ marginTop: 24 }} />
      ) : (
        <AttendanceCalendarGrid
          year={year}
          month={month}
          days={days}
          todayYmd={todayYmd}
          onDayPress={(d) => setDetailDay(d)}
        />
      )}

      <TouchableOpacity style={styles.requestBtn} onPress={openLeaveModal} activeOpacity={0.88}>
        <Ionicons name="calendar-outline" size={20} color="#fff" />
        <Text style={styles.requestBtnText}>Request day off</Text>
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
            <ActivityIndicator color={theme.color.helper} style={{ marginBottom: 12 }} />
          ) : null}
          <Text style={styles.modalLabel}>Date</Text>
          {Platform.OS === 'web' ? (
            WebDateInput({
              value: leaveDate,
              min: minLeaveYmd,
              max: maxLeaveYmd ?? undefined,
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
                <Ionicons name="calendar-outline" size={20} color={theme.color.helper} />
                <Text style={styles.datePickText}>{formatDisplayYmd(leaveDate)}</Text>
                <Ionicons name="chevron-down" size={18} color={theme.color.muted} />
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
            placeholderTextColor={theme.color.subtle}
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

  const detailModal = (
    <Modal visible={!!detailDay} animationType="slide" transparent onRequestClose={() => setDetailDay(null)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailDay(null)} />
        <View style={styles.modalCard}>
          {detailDay ? (
            <>
              <Text style={styles.modalTitle}>
                {detailDay.weekday} · {detailDay.date}
              </Text>
              <View style={styles.sheetSection}>
                <Text style={styles.sheetLabel}>Status</Text>
                <Text style={styles.sheetValue}>{labelForDetail(detailDay)}</Text>
              </View>
              <View style={styles.sheetSection}>
                <Text style={styles.sheetLabel}>Check-in</Text>
                <Text style={styles.sheetValue}>
                  {detailDay.check_in_at ? formatAttendanceTime(detailDay.check_in_at) : '—'}
                </Text>
              </View>
              <View style={styles.sheetSection}>
                <Text style={styles.sheetLabel}>Check-out</Text>
                <Text style={styles.sheetValue}>
                  {detailDay.check_out_at ? formatAttendanceTime(detailDay.check_out_at) : '—'}
                </Text>
              </View>
              <View style={styles.sheetSection}>
                <Text style={styles.sheetLabel}>Tasks completed</Text>
                <Text style={styles.sheetValue}>
                  {detailDay.tasks_completed != null ? String(detailDay.tasks_completed) : '—'}
                </Text>
              </View>
              {detailDay.special_note || detailDay.note ? (
                <View style={styles.sheetSection}>
                  <Text style={styles.sheetLabel}>Note</Text>
                  <Text style={styles.sheetValue}>{detailDay.special_note || detailDay.note}</Text>
                </View>
              ) : null}
              <TouchableOpacity style={styles.modalSubmit} onPress={() => setDetailDay(null)}>
                <Text style={styles.modalSubmitText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
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

function LegendItem({
  color,
  label,
  outline,
}: {
  color: string;
  label: string;
  outline?: boolean;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: color },
          outline && { borderWidth: 2, borderColor: '#2563EB' },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function WebReasonSelect({
  value,
  onChange,
}: {
  value: LeaveReasonCode;
  onChange: (v: LeaveReasonCode) => void;
}) {
  return React.createElement(
    'select',
    {
      value,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value as LeaveReasonCode),
      style: {
        padding: '12px',
        border: `1px solid ${theme.color.line}`,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 16,
        width: '100%',
        boxSizing: 'border-box' as const,
        fontFamily: 'inherit',
        backgroundColor: '#fff',
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
}: {
  value: string;
  min: string;
  max?: string;
  onChange: (ymd: string) => void;
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
      border: `1px solid ${theme.color.line}`,
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
