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
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { WorkModeShell } from '@/components/helper/work';
import { theme } from '@/constants/theme';
import {
  addDaysYmd,
  fetchWeekAttendance,
  mondayOfWeekContaining,
  ymdLocal,
  type WeekDayAttendance,
} from '@/lib/helperWorkApi';
import { attendanceDotBackground } from '@/lib/attendanceUi';
import { submitLeaveRequest } from '@/lib/leaveRequestsApi';

export default function WorkScheduleScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { userData, loading: authLoading } = useAuth();
  const { ready, isWorkMode, activeHire } = useHelperWorkMode();

  const [anchorMonday, setAnchorMonday] = useState(() => mondayOfWeekContaining(ymdLocal()));
  const [days, setDays] = useState<WeekDayAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState(() => ymdLocal());
  const [leaveReason, setLeaveReason] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const helperId = userData ? Number(userData.user_id) : 0;

  const leaveDateObj = useMemo(() => {
    const [y, m, d] = leaveDate.split('-').map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  }, [leaveDate]);

  const minDateObj = useMemo(() => {
    const [y, m, d] = ymdLocal().split('-').map(Number);
    return new Date(y, m - 1, d);
  }, []);

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
      const res = await fetchWeekAttendance(helperId, activeHire.application_id, anchorMonday);
      if (res.success && res.days) setDays(res.days);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [helperId, activeHire, anchorMonday]);

  useEffect(() => {
    if (isWorkMode && activeHire && helperId) void load();
  }, [isWorkMode, activeHire, helperId, load]);

  const openLeaveModal = () => {
    setLeaveDate(ymdLocal());
    setLeaveReason('');
    setLeaveOpen(true);
  };

  const submitLeave = async () => {
    if (!activeHire || !helperId) return;
    if (leaveDate < ymdLocal()) {
      Alert.alert('Day off', 'Choose today or a future date.');
      return;
    }
    setLeaveSubmitting(true);
    try {
      const res = await submitLeaveRequest(activeHire.application_id, helperId, {
        date: leaveDate,
        reason: leaveReason.trim() || null,
      });
      if (!res.success) {
        Alert.alert('Day off', res.message || 'Request failed');
        return;
      }
      setLeaveOpen(false);
      Alert.alert('Sent', 'Your employer will be notified.');
      await load();
    } finally {
      setLeaveSubmitting(false);
    }
  };

  if (!ready || authLoading || !isWorkMode || !activeHire) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.color.helper} />
      </View>
    );
  }

  const thisWeekMon = mondayOfWeekContaining(ymdLocal());
  const goPrev = () => setAnchorMonday((m) => addDaysYmd(m, -7));
  const goNext = () => setAnchorMonday((m) => addDaysYmd(m, 7));

  const body = (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      contentContainerStyle={[styles.scroll, !isDesktop && { paddingBottom: 24 }]}
    >
      <TouchableOpacity style={styles.requestBtn} onPress={openLeaveModal} activeOpacity={0.88}>
        <Ionicons name="calendar-outline" size={20} color="#fff" />
        <Text style={styles.requestBtnText}>Request day off</Text>
      </TouchableOpacity>

      <View style={styles.weekNav}>
        <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.color.helper} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          Week of {anchorMonday}
          {anchorMonday === thisWeekMon ? ' · This week' : ''}
        </Text>
        <TouchableOpacity onPress={goNext} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.color.helper} />
        </TouchableOpacity>
      </View>

      {loading && days.length === 0 ? (
        <ActivityIndicator color={theme.color.helper} style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.cardList}>
          {days.map((d) => (
            <View key={d.date} style={styles.dayCard}>
              <View style={styles.dayHead}>
                <View style={styles.dayHeadLeft}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: attendanceDotBackground(d.status, d.checked_in) },
                    ]}
                  />
                  <Text style={styles.dayName}>{d.weekday}</Text>
                </View>
                <Text style={styles.dayDate}>{d.date}</Text>
              </View>
              <View style={styles.dayBody}>
                {d.checked_in ? (
                  <>
                    <Text style={styles.ok}>Checked in</Text>
                    {d.check_in_at ? (
                      <Text style={styles.time}>{formatTime(d.check_in_at)}</Text>
                    ) : null}
                    {d.check_out_at ? (
                      <Text style={styles.timeOut}>Out {formatTime(d.check_out_at)}</Text>
                    ) : (
                      <Text style={styles.pendingOut}>Not checked out</Text>
                    )}
                  </>
                ) : d.status === 'leave' ? (
                  <Text style={[styles.statusLabel, styles.statusLeave]}>Leave</Text>
                ) : d.status === 'holiday' ? (
                  <Text style={[styles.statusLabel, styles.statusHoliday]}>Holiday</Text>
                ) : (
                  <Text style={styles.muted}>Absent / no check-in</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const leaveModal = (
    <Modal visible={leaveOpen} animationType="slide" transparent onRequestClose={() => setLeaveOpen(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setLeaveOpen(false)} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Request day off</Text>
          <Text style={styles.modalLabel}>Date</Text>
          {Platform.OS === 'web' ? (
            WebDateInput({
              value: leaveDate,
              min: ymdLocal(),
              onChange: setLeaveDate,
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
                  onChange={(ev, selected) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (ev.type === 'set' && selected) {
                      setLeaveDate(ymdLocal(selected));
                    }
                    if (Platform.OS === 'ios' && ev.type === 'dismissed') {
                      setShowDatePicker(false);
                    }
                  }}
                />
              ) : null}
            </>
          )}
          <Text style={styles.modalLabel}>Reason (optional)</Text>
          <TextInput
            style={styles.reasonInput}
            value={leaveReason}
            onChangeText={setLeaveReason}
            placeholder="e.g. family appointment"
            placeholderTextColor={theme.color.subtle}
            multiline
            numberOfLines={3}
          />
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

  return (
    <WorkModeShell desktopTitle="Schedule" desktopSubtitle="Attendance by day">
      <View style={{ flex: 1 }}>
        {body}
        {leaveModal}
      </View>
    </WorkModeShell>
  );
}

function WebDateInput({
  value,
  min,
  onChange,
}: {
  value: string;
  min: string;
  onChange: (ymd: string) => void;
}) {
  return React.createElement('input', {
    type: 'date',
    value,
    min,
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

function formatTime(iso: string) {
  try {
    return new Date(iso.replace(' ', 'T')).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 16 },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.color.helper,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  requestBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
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
    backgroundColor: theme.color.helperSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: { fontSize: 15, fontWeight: '800', color: theme.color.ink },
  cardList: { gap: 10 },
  dayCard: {
    borderRadius: 14,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
    padding: 14,
  },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dayHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dayName: { fontSize: 15, fontWeight: '800', color: theme.color.ink },
  dayDate: { fontSize: 13, color: theme.color.muted, fontWeight: '600' },
  dayBody: { gap: 4 },
  ok: { fontSize: 14, fontWeight: '700', color: theme.color.success },
  time: { fontSize: 13, color: theme.color.ink },
  timeOut: { fontSize: 13, color: theme.color.muted },
  pendingOut: { fontSize: 13, color: theme.color.warning, fontWeight: '600' },
  muted: { fontSize: 14, color: theme.color.muted },
  statusLabel: { fontSize: 14, fontWeight: '700' },
  statusLeave: { color: theme.color.warning },
  statusHoliday: { color: '#9333EA' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.color.overlay,
  },
  modalCard: {
    backgroundColor: theme.color.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: theme.color.ink, marginBottom: 16 },
  modalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.color.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datePickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  datePickText: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.color.ink },
  reasonInput: {
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.color.ink,
    minHeight: 88,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  modalCancelText: { color: theme.color.muted, fontWeight: '700' },
  modalSubmit: {
    backgroundColor: theme.color.helper,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  modalSubmitDisabled: { opacity: 0.6 },
  modalSubmitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
