// app/(parent)/hire/helper_profile.tsx
// Parent Work Mode — Helper Profile (Overview · Attendance · Payroll)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, CARAMEL, DARK, MUTED,
  DIVIDER, ICON_BG, GREEN, DANGER,
} from '@/components/parent/home/parentWarmTheme';
import { ParentWorkModeTabBar } from '@/components/parent/home';
import { useAuth } from '@/hooks/shared';
import {
  fetchAttendanceToday, fetchAttendanceMonth,
  type AttendanceMonthSummary, type AttendanceToday, type AttendanceDay,
  type AttendanceLeaveBalance,
} from '@/lib/attendanceApi';
import { fetchApplicationTasks, type ApplicationTask } from '@/lib/applicationTasksApi';

// ── Palette ───────────────────────────────────────────────────────────────
const HERO_GR    = ['#F6D9AE', '#E2A968', '#C5853E'] as const;
const CARD_GR    = ['#FFFDF9', '#FEF5E0'] as const;
const NAVY       = '#1E2A4A';
const ORANGE     = '#D97706';
const GREEN_BG   = '#DCFCE7';
const YELLOW     = '#F59E0B';
const ORANGE_BG  = '#FEF3C7';
const GRAY_DOT   = '#9CA3AF';
const CHART_BG   = '#EDE9E3';
const NAVY_TODAY = '#2563EB';

// Calendar diagonal-shade colors (green=present, yellow=late, red=absent, gray=leave)
const CAL_PRESENT = '#22C55E';
const CAL_LATE    = '#F59E0B';
const CAL_ABSENT  = '#DC2626';
const CAL_LEAVE   = '#9CA3AF';
const CAL_DAYOFF  = '#78350F';

// ── Types ─────────────────────────────────────────────────────────────────
type ContractTerms = {
  work_schedule?: string | null;
  work_hours?: string | null;
  employment_start_date?: string | null;
  employment_end_date?: string | null;
  confirmed_salary?: number | null;
  payment_schedule?: string | null;
  vacation_leave_days?: number | null;
  sick_leave_days?: number | null;
  rest_days?: string[] | null;
  overtime_rate?: string | null;
  other_benefits?: string | null;
  contract_duration?: string | null;
};

// ── Utils ─────────────────────────────────────────────────────────────────
function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
}

function formatDateLong(ymd: string): string {
  try {
    const d = new Date(ymd.replace(/-/g, '/'));
    if (isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return ymd; }
}

function formatShortDate(ymd: string): string {
  try {
    const d = new Date(ymd.replace(/-/g, '/'));
    if (isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return ymd; }
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function employmentDuration(startYmd: string | null | undefined, endYmd?: string | null): string {
  if (!startYmd) return '';
  try {
    const start = new Date(startYmd.replace(/-/g, '/'));
    const end = endYmd ? new Date(endYmd.replace(/-/g, '/')) : new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months < 1) return 'Less than a month';
    if (months === 1) return '1 month';
    if (months < 12) return `${months} months`;
    const yrs = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${yrs} yr ${rem} mo` : `${yrs} yr`;
  } catch { return ''; }
}

function computeNextPayday(paymentSchedule: string | null | undefined): string {
  const today = new Date();
  const schedule = (paymentSchedule ?? 'monthly').toLowerCase();
  let paydate: Date;
  if (schedule === 'weekly') {
    const dow = today.getDay();
    const daysUntilFri = dow <= 5 ? (5 - dow || 7) : 6;
    paydate = new Date(today);
    paydate.setDate(today.getDate() + daysUntilFri);
  } else if (schedule === 'daily') {
    paydate = new Date(today);
    paydate.setDate(today.getDate() + 1);
  } else {
    paydate = new Date(today.getFullYear(), today.getMonth(), 30);
    if (today.getDate() >= 28) {
      paydate = new Date(today.getFullYear(), today.getMonth() + 1, 30);
    }
  }
  return paydate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function toMonthlyEst(amount: number | undefined | null, period: string | null | undefined): string {
  if (!amount) return '—';
  const n = Number(amount);
  if (isNaN(n)) return '—';
  const multiplier: Record<string, number> = { daily: 26, weekly: 4.33, monthly: 1 };
  const m = multiplier[(period ?? 'monthly').toLowerCase()] ?? 1;
  return `₱${Math.round(n * m).toLocaleString('en-PH')}`;
}

function toCurrencyLabel(amount: number | null | undefined): string {
  if (!amount) return '—';
  return `₱${Number(amount).toLocaleString('en-PH')}`;
}

function periodSuffix(period: string | null | undefined): string {
  const p = (period ?? 'monthly').toLowerCase();
  if (p === 'weekly') return '/ week';
  if (p === 'daily') return '/ day';
  return '/ month';
}

function toDailyRate(salary: number | null | undefined, period: string | null | undefined): string {
  if (!salary) return '—';
  const s = Number(salary);
  const p = (period ?? 'monthly').toLowerCase();
  const daily = p === 'daily' ? s : p === 'weekly' ? s / 5 : s / 26;
  return `₱${Math.round(daily).toLocaleString('en-PH')} / day`;
}

function perfLabel(pct: number | null): { text: string; color: string } {
  if (pct === null) return { text: '—', color: MUTED };
  if (pct >= 95) return { text: 'Excellent', color: GREEN };
  if (pct >= 80) return { text: 'Very Good', color: CARAMEL };
  if (pct >= 65) return { text: 'Good', color: ORANGE };
  return { text: 'Needs Work', color: DANGER };
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function contractStatusLabel(status: string): { text: string; color: string; bg: string } {
  const s = String(status).toLowerCase();
  if (s === 'hired' || s === 'accepted') return { text: 'Active', color: GREEN, bg: GREEN_BG };
  if (s.includes('termination')) return { text: 'Ending', color: DANGER, bg: '#FEE2E2' };
  return { text: status, color: MUTED, bg: ICON_BG };
}

function parseShiftStartHM(workHours: string | null | undefined): { h: number; m: number } | null {
  if (!workHours) return null;
  const match = workHours.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3].toLowerCase();
  if (meridiem === 'pm' && h !== 12) h += 12;
  if (meridiem === 'am' && h === 12) h = 0;
  return { h, m };
}

type TodayStatusInfo = { text: string; color: string; icon: keyof typeof Ionicons.glyphMap };

function computeTodayStatus(
  todayAtt: AttendanceToday | null,
  workHours: string | null | undefined,
  empStartDate: string | null | undefined,
  empEndDate: string | null | undefined,
): TodayStatusInfo {
  const today = todayYmd();
  if (empStartDate && today < empStartDate) {
    return { text: 'Not started yet', color: MUTED, icon: 'time-outline' };
  }
  if (empEndDate && today > empEndDate) {
    return { text: 'Contract ended', color: MUTED, icon: 'close-circle-outline' };
  }
  if (!todayAtt) return { text: 'Loading…', color: MUTED, icon: 'time-outline' };
  if (todayAtt.is_rest_day) return { text: 'Rest Day', color: MUTED, icon: 'moon-outline' };
  if (todayAtt.checked_in) {
    if (todayAtt.status === 'late') {
      return { text: `Checked in late at ${formatTime(todayAtt.checked_in_at)}`, color: YELLOW, icon: 'time-outline' };
    }
    return { text: `Checked in at ${formatTime(todayAtt.checked_in_at)}`, color: GREEN, icon: 'checkmark-circle-outline' };
  }
  // Helper hasn't checked in — compare against SHIFT START, not start of day
  const now = new Date();
  const startHM = parseShiftStartHM(workHours);
  if (startHM) {
    const shiftStart = new Date();
    shiftStart.setHours(startHM.h, startHM.m, 0, 0);
    if (now < shiftStart) {
      // Shift hasn't started yet — pending, never absent
      return { text: 'Pending check-in', color: ORANGE, icon: 'ellipse-outline' };
    }
    // Shift started — check if it also ended
    if (todayAtt.expected_shift_end_at) {
      const raw = todayAtt.expected_shift_end_at;
      const shiftEnd = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
      if (!isNaN(shiftEnd.getTime())) {
        return now >= shiftEnd
          ? { text: 'Absent', color: DANGER, icon: 'close-circle-outline' }
          : { text: 'Late — not checked in', color: YELLOW, icon: 'alert-circle-outline' };
      }
    }
    return { text: 'Late — not checked in', color: YELLOW, icon: 'alert-circle-outline' };
  }
  // No shift-start info — only mark absent after shift_end; default to pending
  if (todayAtt.expected_shift_end_at) {
    const raw = todayAtt.expected_shift_end_at;
    const shiftEnd = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
    if (!isNaN(shiftEnd.getTime()) && now >= shiftEnd) {
      return { text: 'Absent', color: DANGER, icon: 'close-circle-outline' };
    }
  }
  return { text: 'Pending check-in', color: ORANGE, icon: 'ellipse-outline' };
}

function calDayShadeColor(d: AttendanceDay | undefined): string | null {
  if (!d) return null;
  if (d.checked_in) return d.status === 'late' ? CAL_LATE : CAL_PRESENT;
  const ct = d.cell_type;
  if (ct === 'present') return CAL_PRESENT;
  if (ct === 'absent') return CAL_ABSENT;
  if (ct === 'leave' || ct === 'unpaid_leave') return CAL_LEAVE;
  if (ct === 'rest' || ct === 'holiday' || ct === 'no_work') return CAL_DAYOFF;
  if (ct === 'future' || ct === 'out_of_contract') return null;
  const st = d.status;
  if (st === 'absent') return CAL_ABSENT;
  if (st === 'leave' || st === 'unpaid_leave') return CAL_LEAVE;
  if (st === 'rest' || st === 'holiday' || st === 'no_work') return CAL_DAYOFF;
  return null;
}

// ── Donut chart ────────────────────────────────────────────────────────────
function DonutChart({ present, late, absent, leave }: {
  present: number; late: number; absent: number; leave: number;
}) {
  const SIZE = 148; const cx = SIZE / 2; const cy = SIZE / 2;
  const R = 54; const SW = 18; const C = 2 * Math.PI * R;
  const onTime = Math.max(0, present - late);
  const total  = Math.max(1, present + absent + leave);
  const pct    = Math.round((present / total) * 100);
  const onTimeArc = (onTime / total) * C;
  const lateArc   = (late   / total) * C;
  const absentArc = (absent / total) * C;
  const leaveArc  = (leave  / total) * C;
  const rOnTime = -90;
  const rLate   = rOnTime + (onTime / total) * 360;
  const rAbsent = rLate   + (late   / total) * 360;
  const rLeave  = rAbsent + (absent / total) * 360;
  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle cx={cx} cy={cy} r={R} fill="none" stroke={CHART_BG} strokeWidth={SW} />
      {onTime > 0 && (
        <Circle cx={cx} cy={cy} r={R} fill="none" stroke={CAL_PRESENT} strokeWidth={SW}
          strokeDasharray={[onTimeArc, C - onTimeArc]}
          transform={`rotate(${rOnTime}, ${cx}, ${cy})`} />
      )}
      {late > 0 && (
        <Circle cx={cx} cy={cy} r={R} fill="none" stroke={YELLOW} strokeWidth={SW}
          strokeDasharray={[lateArc, C - lateArc]}
          transform={`rotate(${rLate}, ${cx}, ${cy})`} />
      )}
      {absent > 0 && (
        <Circle cx={cx} cy={cy} r={R} fill="none" stroke={DANGER} strokeWidth={SW}
          strokeDasharray={[absentArc, C - absentArc]}
          transform={`rotate(${rAbsent}, ${cx}, ${cy})`} />
      )}
      {leave > 0 && (
        <Circle cx={cx} cy={cy} r={R} fill="none" stroke={GRAY_DOT} strokeWidth={SW}
          strokeDasharray={[leaveArc, C - leaveArc]}
          transform={`rotate(${rLeave}, ${cx}, ${cy})`} />
      )}
      <SvgText x={cx} y={cy - 6} textAnchor="middle" fontSize={24} fontWeight="600" fill={DARK}>
        {pct}%
      </SvgText>
      <SvgText x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill={MUTED}>
        Attendance
      </SvgText>
    </Svg>
  );
}

// ── Attendance calendar with diagonal gradient shading ──────────────────────
const WEEK_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function AttendanceCal({ year, month, days, canPrev, canNext, onPrev, onNext }: {
  year: number; month: number; days: AttendanceDay[];
  canPrev: boolean; canNext: boolean;
  onPrev: () => void; onNext: () => void;
}) {
  const today = todayYmd();
  const dayMap = useMemo(() => new Map(days.map(d => [d.date, d])), [days]);
  const grid = useMemo(() => {
    const firstDow = new Date(year, month - 1, 1).getDay();
    const startCol = (firstDow + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [
      ...Array<null>(startCol).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [year, month]);
  const pad2 = (n: number) => String(n).padStart(2, '0');

  return (
    <View>
      <View style={s.calHead}>
        <TouchableOpacity
          onPress={onPrev} disabled={!canPrev}
          style={[s.calNavBtn, !canPrev && s.calNavDisabled]}
          activeOpacity={canPrev ? 0.7 : 1}
        >
          <Ionicons name="chevron-back" size={18} color={canPrev ? DARK : GRAY_DOT} />
        </TouchableOpacity>
        <Text style={s.calMonthLabel}>{monthLabel(year, month)}</Text>
        <TouchableOpacity
          onPress={onNext} disabled={!canNext}
          style={[s.calNavBtn, !canNext && s.calNavDisabled]}
          activeOpacity={canNext ? 0.7 : 1}
        >
          <Ionicons name="chevron-forward" size={18} color={canNext ? DARK : GRAY_DOT} />
        </TouchableOpacity>
      </View>
      <View style={s.calHeaderRow}>
        {WEEK_HEADERS.map(h => (
          <Text key={h} style={s.calHeader}>{h}</Text>
        ))}
      </View>
      {grid.map((week, wi) => (
        <View key={wi} style={s.calRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={s.calCell} />;
            const ymd = `${year}-${pad2(month)}-${pad2(day)}`;
            const dayData = dayMap.get(ymd);
            const isToday = ymd === today;
            const shade = calDayShadeColor(dayData);
            const borderColor = isToday ? NAVY_TODAY : 'rgba(0,0,0,0.08)';
            const borderWidth = isToday ? 2 : 1;
            return (
              <View key={di} style={s.calCell}>
                <View style={[s.calCellInner, { borderColor, borderWidth }]}>
                  {shade ? (
                    <LinearGradient
                      colors={[shade, shade, 'transparent', 'transparent']}
                      locations={[0, 0.5, 0.5, 1]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  ) : null}
                  <Text style={[s.calDayNum, isToday && s.calDayNumToday]}>
                    {day}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Info row ───────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, action, valueColor }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string; value: string;
  action?: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIconWrap}>
        <Ionicons name={icon} size={15} color={BROWN} />
      </View>
      <View style={s.infoBody}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={[s.infoValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
      </View>
      {action}
    </View>
  );
}

// ── Perf tile ──────────────────────────────────────────────────────────────
function PerfTile({ label, value, sub, subColor }: {
  label: string; value: string; sub: string; subColor: string;
}) {
  return (
    <View style={s.perfTile}>
      <Text style={s.perfValue}>{value}</Text>
      <Text style={[s.perfSub, { color: subColor }]}>{sub}</Text>
      <Text style={s.perfLabel}>{label}</Text>
    </View>
  );
}

// ── Leave usage bar ────────────────────────────────────────────────────────
function LeaveBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const remaining = Math.max(0, total - used);
  return (
    <View style={s.leaveBarWrap}>
      <View style={s.leaveBarTrack}>
        <View style={[s.leaveBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.leaveBarSub}>
        {used} used · <Text style={{ color: GREEN }}>{remaining} remaining</Text> of {total} days
      </Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
type Tab = 'overview' | 'attendance' | 'payroll';

export default function HelperProfileScreen() {
  const router = useRouter();
  const { userData } = useAuth();
  const parentId = userData ? Number(userData.user_id) : 0;

  const params = useLocalSearchParams<{
    application_id?: string; helper_id?: string; helper_name?: string;
    helper_photo?: string; job_title?: string; status?: string;
    salary_offered?: string; salary_period?: string; helper_phone?: string;
  }>();

  const applicationId = params.application_id ? Number(params.application_id) : 0;
  const helperId      = params.helper_id      ? Number(params.helper_id)      : 0;
  const helperName    = params.helper_name    ? decodeURIComponent(params.helper_name) : 'Helper';
  const helperPhoto   = params.helper_photo   ? decodeURIComponent(params.helper_photo) : null;
  const jobTitle      = params.job_title      ? decodeURIComponent(params.job_title)   : '';
  const statusRaw     = params.status         ? decodeURIComponent(params.status)      : 'hired';
  const salaryOffered = params.salary_offered ? Number(params.salary_offered)          : undefined;
  const salaryPeriod  = params.salary_period  ? decodeURIComponent(params.salary_period) : undefined;
  const helperPhone   = params.helper_phone   ? decodeURIComponent(params.helper_phone) : null;

  const [activeTab,   setActiveTab]   = useState<Tab>('overview');
  const [loading,     setLoading]     = useState(true);
  const [attLoading,  setAttLoading]  = useState(false);

  const [contractTerms, setContractTerms] = useState<ContractTerms | null>(null);
  const [todayAtt,      setTodayAtt]      = useState<AttendanceToday | null>(null);
  const [tasks,         setTasks]         = useState<ApplicationTask[]>([]);

  const now = new Date();
  const [attYear,      setAttYear]      = useState(now.getFullYear());
  const [attMonth,     setAttMonth]     = useState(now.getMonth() + 1);
  const [monthSummary, setMonthSummary] = useState<AttendanceMonthSummary | null>(null);
  const [monthDays,    setMonthDays]    = useState<AttendanceDay[]>([]);
  const [lateCount,    setLateCount]    = useState(0);
  const [leaveBalance, setLeaveBalance] = useState<AttendanceLeaveBalance | null>(null);
  const [empBounds,    setEmpBounds]    = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

  const loadMonth = useCallback(async (year: number, month: number) => {
    if (!applicationId || !parentId) return;
    setAttLoading(true);
    try {
      const res = await fetchAttendanceMonth(applicationId, parentId, 'parent', year, month).catch(() => null);
      if (res?.success) {
        setMonthSummary(res.summary ?? null);
        const days = res.days ?? [];
        setMonthDays(days);
        setLateCount(days.filter(d => d.status === 'late').length);
        if (res.leave_balance) setLeaveBalance(res.leave_balance);
        setEmpBounds({
          start: res.employment_start_date ?? null,
          end:   res.employment_end_date   ?? null,
        });
      }
    } finally {
      setAttLoading(false);
    }
  }, [applicationId, parentId]);

  const loadCore = useCallback(async () => {
    if (!applicationId || !helperId || !parentId) return;
    setLoading(true);
    try {
      const [ctRes, todayRes, tasksRes] = await Promise.all([
        fetch(`${API_URL}/parent/get_contract_terms.php?application_id=${applicationId}&parent_id=${parentId}`)
          .then(r => r.json()).catch(() => null),
        fetchAttendanceToday(applicationId, helperId).catch(() => null),
        fetchApplicationTasks(applicationId, parentId, 'parent').catch(() => null),
      ]);
      if (ctRes?.success) {
        const c = ctRes.contract ?? {};
        let restDays: string[] | null = null;
        if (Array.isArray(c.rest_days)) restDays = c.rest_days;
        else if (typeof c.rest_days === 'string') {
          try { restDays = JSON.parse(c.rest_days); } catch { restDays = null; }
        }
        setContractTerms({
          work_schedule:        ctRes.work_schedule         ?? null,
          work_hours:           c.work_hours                ?? null,
          employment_start_date: c.employment_start_date    ?? null,
          employment_end_date:   c.employment_end_date      ?? null,
          confirmed_salary:     c.confirmed_salary          ?? null,
          payment_schedule:     c.payment_schedule          ?? null,
          vacation_leave_days:  c.vacation_leave_days       ?? null,
          sick_leave_days:      c.sick_leave_days           ?? null,
          rest_days:            restDays,
          overtime_rate:        c.overtime_rate             ?? null,
          other_benefits:       c.other_benefits            ?? null,
          contract_duration:    c.contract_duration         ?? null,
        });
      }
      if (todayRes?.success) setTodayAtt(todayRes.data ?? null);
      setTasks(tasksRes?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [applicationId, helperId, parentId]);

  useEffect(() => { void loadCore(); }, [loadCore]);
  useEffect(() => { void loadMonth(attYear, attMonth); }, [loadMonth, attYear, attMonth]);

  // Derived contract data
  const empStart = contractTerms?.employment_start_date ?? empBounds.start;
  const empEnd   = contractTerms?.employment_end_date   ?? empBounds.end;
  const workHours = contractTerms?.work_hours ?? null;
  const period    = contractTerms?.payment_schedule ?? salaryPeriod;
  const salary    = contractTerms?.confirmed_salary ?? salaryOffered;
  const vacDays   = contractTerms?.vacation_leave_days ?? null;
  const sickDays  = contractTerms?.sick_leave_days  ?? null;

  // Calendar navigation bounds
  function parseYM(ymd: string | null | undefined): { year: number; month: number } | null {
    if (!ymd) return null;
    const parts = ymd.split('-');
    if (parts.length < 2) return null;
    return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
  }
  const minBound = parseYM(empStart);
  const maxBound = parseYM(empEnd) ?? { year: now.getFullYear(), month: now.getMonth() + 1 };
  const canGoPrev = minBound
    ? (attYear > minBound.year || (attYear === minBound.year && attMonth > minBound.month))
    : true;
  const canGoNext = maxBound
    ? (attYear < maxBound.year || (attYear === maxBound.year && attMonth < maxBound.month))
    : true;

  const prevMonth = () => {
    if (!canGoPrev) return;
    if (attMonth === 1) { setAttYear(y => y - 1); setAttMonth(12); }
    else setAttMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (!canGoNext) return;
    if (attMonth === 12) { setAttYear(y => y + 1); setAttMonth(1); }
    else setAttMonth(m => m + 1);
  };

  // Computed stats
  const present = monthSummary?.present ?? 0;
  const absent  = monthSummary?.absent  ?? 0;
  const leave   = monthSummary?.leave   ?? 0;
  const tasksDone  = tasks.filter(t => t.status === 'done').length;
  const tasksTotal = tasks.length;
  const statusInfo = contractStatusLabel(statusRaw);
  const duration   = employmentDuration(empStart);
  const monthlyEst = toMonthlyEst(salary, period);
  const nextPay    = computeNextPayday(period);
  const initials   = getInitials(helperName);
  const todayStatus = computeTodayStatus(todayAtt, workHours, empStart, empEnd);

  // Backend counts today as 'absent' before the shift ends — subtract it when the
  // smart status says we're still pending or late (shift hasn't started or just started)
  const todayInMonth = (() => {
    const [ty, tm] = todayYmd().split('-').map(Number);
    return ty === attYear && tm === attMonth;
  })();
  const notYetAbsent = todayInMonth && !todayAtt?.checked_in &&
    (todayStatus.text.startsWith('Pending') || todayStatus.text.startsWith('Late'));
  const displayAbsent  = notYetAbsent && absent > 0 ? absent - 1 : absent;
  const workingDays    = present + displayAbsent + leave;
  const attendancePct  = workingDays > 0 ? Math.round((present / workingDays) * 100) : null;
  const attPerf        = perfLabel(attendancePct);

  // Adjust today's calendar cell based on shift timing, not start of calendar day
  const calAdjustedDays = useMemo(() => {
    const today = todayYmd();
    if (todayAtt?.checked_in) return monthDays;
    return monthDays.map(d => {
      if (d.date !== today) return d;
      const now = new Date();
      const startHM = parseShiftStartHM(workHours);
      if (startHM) {
        const shiftStart = new Date();
        shiftStart.setHours(startHM.h, startHM.m, 0, 0);
        if (now < shiftStart) {
          // Before shift starts: no shade (pending)
          return { ...d, cell_type: 'future' as const, status: 'none', checked_in: false };
        }
        // After shift start: yellow (late) until shift ends
        if (todayAtt?.expected_shift_end_at) {
          const raw = todayAtt.expected_shift_end_at;
          const shiftEnd = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
          if (!isNaN(shiftEnd.getTime()) && now < shiftEnd) {
            return { ...d, status: 'late', checked_in: true }; // yellow diagonal
          }
        } else {
          return { ...d, status: 'late', checked_in: true }; // yellow (no end info)
        }
        return d; // after shift end: absent (red)
      }
      // No shift-start info: only keep absent after shift_end; otherwise pending
      if (todayAtt?.expected_shift_end_at) {
        const raw = todayAtt.expected_shift_end_at;
        const shiftEnd = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
        if (!isNaN(shiftEnd.getTime()) && now >= shiftEnd) return d; // absent
      }
      return { ...d, cell_type: 'future' as const, status: 'none', checked_in: false }; // pending
    });
  }, [monthDays, todayAtt, workHours]);

  // Recent records (last 5 descending) — exclude today if shift hasn't ended yet
  const recentRecords = useMemo(() => {
    const today = todayYmd();
    return [...monthDays]
      .filter(d => {
        if (d.date === today && notYetAbsent) return false;
        return d.checked_in || d.status === 'absent' || d.status === 'leave' || d.status === 'late';
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [monthDays, notYetAbsent]);

  // ── Overview tab ─────────────────────────────────────────────────────────
  const overviewContent = (
    <View style={s.tabContent}>
      {/* Performance */}
      <LinearGradient colors={CARD_GR} style={s.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>Performance</Text>
          <View style={s.monthPill}><Text style={s.monthPillText}>This Month</Text></View>
        </View>
        <View style={s.perfGrid}>
          <PerfTile
            label="Attendance"
            value={attendancePct !== null ? `${attendancePct}%` : '—'}
            sub={attPerf.text} subColor={attPerf.color}
          />
          <PerfTile
            label="Tasks"
            value={tasksTotal > 0 ? `${tasksDone}/${tasksTotal}` : '—'}
            sub={tasksTotal > 0 ? 'Done' : 'No tasks'}
            subColor={tasksDone === tasksTotal && tasksTotal > 0 ? GREEN : MUTED}
          />
          <PerfTile
            label="Late"
            value={String(lateCount)}
            sub={lateCount === 0 ? 'On time' : 'day(s)'}
            subColor={lateCount === 0 ? GREEN : YELLOW}
          />
          <PerfTile
            label="Absent"
            value={String(displayAbsent)}
            sub={absent === 0 ? 'Perfect' : 'day(s)'}
            subColor={absent === 0 ? GREEN : DANGER}
          />
        </View>
      </LinearGradient>

      {/* Today's Status */}
      <LinearGradient colors={CARD_GR} style={s.card}>
        <Text style={s.cardTitle}>Today's Status</Text>
        <View style={s.actRow}>
          <View style={[s.actDot, { backgroundColor: todayStatus.color }]} />
          <Text style={[s.actText, { color: todayStatus.color }]}>{todayStatus.text}</Text>
        </View>
        <Text style={s.actDate}>{formatDateLong(todayYmd())}</Text>
        {workHours ? <Text style={s.actDate}>Shift: {workHours}</Text> : null}
      </LinearGradient>

      {/* Contract Details */}
      <LinearGradient colors={CARD_GR} style={s.card}>
        <Text style={s.cardTitle}>Contract Details</Text>
        <View style={s.infoList}>
          {empStart ? (
            <InfoRow icon="play-circle-outline" label="Start Date" value={formatDateLong(empStart)} />
          ) : null}
          {empEnd ? (
            <InfoRow icon="stop-circle-outline" label="End Date" value={formatDateLong(empEnd)} valueColor={ORANGE} />
          ) : null}
          <InfoRow icon="briefcase-outline" label="Role" value={jobTitle || '—'} />
          {contractTerms?.work_schedule ? (
            <InfoRow icon="time-outline" label="Schedule" value={contractTerms.work_schedule} />
          ) : null}
          {workHours ? (
            <InfoRow icon="alarm-outline" label="Work Hours" value={workHours} />
          ) : null}
          <InfoRow icon="cash-outline" label="Monthly Salary" value={monthlyEst} />
          <InfoRow icon="calendar-outline" label="Next Payday" value={nextPay} />
          {contractTerms?.rest_days && contractTerms.rest_days.length > 0 ? (
            <InfoRow icon="moon-outline" label="Rest Days" value={contractTerms.rest_days.join(', ')} />
          ) : null}
          {helperPhone ? (
            <InfoRow
              icon="call-outline" label="Contact" value={helperPhone}
              action={
                <TouchableOpacity
                  style={s.callBtn}
                  onPress={() => void Linking.openURL(`tel:${helperPhone}`)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="call" size={16} color={BROWN} />
                </TouchableOpacity>
              }
            />
          ) : null}
        </View>
      </LinearGradient>

      {/* Message CTA */}
      <TouchableOpacity
        style={s.messageCta}
        onPress={() => router.push({
          pathname: '/(parent)/messages' as never,
          params: { partner_id: String(helperId), partner_name: encodeURIComponent(helperName) },
        })}
        activeOpacity={0.9}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
        <Text style={s.messageCtaText}>Message {helperName.split(' ')[0]}</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Attendance tab ────────────────────────────────────────────────────────
  const attendanceContent = (
    <View style={s.tabContent}>
      <LinearGradient colors={CARD_GR} style={s.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>Attendance Overview</Text>
          <View style={s.monthPill}><Text style={s.monthPillText}>{monthLabel(attYear, attMonth)}</Text></View>
        </View>
        {attLoading ? (
          <ActivityIndicator color={BROWN} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={s.donutRow}>
              <DonutChart present={present} late={lateCount} absent={displayAbsent} leave={leave} />
              <View style={s.legendCol}>
                {[
                  { color: CAL_PRESENT, label: 'Present', count: Math.max(0, present - lateCount) },
                  { color: YELLOW,      label: 'Late',    count: lateCount },
                  { color: DANGER,      label: 'Absent',  count: displayAbsent },
                  { color: GRAY_DOT,    label: 'Leave',   count: leave },
                ].map(item => (
                  <View key={item.label} style={s.legendRow}>
                    <View style={[s.legendDot, { backgroundColor: item.color }]} />
                    <Text style={s.legendLabel}>{item.label}</Text>
                    <Text style={s.legendCount}>{item.count} {item.count === 1 ? 'day' : 'days'}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={s.workingDaysSub}>{present} / {workingDays} working days attended</Text>
          </>
        )}
      </LinearGradient>

      {/* Calendar */}
      <LinearGradient colors={CARD_GR} style={s.card}>
        <Text style={s.cardTitle}>Attendance Calendar</Text>
        {attLoading ? (
          <ActivityIndicator color={BROWN} style={{ marginVertical: 20 }} />
        ) : (
          <AttendanceCal
            year={attYear} month={attMonth}
            days={calAdjustedDays}
            canPrev={canGoPrev} canNext={canGoNext}
            onPrev={prevMonth} onNext={nextMonth}
          />
        )}
        <View style={s.calLegend}>
          {[
            { color: CAL_PRESENT, label: 'Present' },
            { color: YELLOW,      label: 'Late' },
            { color: DANGER,      label: 'Absent' },
            { color: GRAY_DOT,    label: 'Leave' },
          ].map(item => (
            <View key={item.label} style={s.calLegendItem}>
              <View style={[s.calLegendDot, { backgroundColor: item.color }]} />
              <Text style={s.calLegendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Recent Records */}
      <LinearGradient colors={CARD_GR} style={s.card}>
        <Text style={s.cardTitle}>Recent Records</Text>
        {recentRecords.length === 0 ? (
          <Text style={s.emptyText}>No records this month.</Text>
        ) : (
          recentRecords.map((d, idx) => {
            const isToday = d.date === todayYmd();
            const dateStr = isToday
              ? `Today, ${formatShortDate(d.date).replace(/^\w+, /, '')}`
              : formatShortDate(d.date);
            const isLate  = d.status === 'late';
            const isLeave = d.status === 'leave' || d.status === 'unpaid_leave';
            const recIcon  = d.checked_in ? 'checkmark-circle' : isLeave ? 'umbrella' : 'close-circle';
            const recColor = d.checked_in ? (isLate ? YELLOW : GREEN) : isLeave ? GRAY_DOT : DANGER;
            const recLabel = d.checked_in ? (isLate ? 'Late check-in' : 'On time') : isLeave ? 'On leave' : 'Absent';
            return (
              <View key={d.date} style={[s.recordRow, idx < recentRecords.length - 1 && s.recordRowBorder]}>
                <Ionicons name={recIcon as any} size={28} color={recColor} />
                <View style={s.recordInfo}>
                  <Text style={s.recordDate}>{dateStr}</Text>
                  <Text style={[s.recordStatus, { color: recColor }]}>{recLabel}</Text>
                </View>
                {d.check_in_at ? (
                  <Text style={s.recordTime}>{formatTime(d.check_in_at)}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </LinearGradient>
    </View>
  );

  // ── Payroll tab ───────────────────────────────────────────────────────────
  const payrollContent = (
    <View style={s.tabContent}>
      {/* Salary hero card */}
      <LinearGradient colors={['#1E2A4A', '#2D3F6B', '#1E2A4A']} style={s.payHero}>
        <View pointerEvents="none" style={s.payDecorA} />
        <View pointerEvents="none" style={s.payDecorB} />
        <View style={s.payHeroTop}>
          <View>
            <Text style={s.payHeroLabel}>
              {period ? (period.charAt(0).toUpperCase() + period.slice(1)) : 'Monthly'} Salary
            </Text>
            <Text style={s.payHeroAmount}>{toCurrencyLabel(salary)}</Text>
            <Text style={s.payHeroPeriod}>{periodSuffix(period)}</Text>
          </View>
          <View style={s.payHeroBadge}>
            <Ionicons name="wallet-outline" size={22} color="rgba(255,255,255,0.6)" />
          </View>
        </View>
        <View style={s.payHeroDivider} />
        <View style={s.payHeroStats}>
          <View style={s.payHeroStat}>
            <Text style={s.payHeroStatLabel}>Daily Rate</Text>
            <Text style={s.payHeroStatValue}>{toDailyRate(salary, period)}</Text>
          </View>
          <View style={s.payHeroStatSep} />
          <View style={s.payHeroStat}>
            <Text style={s.payHeroStatLabel}>Monthly Est.</Text>
            <Text style={s.payHeroStatValue}>{monthlyEst}</Text>
          </View>
          <View style={s.payHeroStatSep} />
          <View style={s.payHeroStat}>
            <Text style={s.payHeroStatLabel}>Next Payday</Text>
            <Text style={[s.payHeroStatValue, { fontSize: 11 }]}>{nextPay}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Payment schedule */}
      <LinearGradient colors={CARD_GR} style={s.card}>
        <View style={s.cardRowHead}>
          <View style={[s.cardIconWrap, { backgroundColor: '#E8F4FD' }]}>
            <Ionicons name="repeat-outline" size={16} color="#2563EB" />
          </View>
          <Text style={s.cardTitle}>Payment Schedule</Text>
        </View>
        <View style={s.infoList}>
          <InfoRow icon="repeat-outline"       label="Pay Frequency"    value={period ? (period.charAt(0).toUpperCase() + period.slice(1)) : 'Monthly'} />
          <InfoRow icon="calendar-outline"     label="Next Payday"      value={nextPay} />
          {empStart ? <InfoRow icon="play-circle-outline"  label="Start Date"       value={formatDateLong(empStart)} /> : null}
          {empEnd   ? <InfoRow icon="stop-circle-outline"  label="End Date"         value={formatDateLong(empEnd)} valueColor={ORANGE} /> : null}
          {contractTerms?.contract_duration ? (
            <InfoRow icon="time-outline" label="Contract Duration" value={contractTerms.contract_duration} />
          ) : null}
        </View>
      </LinearGradient>

      {/* Leave entitlements */}
      {(vacDays !== null || sickDays !== null) && (
        <LinearGradient colors={CARD_GR} style={s.card}>
          <View style={s.cardRowHead}>
            <View style={[s.cardIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="umbrella-outline" size={16} color={GREEN} />
            </View>
            <Text style={s.cardTitle}>Leave Entitlements</Text>
          </View>
          <View style={s.leaveGrid}>
            {vacDays !== null && (
              <View style={s.leaveTile}>
                <View style={[s.leaveTileIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="sunny-outline" size={18} color={GREEN} />
                </View>
                <Text style={s.leaveTileCount}>{vacDays}</Text>
                <Text style={s.leaveTileLabel}>Vacation Days</Text>
              </View>
            )}
            {sickDays !== null && (
              <View style={s.leaveTile}>
                <View style={[s.leaveTileIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="medkit-outline" size={18} color={DANGER} />
                </View>
                <Text style={s.leaveTileCount}>{sickDays}</Text>
                <Text style={s.leaveTileLabel}>Sick Days</Text>
              </View>
            )}
            {contractTerms?.overtime_rate ? (
              <View style={s.leaveTile}>
                <View style={[s.leaveTileIcon, { backgroundColor: ORANGE_BG }]}>
                  <Ionicons name="flash-outline" size={18} color={ORANGE} />
                </View>
                <Text style={[s.leaveTileCount, { fontSize: 13 }]}>{contractTerms.overtime_rate}</Text>
                <Text style={s.leaveTileLabel}>Overtime</Text>
              </View>
            ) : null}
          </View>
          {vacDays !== null && leaveBalance ? (
            <LeaveBar
              used={leaveBalance.used}
              total={leaveBalance.limit || vacDays}
              color={GREEN}
            />
          ) : null}
        </LinearGradient>
      )}

      {/* This month summary */}
      <LinearGradient colors={CARD_GR} style={s.card}>
        <View style={s.cardRowHead}>
          <View style={[s.cardIconWrap, { backgroundColor: ICON_BG }]}>
            <Ionicons name="stats-chart-outline" size={16} color={BROWN} />
          </View>
          <Text style={s.cardTitle}>This Month</Text>
          <View style={[s.monthPill, { marginLeft: 'auto' }]}>
            <Text style={s.monthPillText}>{monthLabel(attYear, attMonth)}</Text>
          </View>
        </View>
        <View style={s.paySummaryRow}>
          {[
            { label: 'Present', value: String(present), color: GREEN },
            { label: 'Late',    value: String(lateCount), color: YELLOW },
            { label: 'Absent',  value: String(displayAbsent),  color: DANGER },
            { label: 'Leave',   value: String(leave),   color: GRAY_DOT },
          ].map(item => (
            <View key={item.label} style={s.paySummaryTile}>
              <Text style={[s.paySummaryVal, { color: item.color }]}>{item.value}</Text>
              <Text style={s.paySummaryLbl}>{item.label}</Text>
            </View>
          ))}
        </View>
        <View style={s.payEstRow}>
          <Ionicons name="information-circle-outline" size={14} color={MUTED} />
          <Text style={s.payEstText}>
            Monthly est.: {monthlyEst} based on contract salary
          </Text>
        </View>
      </LinearGradient>

      {/* Benefits */}
      {contractTerms?.other_benefits ? (
        <LinearGradient colors={CARD_GR} style={s.card}>
          <View style={s.cardRowHead}>
            <View style={[s.cardIconWrap, { backgroundColor: '#FEF9C3' }]}>
              <Ionicons name="gift-outline" size={16} color={YELLOW} />
            </View>
            <Text style={s.cardTitle}>Other Benefits</Text>
          </View>
          <Text style={s.benefitsText}>{contractTerms.other_benefits}</Text>
        </LinearGradient>
      ) : null}

      <View style={s.payNote}>
        <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
        <Text style={s.payNoteText}>
          Full disbursement tracking and salary history coming in a future update.
        </Text>
      </View>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{helperName}</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <LinearGradient colors={HERO_GR} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCard}>
          <View style={s.heroInner}>
            <View style={s.photoWrap}>
              {helperPhoto ? (
                <Image source={{ uri: helperPhoto }} style={s.photo} contentFit="cover" />
              ) : (
                <View style={[s.photo, s.photoFb]}>
                  <Text style={s.photoFbText}>{initials}</Text>
                </View>
              )}
              <View style={[s.onlineDot, { backgroundColor: todayStatus.color }]} />
            </View>
            <View style={s.heroInfo}>
              <Text style={s.heroName}>{helperName}</Text>
              <Text style={s.heroJob}>{jobTitle}</Text>
              <View style={[s.statusPill, { backgroundColor: statusInfo.bg }]}>
                <Text style={[s.statusPillText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
              </View>
              {empStart ? (
                <View style={s.heroDates}>
                  <Ionicons name="play-circle-outline" size={12} color="rgba(59,42,24,0.55)" />
                  <Text style={s.heroDateText}>{formatDateLong(empStart)}</Text>
                </View>
              ) : null}
              {empEnd ? (
                <View style={s.heroDates}>
                  <Ionicons name="stop-circle-outline" size={12} color={ORANGE} />
                  <Text style={[s.heroDateText, { color: ORANGE }]}>{formatDateLong(empEnd)}</Text>
                </View>
              ) : null}
              {!empEnd && duration ? (
                <Text style={s.heroDuration}>{duration} employed</Text>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        {/* Tab bar */}
        <View style={s.tabBar}>
          {(['overview', 'attendance', 'payroll'] as Tab[]).map(tab => (
            <TouchableOpacity key={tab} style={s.tabItem} onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
              <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {activeTab === tab && <View style={s.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={BROWN} style={{ marginTop: 40 }} />
        ) : activeTab === 'overview' ? overviewContent
          : activeTab === 'attendance' ? attendanceContent
          : payrollContent}
      </ScrollView>

      <ParentWorkModeTabBar />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 10 },
  android: { elevation: 3 },
  default: { boxShadow: '0 3px 12px rgba(139,90,43,0.09)' } as any,
});

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: DIVIDER, backgroundColor: BG,
  },
  headerBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },

  // Hero
  heroCard:    { margin: 16, borderRadius: 22, overflow: 'hidden', ...CARD_SHADOW },
  heroInner:   { flexDirection: 'row', alignItems: 'flex-start', padding: 20, gap: 16 },
  photoWrap:   { position: 'relative', flexShrink: 0 },
  photo:       { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)' },
  photoFb:     { backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  photoFbText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: BROWN },
  onlineDot:   { position: 'absolute', bottom: 3, right: 3, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  heroInfo:    { flex: 1, gap: 3 },
  heroName:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: DARK, lineHeight: 25 },
  heroJob:     { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: 'rgba(59,42,24,0.75)' },
  statusPill:  { alignSelf: 'flex-start', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, marginTop: 2 },
  statusPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },
  heroDates:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  heroDateText:{ fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: 'rgba(59,42,24,0.65)' },
  heroDuration:{ fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: 'rgba(59,42,24,0.55)', marginTop: 2 },

  // Tabs
  tabBar:         { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: DIVIDER, marginHorizontal: 16, backgroundColor: BG },
  tabItem:        { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabLabel:       { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED },
  tabLabelActive: { fontFamily: FontFamily.fredokaSemiBold, color: BROWN },
  tabUnderline:   { position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 3, backgroundColor: BROWN, borderTopLeftRadius: 2, borderTopRightRadius: 2 },

  // Content
  tabContent:  { padding: 16, gap: 12 },
  card:        { borderRadius: 18, padding: 16, borderWidth: 1, borderColor: DIVIDER, ...CARD_SHADOW },
  cardHead:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardRowHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardIconWrap:{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardTitle:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  monthPill:   { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: ICON_BG, borderWidth: 1, borderColor: DIVIDER },
  monthPillText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: BROWN },

  // Performance grid
  perfGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  perfTile:  { width: '46%', paddingVertical: 6, paddingLeft: 4 },
  perfValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: DARK, lineHeight: 32 },
  perfSub:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, marginBottom: 2 },
  perfLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },

  // Today status
  actRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  actDot:  { width: 10, height: 10, borderRadius: 5 },
  actText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  actDate: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginTop: 2 },

  // Info list
  infoList:    { gap: 0 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  infoIconWrap:{ width: 30, height: 30, borderRadius: 8, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  infoBody:    { flex: 1 },
  infoLabel:   { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginBottom: 1 },
  infoValue:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  callBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },

  messageCta:     { backgroundColor: NAVY, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...CARD_SHADOW },
  messageCtaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: '#fff' },

  // Donut + legend
  donutRow:       { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  legendCol:      { flex: 1, gap: 8 },
  legendRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:      { width: 10, height: 10, borderRadius: 5 },
  legendLabel:    { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK, flex: 1 },
  legendCount:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  workingDaysSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 4 },

  // Calendar
  calHead:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calNavBtn:     { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  calNavDisabled:{ opacity: 0.35 },
  calMonthLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  calHeaderRow:  { flexDirection: 'row', marginBottom: 4 },
  calHeader:     { flex: 1, textAlign: 'center', fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: MUTED },
  calRow:        { flexDirection: 'row' },
  calCell:       { flex: 1, aspectRatio: 1, padding: 2 },
  calCellInner:  { flex: 1, borderRadius: 8, overflow: 'hidden', alignItems: 'flex-start', justifyContent: 'flex-start', paddingTop: 3, paddingLeft: 4 },
  calDayNum:     { fontSize: 11, fontWeight: '700' as const, color: DARK, lineHeight: 14 },
  calDayNumToday:{ color: NAVY_TODAY, fontWeight: '800' as const },
  calLegend:     { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: DIVIDER },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  calLegendDot:  { width: 8, height: 8, borderRadius: 4 },
  calLegendText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },

  // Recent records
  recordRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  recordRowBorder:{ borderBottomWidth: 1, borderBottomColor: DIVIDER },
  recordInfo:     { flex: 1 },
  recordDate:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  recordStatus:   { fontFamily: FontFamily.fredokaRegular, fontSize: 12, marginTop: 1 },
  recordTime:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  emptyText:      { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, textAlign: 'center', paddingVertical: 12 },

  // Payroll hero
  payHero:       { margin: 16, borderRadius: 22, overflow: 'hidden', padding: 20, ...CARD_SHADOW },
  payDecorA:     { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)', top: -30, right: -30 },
  payDecorB:     { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: 20 },
  payHeroTop:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  payHeroLabel:  { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  payHeroAmount: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 32, color: '#fff', lineHeight: 38 },
  payHeroPeriod: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  payHeroBadge:  { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  payHeroDivider:{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 16 },
  payHeroStats:  { flexDirection: 'row', alignItems: 'center' },
  payHeroStat:   { flex: 1, alignItems: 'center' },
  payHeroStatSep:{ width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },
  payHeroStatLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 3 },
  payHeroStatValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#fff' },

  // Leave entitlements
  leaveGrid:      { flexDirection: 'row', gap: 10, marginBottom: 8 },
  leaveTile:      { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, gap: 4 },
  leaveTileIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  leaveTileCount: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: DARK },
  leaveTileLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, textAlign: 'center' },
  leaveBarWrap:   { marginTop: 4 },
  leaveBarTrack:  { height: 8, borderRadius: 4, backgroundColor: ICON_BG, overflow: 'hidden' },
  leaveBarFill:   { height: 8, borderRadius: 4 },
  leaveBarSub:    { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 5 },

  // Payroll summary
  paySummaryRow:  { flexDirection: 'row', gap: 6, marginBottom: 12 },
  paySummaryTile: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: DIVIDER },
  paySummaryVal:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, lineHeight: 26 },
  paySummaryLbl:  { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED, textAlign: 'center' },
  payEstRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: DIVIDER },
  payEstText:     { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, flex: 1 },

  // Benefits
  benefitsText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK, lineHeight: 20 },

  // Payroll footer note
  payNote:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  payNoteText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, flex: 1, lineHeight: 17 },
});
