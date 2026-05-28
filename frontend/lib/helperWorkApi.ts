import API_URL from '@/constants/api';
import {
  fetchAttendanceWeek as fetchAttendanceWeekV1,
  postAttendanceCheckIn,
  postAttendanceCheckOut,
  type AttendanceDay,
} from '@/lib/attendanceApi';

export type WorkTaskRow = {
  task_id: number;
  application_id: number;
  title: string;
  sort_order: number;
  is_done: boolean;
  task_date: string | null;
  created_at: string | null;
};

export type WeekDayAttendance = AttendanceDay;

export async function fetchWorkTasks(helperId: number, applicationId: number) {
  const qs = new URLSearchParams({
    helper_id: String(helperId),
    application_id: String(applicationId),
  });
  const r = await fetch(`${API_URL}/helper/work_tasks.php?${qs}`);
  return r.json() as Promise<{ success: boolean; tasks?: WorkTaskRow[]; message?: string }>;
}

export async function toggleWorkTask(
  helperId: number,
  applicationId: number,
  taskId: number,
  isDone: boolean,
) {
  const r = await fetch(`${API_URL}/helper/work_task_toggle.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      helper_id: helperId,
      application_id: applicationId,
      task_id: taskId,
      is_done: isDone,
    }),
  });
  return r.json() as Promise<{ success: boolean; message?: string }>;
}

export async function fetchWeekAttendance(
  helperId: number,
  applicationId: number,
  weekStart?: string,
) {
  const res = await fetchAttendanceWeekV1(applicationId, helperId, 'helper', weekStart);
  if (!res.success || !res.days) {
    return {
      success: false as const,
      message: res.message ?? 'Failed to load attendance',
    };
  }
  const today = ymdLocal();
  const todayRow = res.days.find((d) => d.date === today);
  return {
    success: true as const,
    week_start: res.week_start,
    days: res.days,
    today: todayRow
      ? {
          date: todayRow.date,
          checked_in: todayRow.checked_in,
          checked_out: !!todayRow.check_out_at,
          check_in_at: todayRow.check_in_at,
          check_out_at: todayRow.check_out_at,
        }
      : {
          date: today,
          checked_in: false,
          checked_out: false,
          check_in_at: null,
          check_out_at: null,
        },
  };
}

export async function postAttendance(
  helperId: number,
  applicationId: number,
  action: 'check_in' | 'check_out',
) {
  if (action === 'check_in') {
    const r = await postAttendanceCheckIn(applicationId, helperId);
    return {
      success: r.success,
      message: r.message,
      check_in_at: r.data?.checked_in_at,
    };
  }
  const r = await postAttendanceCheckOut(applicationId, helperId);
  return {
    success: r.success,
    message: r.message,
    check_out_at: r.data?.checked_out_at,
  };
}

export function ymdLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday Y-m-d of the week containing `ymd` (local calendar). */
export function mondayOfWeekContaining(ymd: string): string {
  const [yy, mm, dd] = ymd.split('-').map(Number);
  const anchor = new Date(yy, mm - 1, dd);
  const n = anchor.getDay();
  const diff = n === 0 ? -6 : 1 - n;
  anchor.setDate(anchor.getDate() + diff);
  return ymdLocal(anchor);
}

export function addDaysYmd(ymd: string, delta: number): string {
  const [yy, mm, dd] = ymd.split('-').map(Number);
  const d = new Date(yy, mm - 1, dd);
  d.setDate(d.getDate() + delta);
  return ymdLocal(d);
}

export function listWeekStartsGoingBack(weeks: number): string[] {
  const today = ymdLocal();
  const thisMon = mondayOfWeekContaining(today);
  const out: string[] = [];
  for (let i = 0; i < weeks; i++) {
    out.push(addDaysYmd(thisMon, -7 * i));
  }
  return out;
}
