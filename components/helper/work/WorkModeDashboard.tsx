import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import type { ThemeColor } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import { applicationContractPdfUrl, applicationTerminationRecordUrl } from '@/constants/applications';
import type { ActiveHire } from '@/contexts/HelperWorkModeContext';
import { fetchWeekAttendance, postAttendance, ymdLocal, type WeekDayAttendance } from '@/lib/helperWorkApi';
import { noticePeriodStillActive } from '@/lib/terminationApi';
import { fetchApplicationTasks, type ApplicationTask } from '@/lib/applicationTasksApi';
import { fetchAttendanceToday, formatAttendanceTime, type AttendanceToday } from '@/lib/attendanceApi';
import { attendanceDotBackground } from '@/lib/attendanceUi';
import { SectionHeader } from '@/components/helper/home/SectionHeader';
import { ConfirmationModal, EndEmploymentModal } from '@/components/shared';

type Props = {
  helperId: number;
  userFirstName: string;
  activeHire: ActiveHire;
  onRefreshWorkContext: () => Promise<void>;
};

export function WorkModeDashboard({
  helperId,
  userFirstName,
  activeHire,
  onRefreshWorkContext,
}: Props) {
  const router = useRouter();
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createWorkModeDashboardStyles(c), [c]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [weekDays, setWeekDays] = useState<WeekDayAttendance[]>([]);
  const [todayDetail, setTodayDetail] = useState<AttendanceToday | null>(null);
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [todayCheckedOut, setTodayCheckedOut] = useState(false);
  const [tasks, setTasks] = useState<ApplicationTask[]>([]);
  const [endModal, setEndModal] = useState(false);
  const [checkoutWarnVisible, setCheckoutWarnVisible] = useState(false);
  const [checkoutWarnMessage, setCheckoutWarnMessage] = useState('');

  const placementTerminationPending = noticePeriodStillActive(
    activeHire.placement_status === 'termination_pending',
    activeHire.termination_last_day,
    ymdLocal(),
  );
  const lastDay = activeHire.termination_last_day;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [att, todayRes, taskRes] = await Promise.all([
        fetchWeekAttendance(helperId, activeHire.application_id),
        fetchAttendanceToday(activeHire.application_id, helperId),
        fetchApplicationTasks(activeHire.application_id, helperId, 'helper'),
      ]);
      if (att.success && att.days) setWeekDays(att.days);

      if (todayRes.success && todayRes.data) {
        const d = todayRes.data;
        setTodayDetail(d);
        setTodayCheckedIn(!!d.checked_in);
        setTodayCheckedOut(!!d.checked_out);
      } else if (att.success && att.today) {
        const t = att.today;
        setTodayDetail({
          date: t.date,
          is_rest_day: false,
          checked_in: !!t.checked_in,
          checked_out: !!t.checked_out,
          checked_in_at: t.check_in_at,
          checked_out_at: t.check_out_at,
          status: null,
          log_id: null,
        });
        setTodayCheckedIn(!!t.checked_in);
        setTodayCheckedOut(!!t.checked_out);
      }

      if (taskRes.success && taskRes.data) setTasks(taskRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [helperId, activeHire.application_id]);

  useEffect(() => {
    load();
  }, [load]);

  const todayYmd = ymdLocal();
  const isRestNoCheckIn = !!todayDetail?.is_rest_day && !todayCheckedIn;
  const openTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'skipped');
  const dueToday = openTasks.filter((t) => !t.due_date || t.due_date === todayYmd);
  const todayTasks = dueToday.length > 0 ? dueToday : openTasks;

  const openMessages = () => {
    const q = new URLSearchParams({
      partner_id: String(activeHire.parent_id),
      partner_name: activeHire.employer_name || 'Employer',
      job_post_id: String(activeHire.job_post_id),
    });
    router.push(`/(helper)/messages?${q.toString()}` as any);
  };

  const openContract = async () => {
    const url = applicationContractPdfUrl(activeHire.application_id, helperId, 'helper');
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('Contract', 'Could not open the contract.');
    }
  };

  const openTerminationRecord = async () => {
    const url = applicationTerminationRecordUrl(activeHire.application_id, helperId, 'helper');
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('Record', 'Could not open the termination record.');
    }
  };

  const onCheckIn = async () => {
    setActionBusy(true);
    try {
      const res = await postAttendance(helperId, activeHire.application_id, 'check_in');
      if (!res.success) {
        Alert.alert('Check in', res.message || 'Failed');
        return;
      }
      setTodayCheckedIn(true);
      await load();
    } finally {
      setActionBusy(false);
    }
  };

  const buildCheckoutWarnings = (): string | null => {
    const parts: string[] = [];
    const incomplete = tasks.filter((t) => t.status !== 'done');
    if (incomplete.length > 0) {
      parts.push(
        `${incomplete.length} task(s) are not marked done yet (pending or skipped).`,
      );
    }
    const endAt = todayDetail?.expected_shift_end_at;
    if (endAt) {
      try {
        const endMs = new Date(endAt.replace(' ', 'T')).getTime();
        if (!Number.isNaN(endMs) && Date.now() < endMs) {
          const t = new Date(endMs).toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          });
          parts.push(`Your scheduled shift end is ${t}. You are checking out early.`);
        }
      } catch {
        /* ignore */
      }
    }
    if (parts.length === 0) return null;
    return parts.join('\n\n');
  };

  const runCheckOut = async () => {
    setActionBusy(true);
    try {
      const res = await postAttendance(helperId, activeHire.application_id, 'check_out');
      if (!res.success) {
        Alert.alert('Check out', res.message || 'Failed');
        return;
      }
      setTodayCheckedOut(true);
      await load();
    } finally {
      setActionBusy(false);
    }
  };

  const onCheckOut = () => {
    const warn = buildCheckoutWarnings();
    if (warn) {
      setCheckoutWarnMessage(warn);
      setCheckoutWarnVisible(true);
      return;
    }
    void runCheckOut();
  };

  const greeting = userFirstName ? `Hi, ${userFirstName}` : 'Hi';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.employerLine} numberOfLines={2}>
          {activeHire.employer_name ? `with ${activeHire.employer_name}` : 'Your placement'}
        </Text>
        <Text style={styles.jobTitle} numberOfLines={2}>
          {activeHire.job_title || 'Active role'}
        </Text>
      </View>

      {placementTerminationPending ? (
        <View style={styles.noticeBanner}>
          <Ionicons name="hourglass-outline" size={22} color={c.warning} />
          <Text style={styles.noticeBannerText}>
            Notice period in progress
            {lastDay
              ? ` · last working day ${new Date(lastDay.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
              : ''}
            . Work features stay available until then.
          </Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={c.helper} style={{ marginVertical: 24 }} />
      ) : (
        <>
          <View style={styles.weekRow}>
            {weekDays.map((d) => (
              <View key={d.date} style={styles.dayCol}>
                <Text style={styles.dayLbl}>{d.weekday.slice(0, 1)}</Text>
                <View
                  style={[
                    styles.dayDot,
                    { backgroundColor: attendanceDotBackground(d.status, d.checked_in) },
                  ]}
                />
              </View>
            ))}
          </View>

          {isRestNoCheckIn ? (
            <Text style={styles.restHint}>Scheduled rest day — no check-in required.</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.mainCta,
              !todayCheckedIn && !todayCheckedOut && !isRestNoCheckIn && styles.mainCtaIn,
              todayCheckedIn && !todayCheckedOut && styles.mainCtaOut,
              todayCheckedOut && styles.mainCtaDone,
              isRestNoCheckIn && styles.mainCtaRest,
            ]}
            onPress={() => {
              if (todayCheckedOut || isRestNoCheckIn) return;
              if (!todayCheckedIn) void onCheckIn();
              else void onCheckOut();
            }}
            disabled={actionBusy || todayCheckedOut || isRestNoCheckIn}
            activeOpacity={0.9}
          >
            {actionBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={
                    todayCheckedOut
                      ? 'checkmark-done'
                      : todayCheckedIn
                        ? 'log-out-outline'
                        : 'log-in-outline'
                  }
                  size={28}
                  color="#fff"
                />
                <Text style={styles.mainCtaText}>
                  {isRestNoCheckIn
                    ? 'Rest day'
                    : todayCheckedOut
                      ? 'Done for today'
                      : todayCheckedIn
                        ? 'Check out'
                        : 'Check in'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {todayCheckedIn && !todayCheckedOut && todayDetail?.checked_in_at ? (
            <Text style={styles.checkedInSub}>
              Checked in at {formatAttendanceTime(todayDetail.checked_in_at)}
            </Text>
          ) : null}
        </>
      )}

      <SectionHeader title="Today's tasks" />
      {todayTasks.length === 0 ? (
        <Text style={styles.emptyTasks}>No open tasks right now.</Text>
      ) : (
        <View style={styles.taskList}>
          {todayTasks.slice(0, 6).map((t) => (
            <View key={t.id} style={styles.taskRow}>
              <Ionicons
                name={t.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={t.status === 'done' ? c.success : c.muted}
              />
              <Text
                style={[styles.taskTitle, t.status === 'done' && styles.taskTitleDone]}
                numberOfLines={2}
              >
                {t.title}
              </Text>
            </View>
          ))}
        </View>
      )}
      {todayTasks.length > 6 ? (
        <TouchableOpacity onPress={() => router.push('/(helper)/work_tasks')}>
          <Text style={styles.link}>View all tasks</Text>
        </TouchableOpacity>
      ) : null}

      <SectionHeader title="Shortcuts" />
      <View style={styles.shortcuts}>
        <TouchableOpacity style={styles.shortcut} onPress={openMessages} activeOpacity={0.88}>
          <Ionicons name="chatbubbles-outline" size={22} color={c.helper} />
          <Text style={styles.shortcutText}>Messages</Text>
          <Ionicons name="chevron-forward" size={18} color={c.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shortcut} onPress={openContract} activeOpacity={0.88}>
          <Ionicons name="document-text-outline" size={22} color={c.helper} />
          <Text style={styles.shortcutText}>View contract</Text>
          <Ionicons name="chevron-forward" size={18} color={c.muted} />
        </TouchableOpacity>
        {!placementTerminationPending ? (
          <TouchableOpacity style={styles.shortcut} onPress={() => setEndModal(true)} activeOpacity={0.88}>
            <Ionicons name="hand-left-outline" size={22} color={c.danger} />
            <Text style={styles.shortcutText}>End employment</Text>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </TouchableOpacity>
        ) : null}
        {placementTerminationPending ? (
          <TouchableOpacity style={styles.shortcut} onPress={() => void openTerminationRecord()} activeOpacity={0.88}>
            <Ionicons name="download-outline" size={22} color={c.helper} />
            <Text style={styles.shortcutText}>Termination record</Text>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <EndEmploymentModal
        visible={endModal}
        onClose={() => setEndModal(false)}
        applicationId={activeHire.application_id}
        userId={helperId}
        userType="helper"
        counterpartyName={activeHire.employer_name || 'employer'}
        onSuccess={() => {
          void onRefreshWorkContext();
          void load();
        }}
      />

      <ConfirmationModal
        visible={checkoutWarnVisible}
        title="Check out anyway?"
        message={checkoutWarnMessage}
        type="warning"
        confirmText="Check out"
        cancelText="Stay checked in"
        onCancel={() => setCheckoutWarnVisible(false)}
        onConfirm={() => {
          setCheckoutWarnVisible(false);
          void runCheckOut();
        }}
      />

      <TouchableOpacity
        style={styles.refreshHint}
        onPress={() => {
          void onRefreshWorkContext();
          void load();
        }}
      >
        <Ionicons name="refresh-outline" size={16} color={c.muted} />
        <Text style={styles.refreshHintText}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createWorkModeDashboardStyles(c: ThemeColor) {
  return StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  hero: { marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: '900', color: c.ink, letterSpacing: -0.5 },
  employerLine: { fontSize: 15, color: c.muted, marginTop: 6 },
  jobTitle: { fontSize: 18, fontWeight: '800', color: c.helper, marginTop: 4 },
  noticeBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: c.warningSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: c.line,
  },
  noticeBannerText: { flex: 1, fontSize: 14, fontWeight: '600', color: c.ink, lineHeight: 20 },

  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  dayCol: { alignItems: 'center', gap: 6 },
  dayLbl: { fontSize: 11, fontWeight: '700', color: c.muted },
  dayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.line,
  },

  restHint: {
    fontSize: 14,
    color: c.muted,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  checkedInSub: {
    fontSize: 15,
    fontWeight: '700',
    color: c.ink,
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 24,
  },

  mainCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: c.helper,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 24,
  },
  mainCtaIn: { backgroundColor: c.success },
  mainCtaOut: { backgroundColor: c.danger },
  mainCtaDone: { backgroundColor: c.muted },
  mainCtaRest: { backgroundColor: c.muted },
  mainCtaText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  taskList: { gap: 10 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskTitle: { flex: 1, fontSize: 15, color: c.ink, fontWeight: '600' },
  taskTitleDone: { textDecorationLine: 'line-through', color: c.muted },
  emptyTasks: { fontSize: 14, color: c.muted, marginBottom: 8 },

  shortcuts: { gap: 10 },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.line,
  },
  shortcutText: { flex: 1, fontSize: 15, fontWeight: '700', color: c.ink },
  link: {
    fontSize: 14,
    fontWeight: '700',
    color: c.helper,
    marginTop: 10,
    marginBottom: 8,
  },
  refreshHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 20,
  },
  refreshHintText: { fontSize: 13, color: c.muted, fontWeight: '600' },
});
}
