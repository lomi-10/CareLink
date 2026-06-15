import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  DARK,
  MUTED,
  SUBTLE,
  ORANGE,
  GREEN,
  BLUE,
  DIVIDER,
  ICON_BG,
  SURFACE,
  SUCCESS_BG,
  WARNING_BG,
  DANGER,
  DANGER_BG,
  INFO_BG,
} from '@/components/helper/home/helperWarmTheme';
import { applicationContractPdfUrl, applicationTerminationRecordUrl } from '@/constants/applications';
import type { ActiveHire } from '@/contexts/HelperWorkModeContext';
import { fetchWeekAttendance, postAttendance, ymdLocal, type WeekDayAttendance } from '@/lib/helperWorkApi';
import { noticePeriodStillActive } from '@/lib/terminationApi';
import { fetchApplicationTasks, type ApplicationTask } from '@/lib/applicationTasksApi';
import { fetchAttendanceToday, formatAttendanceTime, type AttendanceToday } from '@/lib/attendanceApi';
import { attendanceDayCellType, weekDotState, nextRestDayYmd, type WeekDotState } from '@/lib/attendanceUi';
import { fetchLeaveRequests, type LeaveRequestRow, labelForLeaveReasonCode } from '@/lib/leaveRequestsApi';
import { useConversations } from '@/hooks/shared';
import { ConfirmationModal, EndEmploymentModal, SubmitComplaintModal } from '@/components/shared';

type Props = {
  helperId: number;
  userFirstName: string;
  userFullName?: string;
  activeHire: ActiveHire;
  profileImage?: string | null;
  verified?: boolean;
  onRefreshWorkContext: () => Promise<void>;
};

function formatLongDate(ymd: string | null | undefined): string | null {
  if (!ymd) return null;
  try {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return ymd;
  }
}

export function WorkModeDashboard({
  helperId,
  userFirstName,
  userFullName,
  activeHire,
  profileImage,
  verified,
  onRefreshWorkContext,
}: Props) {
  const router = useRouter();
  const styles = useMemo(() => createWorkModeDashboardStyles(), []);
  const { conversations } = useConversations();

  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [weekDays, setWeekDays] = useState<WeekDayAttendance[]>([]);
  const [employmentStartDate, setEmploymentStartDate] = useState<string | null>(null);
  const [todayDetail, setTodayDetail] = useState<AttendanceToday | null>(null);
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [todayCheckedOut, setTodayCheckedOut] = useState(false);
  const [tasks, setTasks] = useState<ApplicationTask[]>([]);
  const [upcomingLeave, setUpcomingLeave] = useState<LeaveRequestRow | null>(null);
  const [endModal, setEndModal] = useState(false);
  const [checkoutWarnVisible, setCheckoutWarnVisible] = useState(false);
  const [checkoutWarnMessage, setCheckoutWarnMessage] = useState('');
  const [complaintModalVisible, setComplaintModalVisible] = useState(false);

  const placementTerminationPending = noticePeriodStillActive(
    activeHire.placement_status === 'termination_pending',
    activeHire.termination_last_day,
    ymdLocal(),
  );
  const lastDay = activeHire.termination_last_day;

  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [att, todayRes, taskRes, leaveRes] = await Promise.all([
        fetchWeekAttendance(helperId, activeHire.application_id),
        fetchAttendanceToday(activeHire.application_id, helperId),
        fetchApplicationTasks(activeHire.application_id, helperId, 'helper'),
        fetchLeaveRequests(activeHire.application_id, helperId, 'helper'),
      ]);
      if (att.success && att.days) {
        setWeekDays(att.days);
        setEmploymentStartDate(att.employment_start_date ?? null);
      }

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

      if (leaveRes.success && leaveRes.data) {
        const todayYmd = ymdLocal();
        const upcoming = leaveRes.data
          .filter((l) => l.status === 'approved' && l.date >= todayYmd)
          .sort((a, b) => a.date.localeCompare(b.date));
        setUpcomingLeave(upcoming[0] ?? null);
      }
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
  const beforeStart = !!activeHire.employment_start_date && todayYmd < activeHire.employment_start_date;
  const isRestNoCheckIn = !!todayDetail?.is_rest_day && !todayCheckedIn;
  const openTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'skipped');
  const dueToday = openTasks.filter((t) => !t.due_date || t.due_date === todayYmd);
  const todayTasks = dueToday.length > 0 ? dueToday : openTasks;
  const todayDoneCount = tasks.filter((t) => t.status === 'done').length;
  const todayTotalCount = tasks.length;

  const upcomingRestDayYmd = useMemo(() => {
    if (beforeStart) {
      return nextRestDayYmd(activeHire.rest_days, activeHire.employment_start_date as string);
    }
    const fromWeek = weekDays.find((d) => d.date >= todayYmd && attendanceDayCellType(d) === 'rest');
    if (fromWeek) return fromWeek.date;
    return nextRestDayYmd(activeHire.rest_days, todayYmd);
  }, [weekDays, activeHire.rest_days, activeHire.employment_start_date, todayYmd, beforeStart]);

  const presentCount = weekDays.filter((d) => weekDotState(d) === 'present').length;
  const scheduledWorkdays = weekDays.filter((d) => attendanceDayCellType(d) !== 'rest').length;
  const attendanceEncouragement =
    scheduledWorkdays === 0
      ? 'No work days scheduled this week.'
      : presentCount >= scheduledWorkdays
        ? "Great job — you're on track this week!"
        : 'Keep it up — check in on your scheduled work days.';

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    [],
  );

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

  // ── "Today's work" status pill ────────────────────────────────────────────
  let statusLabel: string;
  let statusBg: string;
  let statusColor: string;
  if (beforeStart) {
    statusLabel = `Starts ${formatLongDate(activeHire.employment_start_date) || ''}`;
    statusBg = INFO_BG;
    statusColor = BLUE;
  } else if (isRestNoCheckIn) {
    statusLabel = 'Rest Day';
    statusBg = DIVIDER;
    statusColor = MUTED;
  } else if (todayCheckedOut) {
    statusLabel = 'Done for Today';
    statusBg = DIVIDER;
    statusColor = MUTED;
  } else if (todayCheckedIn) {
    statusLabel = todayDetail?.checked_in_at
      ? `Checked In at ${formatAttendanceTime(todayDetail.checked_in_at)}`
      : 'Checked In';
    statusBg = SUCCESS_BG;
    statusColor = GREEN;
  } else {
    statusLabel = 'Not Checked In Yet';
    statusBg = DANGER_BG;
    statusColor = DANGER;
  }

  const heroName = userFullName || userFirstName || 'Helper';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* A — Current Employment hero card */}
      <LinearGradient
        colors={['#6B2E0A', '#3B1508', '#1E0A04']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.avatarWrap}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={28} color={SUBTLE} />
              </View>
            )}
            {verified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#fff" />
              </View>
            ) : null}
          </View>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroName} numberOfLines={1}>{heroName}</Text>
            <Text style={styles.heroJobTitle} numberOfLines={1}>{activeHire.job_title || 'Active role'}</Text>
            <Text style={styles.heroEmployer} numberOfLines={1}>
              {activeHire.employer_name ? `with ${activeHire.employer_name}` : 'Your placement'}
            </Text>
          </View>
        </View>

        <View style={styles.heroStatusPill}>
          <View style={styles.heroStatusDot} />
          <Text style={styles.heroStatusText}>Active Employment</Text>
        </View>

        <View style={styles.heroDetailsRow}>
          <View style={styles.heroDetailCol}>
            <Text style={styles.heroDetailLabel}>Start Date</Text>
            <Text style={styles.heroDetailValue}>{formatLongDate(employmentStartDate) || '—'}</Text>
          </View>
          <View style={styles.heroDetailCol}>
            <Text style={styles.heroDetailLabel}>Work Location</Text>
            <Text style={styles.heroDetailValue} numberOfLines={1}>
              {activeHire.work_location || 'Not specified'}
            </Text>
          </View>
        </View>

        {verified ? (
          <View style={styles.heroVerifiedRow}>
            <Ionicons name="shield-checkmark" size={14} color={styles.heroVerifiedIconColor.color} />
            <Text style={styles.heroVerifiedText}>PESO-Verified — your employment is verified</Text>
          </View>
        ) : null}
      </LinearGradient>

      {placementTerminationPending ? (
        <View style={styles.noticeBanner}>
          <Ionicons name="hourglass-outline" size={20} color={ORANGE} />
          <Text style={styles.noticeBannerText}>
            Notice period in progress
            {lastDay ? ` · last working day ${formatLongDate(lastDay)}` : ''}
            . Work features stay available until then.
          </Text>
        </View>
      ) : null}

      {beforeStart ? (
        <View style={[styles.noticeBanner, { backgroundColor: INFO_BG }]}>
          <Ionicons name="information-circle-outline" size={20} color={BLUE} />
          <Text style={styles.noticeBannerText}>
            This is a preview of your placement. Check in/out unlocks on{' '}
            {formatLongDate(activeHire.employment_start_date)}.
          </Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={ORANGE} style={{ marginVertical: 24 }} />
      ) : (
        <>
          {/* B — Today's work */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="time-outline" size={18} color={ORANGE} />
              <Text style={styles.cardHeaderTitle}>TODAY'S WORK</Text>
            </View>

            <View style={styles.todayInfoRow}>
              <View>
                <Text style={styles.todayInfoLabel}>Scheduled Hours</Text>
                <Text style={styles.todayInfoValue}>{activeHire.work_hours || 'Not set'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.todayInfoLabel}>Today</Text>
                <Text style={styles.todayInfoValue}>{todayLabel}</Text>
              </View>
            </View>

            <View style={[styles.statusPill, { backgroundColor: statusBg, alignSelf: 'flex-start' }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.mainCta,
                beforeStart && styles.mainCtaRest,
                !beforeStart && !todayCheckedIn && !todayCheckedOut && !isRestNoCheckIn && styles.mainCtaIn,
                !beforeStart && todayCheckedIn && !todayCheckedOut && styles.mainCtaOut,
                !beforeStart && todayCheckedOut && styles.mainCtaDone,
                !beforeStart && isRestNoCheckIn && styles.mainCtaRest,
              ]}
              onPress={() => {
                if (beforeStart || todayCheckedOut || isRestNoCheckIn) return;
                if (!todayCheckedIn) void onCheckIn();
                else void onCheckOut();
              }}
              disabled={actionBusy || beforeStart || todayCheckedOut || isRestNoCheckIn}
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
                        : todayCheckedOut
                          ? 'checkmark-done'
                          : todayCheckedIn
                            ? 'log-out-outline'
                            : 'log-in-outline'
                    }
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.mainCtaText}>
                    {beforeStart
                      ? `Starts ${formatLongDate(activeHire.employment_start_date) || ''}`
                      : isRestNoCheckIn
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

            {isRestNoCheckIn ? (
              <Text style={styles.restHint}>Scheduled rest day — no check-in required.</Text>
            ) : null}
          </View>

          {/* C — This week's attendance */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={18} color={ORANGE} />
              <Text style={styles.cardHeaderTitle}>THIS WEEK'S ATTENDANCE</Text>
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

            <View style={styles.legendRow}>
              <LegendItem styles={styles} state="present" label="Present" />
              <LegendItem styles={styles} state="scheduled" label="Scheduled" />
              <LegendItem styles={styles} state="missed" label="Missed" />
            </View>
          </View>

          {/* D — Today's tasks */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="clipboard-outline" size={18} color={ORANGE} />
              <Text style={styles.cardHeaderTitle}>TODAY'S TASKS</Text>
            </View>

            {todayTotalCount > 0 ? (
              <Text style={styles.tasksProgress}>{todayDoneCount} of {todayTotalCount} completed</Text>
            ) : null}

            {todayTasks.length === 0 ? (
              <Text style={styles.emptyText}>No open tasks right now.</Text>
            ) : (
              <View style={styles.taskList}>
                {todayTasks.slice(0, 6).map((t) => {
                  const done = t.status === 'done';
                  return (
                    <View key={t.id} style={styles.taskRow}>
                      <Ionicons
                        name={done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={done ? GREEN : SUBTLE}
                      />
                      <Text
                        style={[styles.taskTitle, done && styles.taskTitleDone]}
                        numberOfLines={2}
                      >
                        {t.title}
                      </Text>
                      {done ? (
                        <View style={styles.donePill}>
                          <Text style={styles.donePillText}>Done</Text>
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity onPress={() => router.push('/(helper)/work/tasks')}>
              <Text style={styles.link}>View all tasks</Text>
            </TouchableOpacity>
          </View>

          {/* E — Upcoming */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="notifications-outline" size={18} color={ORANGE} />
              <Text style={styles.cardHeaderTitle}>UPCOMING</Text>
            </View>

            {upcomingRestDayYmd || upcomingLeave ? (
              <View style={{ gap: 10 }}>
                {upcomingRestDayYmd ? (
                  <View style={styles.upcomingRow}>
                    <View style={[styles.upcomingIconWrap, { backgroundColor: ICON_BG }]}>
                      <Ionicons name="bed-outline" size={18} color={ORANGE} />
                    </View>
                    <View style={styles.upcomingTextCol}>
                      <Text style={styles.upcomingTitle}>Rest Day</Text>
                      <Text style={styles.upcomingSub}>{formatLongDate(upcomingRestDayYmd)}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: DIVIDER }]}>
                      <Text style={[styles.pillText, { color: MUTED }]}>Scheduled</Text>
                    </View>
                  </View>
                ) : null}

                {upcomingLeave ? (
                  <View style={styles.upcomingRow}>
                    <View style={[styles.upcomingIconWrap, { backgroundColor: SUCCESS_BG }]}>
                      <Ionicons name="airplane-outline" size={18} color={GREEN} />
                    </View>
                    <View style={styles.upcomingTextCol}>
                      <Text style={styles.upcomingTitle} numberOfLines={1}>
                        Approved Leave — {labelForLeaveReasonCode(upcomingLeave.reason_code)}
                      </Text>
                      <Text style={styles.upcomingSub}>{formatLongDate(upcomingLeave.date)}</Text>
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

          {/* F — Quick actions */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="flash-outline" size={18} color={ORANGE} />
              <Text style={styles.cardHeaderTitle}>QUICK ACTIONS</Text>
            </View>

            <View style={styles.quickGrid}>
              <TouchableOpacity style={styles.quickTile} onPress={openMessages} activeOpacity={0.88}>
                {unreadMessages > 0 ? (
                  <View style={styles.quickBadge}>
                    <Text style={styles.quickBadgeText}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
                  </View>
                ) : null}
                <View style={[styles.quickIconWrap, { backgroundColor: ICON_BG }]}>
                  <Ionicons name="chatbubbles-outline" size={22} color={ORANGE} />
                </View>
                <Text style={styles.quickLabel}>Message Employer</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickTile} onPress={() => void openContract()} activeOpacity={0.88}>
                <View style={[styles.quickIconWrap, { backgroundColor: INFO_BG }]}>
                  <Ionicons name="document-text-outline" size={22} color={BLUE} />
                </View>
                <Text style={styles.quickLabel}>View Contract</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickTile}
                onPress={() => router.push('/(helper)/work?action=request-leave' as any)}
                activeOpacity={0.88}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: SUCCESS_BG }]}>
                  <Ionicons name="airplane-outline" size={22} color={GREEN} />
                </View>
                <Text style={styles.quickLabel}>Request Leave</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickTile}
                onPress={() => router.push('/(helper)/work')}
                activeOpacity={0.88}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: ICON_BG }]}>
                  <Ionicons name="calendar-outline" size={22} color={ORANGE} />
                </View>
                <Text style={styles.quickLabel}>View Attendance</Text>
              </TouchableOpacity>
            </View>

            {!placementTerminationPending ? (
              <TouchableOpacity style={styles.actionRow} onPress={() => setEndModal(true)} activeOpacity={0.88}>
                <Ionicons name="hand-left-outline" size={20} color={DANGER} />
                <Text style={[styles.actionRowText, { color: DANGER }]}>End Employment</Text>
                <Ionicons name="chevron-forward" size={18} color={SUBTLE} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.actionRow} onPress={() => void openTerminationRecord()} activeOpacity={0.88}>
                <Ionicons name="download-outline" size={20} color={MUTED} />
                <Text style={styles.actionRowText}>Termination Record</Text>
                <Ionicons name="chevron-forward" size={18} color={SUBTLE} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionRow} onPress={() => setComplaintModalVisible(true)} activeOpacity={0.88}>
              <Ionicons name="alert-circle-outline" size={20} color={MUTED} />
              <Text style={styles.actionRowText}>Submit a Complaint</Text>
              <Ionicons name="chevron-forward" size={18} color={SUBTLE} />
            </TouchableOpacity>
          </View>
        </>
      )}

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

      <SubmitComplaintModal
        visible={complaintModalVisible}
        onClose={() => setComplaintModalVisible(false)}
        applicationId={activeHire.application_id}
        userType="helper"
        counterpartyLabel={activeHire.employer_name}
      />

      <TouchableOpacity
        style={styles.refreshHint}
        onPress={() => {
          void onRefreshWorkContext();
          void load();
        }}
      >
        <Ionicons name="refresh-outline" size={16} color={MUTED} />
        <Text style={styles.refreshHintText}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

type DashboardStyles = ReturnType<typeof createWorkModeDashboardStyles>;

function WeekDot({ state, styles }: { state: WeekDotState; styles: DashboardStyles }) {
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

function LegendItem({
  styles,
  state,
  label,
}: {
  styles: DashboardStyles;
  state: WeekDotState;
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <WeekDot state={state} styles={styles} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function createWorkModeDashboardStyles() {
  const CARD_SHADOW = Platform.select({
    ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
    android: { elevation: 3 },
    default: { boxShadow: '0 4px 16px rgba(139,94,60,0.10)' } as any,
  });

  return StyleSheet.create({
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 32 },

    // ── Hero card ──────────────────────────────────────────────────────────
    hero: {
      borderRadius: 20,
      padding: 18,
      marginBottom: 14,
      ...CARD_SHADOW,
    },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatarWrap: { position: 'relative' },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarFallback: { backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    verifiedBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: GREEN,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: DARK,
    },
    heroTextCol: { flex: 1, gap: 2 },
    heroName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: '#fff' },
    heroJobTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: ORANGE },
    heroEmployer: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: SUBTLE },

    heroStatusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginTop: 14,
    },
    heroStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
    heroStatusText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#fff' },

    heroDetailsRow: { flexDirection: 'row', marginTop: 16, gap: 24 },
    heroDetailCol: { flex: 1, gap: 2 },
    heroDetailLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.5 },
    heroDetailValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

    heroVerifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
    heroVerifiedIconColor: { color: '#4ADE80' },
    heroVerifiedText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: '#4ADE80' },

    // ── Notice banner ──────────────────────────────────────────────────────
    noticeBanner: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      backgroundColor: WARNING_BG,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
    },
    noticeBannerText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK, lineHeight: 19 },

    // ── Generic white card ─────────────────────────────────────────────────
    card: {
      backgroundColor: SURFACE,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      ...CARD_SHADOW,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    cardHeaderTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: MUTED, letterSpacing: 0.5 },

    // ── Today's work ───────────────────────────────────────────────────────
    todayInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    todayInfoLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },
    todayInfoValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginTop: 2 },

    statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14 },
    statusPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },

    mainCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 16,
      borderRadius: 14,
    },
    mainCtaIn: { backgroundColor: ORANGE },
    mainCtaOut: { backgroundColor: GREEN },
    mainCtaDone: { backgroundColor: DANGER },
    mainCtaRest: { backgroundColor: SUBTLE },
    mainCtaText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 16 },

    restHint: {
      fontFamily: FontFamily.fredokaRegular,
      fontSize: 13,
      color: MUTED,
      textAlign: 'center',
      marginTop: 10,
    },

    // ── This week's attendance ─────────────────────────────────────────────
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    dayCol: { alignItems: 'center', gap: 6 },
    dayLbl: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: MUTED },
    weekDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekDotPresent: { backgroundColor: GREEN },
    weekDotScheduled: { backgroundColor: 'transparent', borderWidth: 2, borderColor: SUBTLE },
    weekDotMissed: { backgroundColor: DANGER },

    daysWorkedText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 2 },
    encourageText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 14 },

    legendRow: { flexDirection: 'row', gap: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },

    // ── Today's tasks ──────────────────────────────────────────────────────
    tasksProgress: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 10 },
    taskList: { gap: 10, marginBottom: 6 },
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    taskTitle: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK },
    taskTitleDone: { textDecorationLine: 'line-through', color: MUTED },
    donePill: { backgroundColor: SUCCESS_BG, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    donePillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: GREEN },
    emptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },
    link: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: ORANGE, marginTop: 6 },

    // ── Upcoming ───────────────────────────────────────────────────────────
    upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    upcomingIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    upcomingTextCol: { flex: 1, gap: 2 },
    upcomingTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
    upcomingSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
    pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    pillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

    // ── Quick actions ──────────────────────────────────────────────────────
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
    quickTile: {
      flexBasis: '47%',
      flexGrow: 1,
      backgroundColor: ICON_BG + '55',
      borderRadius: 14,
      padding: 14,
      gap: 8,
      position: 'relative',
    },
    quickIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
    quickBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: DANGER,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      zIndex: 1,
    },
    quickBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: '#fff' },

    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: DIVIDER,
    },
    actionRowText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },

    // ── Footer ─────────────────────────────────────────────────────────────
    refreshHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'center',
      marginTop: 8,
    },
    refreshHintText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
  });
}
