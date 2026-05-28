import API_URL from '@/constants/api';

/** Server-computed day classification for calendar UI */
export type AttendanceCellType =
  | 'present'
  | 'leave'
  | 'unpaid_leave'
  | 'holiday'
  | 'no_work'
  | 'rest'
  | 'absent'
  | 'future'
  | 'out_of_contract';

export type AttendanceDay = {
  date: string;
  weekday: string;
  status: string;
  checked_in: boolean;
  check_in_at: string | null;
  check_out_at: string | null;
  note?: string | null;
  cell_type?: AttendanceCellType;
  special_note?: string | null;
  tasks_completed?: number;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
};

export type AttendanceMonthSummary = {
  present: number;
  absent: number;
  leave: number;
  rest_days: number;
  holiday: number;
  no_work: number;
};

export type AttendanceLeaveBalance = {
  used: number;
  limit: number;
  remaining: number | null;
};

export type AttendanceSpecialDay = {
  date: string;
  type: 'holiday' | 'no_work';
  note: string | null;
};

export type AttendanceToday = {
  date: string;
  is_rest_day: boolean;
  checked_in: boolean;
  checked_out: boolean;
  checked_in_at: string | null;
  checked_out_at: string | null;
  status: string | null;
  log_id: number | null;
  /** Server-local "Y-m-d H:i:s" — expected end of shift for checkout reminder */
  expected_shift_end_at?: string | null;
};

export async function fetchAttendanceToday(applicationId: number, helperId: number) {
  const qs = new URLSearchParams({
    application_id: String(applicationId),
    helper_id: String(helperId),
  });
  const r = await fetch(`${API_URL}/v1/attendance/today.php?${qs}`);
  return r.json() as Promise<{
    success: boolean;
    data?: AttendanceToday;
    message?: string;
  }>;
}

export async function fetchAttendanceWeek(
  applicationId: number,
  userId: number,
  userType: 'parent' | 'helper',
  weekStart?: string,
) {
  const qs = new URLSearchParams({
    application_id: String(applicationId),
    user_id: String(userId),
    user_type: userType,
  });
  if (weekStart) qs.set('week_start', weekStart);
  const r = await fetch(`${API_URL}/v1/applications/attendance.php?${qs}`);
  return r.json() as Promise<{
    success: boolean;
    week_start?: string;
    days?: AttendanceDay[];
    employment_start_date?: string | null;
    employment_end_date?: string | null;
    message?: string;
  }>;
}

export async function fetchAttendanceMonth(
  applicationId: number,
  userId: number,
  userType: 'parent' | 'helper',
  year: number,
  month: number,
) {
  const qs = new URLSearchParams({
    application_id: String(applicationId),
    user_id: String(userId),
    user_type: userType,
    year: String(year),
    month: String(month),
  });
  const r = await fetch(`${API_URL}/v1/applications/attendance_month.php?${qs}`);
  return r.json() as Promise<{
    success: boolean;
    year?: number;
    month?: number;
    month_start?: string;
    month_end?: string;
    employment_start_date?: string | null;
    employment_end_date?: string | null;
    rest_days?: string | null;
    special_days?: AttendanceSpecialDay[];
    vacation_days_limit?: number;
    leave_balance?: AttendanceLeaveBalance;
    summary?: AttendanceMonthSummary;
    days?: AttendanceDay[];
    message?: string;
  }>;
}

export async function postContractSpecialDays(
  applicationId: number,
  parentUserId: number,
  specialDays: AttendanceSpecialDay[],
) {
  const r = await fetch(`${API_URL}/v1/contracts/special_days.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      application_id: applicationId,
      parent_user_id: parentUserId,
      special_days: specialDays,
    }),
  });
  return r.json() as Promise<{
    success: boolean;
    special_days?: AttendanceSpecialDay[];
    message?: string;
  }>;
}

export async function postAttendanceCheckIn(applicationId: number, helperId: number) {
  const r = await fetch(`${API_URL}/v1/attendance/checkin.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application_id: applicationId, helper_id: helperId }),
  });
  return r.json() as Promise<{
    success: boolean;
    data?: { checked_in_at: string; date: string };
    message?: string;
  }>;
}

export async function postAttendanceCheckOut(applicationId: number, helperId: number) {
  const r = await fetch(`${API_URL}/v1/attendance/checkout.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application_id: applicationId, helper_id: helperId }),
  });
  return r.json() as Promise<{
    success: boolean;
    data?: { checked_out_at: string; date: string };
    message?: string;
  }>;
}

export function formatAttendanceTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso.replace(' ', 'T'));
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}
