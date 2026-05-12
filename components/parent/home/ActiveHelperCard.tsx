import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import type { ThemeColor } from '@/constants/theme';
import { theme } from '@/constants/theme';
import { useParentTheme } from '@/contexts/ParentThemeContext';
import type { ActivePlacement } from '@/hooks/parent/useParentActivePlacements';
import {
  fetchAttendanceToday,
  fetchAttendanceWeek,
  formatAttendanceTime,
  type AttendanceDay,
  type AttendanceToday,
} from '@/lib/attendanceApi';
import { attendanceDotBackground } from '@/lib/attendanceUi';
import { applicationContractPdfUrl, applicationTerminationRecordUrl } from '@/constants/applications';
import { EndEmploymentModal, SubmitComplaintModal } from '@/components/shared';
import { mondayOfWeekContaining, ymdLocal } from '@/lib/helperWorkApi';
import {
  isTerminationPendingStatus,
  noticePeriodStillActive,
} from '@/lib/terminationApi';
import {
  currentPayPeriodYmd,
  isSalaryMarkedForPeriod,
  markSalaryPaidForPeriod,
} from '@/lib/parentSalaryMark';

type Props = {
  placement: ActivePlacement;
  parentId: number;
  compact?: boolean;
  onPlacementChanged?: () => void;
};

function createActiveHelperCardStyles(t: ThemeColor) {
  return StyleSheet.create({
  card: {
    backgroundColor: t.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: t.line,
    marginBottom: 14,
    ...theme.shadow.card,
  },
  cardCompact: { padding: 12 },
  topRow: { flexDirection: 'row', gap: 12 },
  avatarWrap: {},
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: t.surface,
  },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '800', color: t.ink },
  jobTitle: { fontSize: 14, fontWeight: '600', color: t.parent, marginTop: 2 },
  meta: { fontSize: 12, color: t.muted, marginTop: 4 },
  statusBox: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: t.parentSoft,
    borderRadius: 10,
  },
  termBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: t.warningSoft,
    borderWidth: 1,
    borderColor: t.line,
  },
  termBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: t.ink, lineHeight: 18 },
  statusLabel: { fontSize: 11, fontWeight: '700', color: t.muted, marginBottom: 4 },
  statusOk: { fontSize: 14, fontWeight: '600', color: t.success },
  statusWarn: { fontSize: 14, fontWeight: '600', color: t.warning },
  statusInfo: { fontSize: 14, fontWeight: '600', color: t.info },
  statusMuted: { fontSize: 13, color: t.muted },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  dayCol: { alignItems: 'center', flex: 1 },
  dayLbl: { fontSize: 10, color: t.muted, marginBottom: 4 },
  dayDot: { width: 10, height: 10, borderRadius: 5 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.line,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: t.ink },
  payRow: { marginTop: 12 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.line,
  },
  payBtnDone: {
    backgroundColor: t.successSoft,
    borderColor: t.success + '44',
  },
  payBtnText: { fontSize: 14, fontWeight: '700', color: t.ink },
  payBtnTextDone: { color: t.success },
  });
}

function formatStartDate(d?: string | null) {
  if (!d) return '—';
  try {
    const x = new Date(d.replace(' ', 'T'));
    if (Number.isNaN(x.getTime())) return d;
    return x.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
}

export function ActiveHelperCard({ placement, parentId, compact, onPlacementChanged }: Props) {
  const { color: t } = useParentTheme();
  const styles = useMemo(() => createActiveHelperCardStyles(t), [t]);
  const router = useRouter();
  const appId = Number(placement.application_id);
  const helperId = Number(placement.helper_id);

  const [today, setToday] = useState<AttendanceToday | null>(null);
  const [weekDays, setWeekDays] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [salaryMarked, setSalaryMarked] = useState(false);
  const [endModal, setEndModal] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const period = currentPayPeriodYmd();
  const terminationPending = noticePeriodStillActive(
    isTerminationPendingStatus(placement.status),
    placement.termination_last_day,
    ymdLocal(),
  );
  const canInitiateTermination =
    (placement.status === 'hired' || placement.status === 'Accepted') && !terminationPending;

  const load = useCallback(async () => {
    if (!appId || !parentId || !helperId) return;
    setLoading(true);
    try {
      const [tRes, wRes, marked] = await Promise.all([
        fetchAttendanceToday(appId, helperId),
        fetchAttendanceWeek(appId, parentId, 'parent', mondayOfWeekContaining(ymdLocal())),
        isSalaryMarkedForPeriod(placement.application_id, period),
      ]);
      if (tRes.success && tRes.data) setToday(tRes.data);
      if (wRes.success && wRes.days) setWeekDays(wRes.days);
      setSalaryMarked(marked);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [appId, parentId, helperId, placement.application_id, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayLine = () => {
    if (loading && !today) {
      return <Text style={styles.statusMuted}>Loading status…</Text>;
    }
    if (!today) return <Text style={styles.statusMuted}>No attendance data yet.</Text>;
    if (today.is_rest_day) {
      return <Text style={styles.statusInfo}>Rest day</Text>;
    }
    if (today.checked_in && today.checked_in_at) {
      return (
        <Text style={styles.statusOk}>
          Checked in at {formatAttendanceTime(today.checked_in_at)}
        </Text>
      );
    }
    return <Text style={styles.statusWarn}>Not yet checked in</Text>;
  };

  const openContract = async () => {
    const url = applicationContractPdfUrl(appId, parentId, 'parent');
    try {
      if (Platform.OS === 'web') {
        Linking.openURL(url);
        return;
      }
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('Contract', 'Could not open the contract PDF.');
    }
  };

  const openTerminationRecord = async () => {
    const url = applicationTerminationRecordUrl(appId, parentId, 'parent');
    try {
      if (Platform.OS === 'web') {
        Linking.openURL(url);
        return;
      }
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('Record', 'Could not open the termination record.');
    }
  };

  const onMarkSalary = () => {
    Alert.alert(
      'Mark salary paid',
      `Confirm you have paid salary for ${placement.helper_name} for ${period}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await markSalaryPaidForPeriod(placement.application_id, period);
            setSalaryMarked(true);
          },
        },
      ],
    );
  };

  const go = (pathname: string) => {
    router.push({
      pathname: pathname as never,
      params: {
        application_id: String(placement.application_id),
        helper_name: encodeURIComponent(placement.helper_name),
      },
    } as never);
  };

  const salaryLabel = () => {
    if (placement.salary_offered == null) return null;
    const p = placement.salary_period ? ` / ${placement.salary_period}` : '';
    return `₱${Number(placement.salary_offered).toLocaleString()}${p}`;
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.topRow}>
        <View style={styles.avatarWrap}>
          {placement.helper_photo ? (
            <Image source={{ uri: placement.helper_photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPh]}>
              <Ionicons name="person" size={28} color={t.subtle} />
            </View>
          )}
        </View>
        <View style={styles.headText}>
          <Text style={styles.name} numberOfLines={1}>
            {placement.helper_name}
          </Text>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {placement.job_title}
          </Text>
          <Text style={styles.meta}>
            Started {formatStartDate(placement.job_start_date)}
            {salaryLabel() ? ` · ${salaryLabel()}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Today</Text>
        {todayLine()}
      </View>

      {terminationPending ? (
        <View style={styles.termBanner}>
          <Ionicons name="hourglass-outline" size={20} color={t.warning} />
          <Text style={styles.termBannerText}>
            Ending employment — your helper can continue using work tools through their last working day.
          </Text>
        </View>
      ) : null}

      {!compact && (
        <View style={styles.weekRow}>
          {loading && weekDays.length === 0 ? (
            <ActivityIndicator size="small" color={t.parent} />
          ) : (
            weekDays.map((d) => (
              <View key={d.date} style={styles.dayCol}>
                <Text style={styles.dayLbl}>{d.weekday.slice(0, 1)}</Text>
                <View
                  style={[
                    styles.dayDot,
                    { backgroundColor: attendanceDotBackground(d.status, d.checked_in) },
                  ]}
                />
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.chip} onPress={() => go('/(parent)/placement_tasks')}>
          <Ionicons name="list-outline" size={16} color={t.parent} />
          <Text style={styles.chipText}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chip}
          onPress={() => go('/(parent)/placement_attendance')}
        >
          <Ionicons name="calendar-outline" size={16} color={t.parent} />
          <Text style={styles.chipText}>Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chip}
          onPress={() => go('/(parent)/placement_leave_requests')}
        >
          <Ionicons name="calendar-number-outline" size={16} color={t.parent} />
          <Text style={styles.chipText}>Leave</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => void openContract()}>
          <Ionicons name="document-text-outline" size={16} color={t.parent} />
          <Text style={styles.chipText}>Contract</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => setComplaintOpen(true)}>
          <Ionicons name="flag-outline" size={16} color={t.warning} />
          <Text style={styles.chipText}>Report issue</Text>
        </TouchableOpacity>
        {canInitiateTermination ? (
          <TouchableOpacity style={styles.chip} onPress={() => setEndModal(true)}>
            <Ionicons name="hand-left-outline" size={16} color={t.danger} />
            <Text style={styles.chipText}>End employment</Text>
          </TouchableOpacity>
        ) : null}
        {terminationPending ? (
          <TouchableOpacity style={styles.chip} onPress={() => void openTerminationRecord()}>
            <Ionicons name="download-outline" size={16} color={t.parent} />
            <Text style={styles.chipText}>Termination record</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <EndEmploymentModal
        visible={endModal}
        onClose={() => setEndModal(false)}
        applicationId={appId}
        userId={parentId}
        userType="parent"
        counterpartyName={placement.helper_name || 'helper'}
        onSuccess={() => {
          void load();
          onPlacementChanged?.();
        }}
      />

      <View style={styles.payRow}>
        <TouchableOpacity
          style={[styles.payBtn, salaryMarked && styles.payBtnDone]}
          onPress={onMarkSalary}
          disabled={salaryMarked}
        >
          <Ionicons
            name={salaryMarked ? 'checkmark-circle' : 'cash-outline'}
            size={18}
            color={salaryMarked ? t.success : t.ink}
          />
          <Text style={[styles.payBtnText, salaryMarked && styles.payBtnTextDone]}>
            {salaryMarked ? `Paid (${period})` : `Mark salary paid (${period})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
