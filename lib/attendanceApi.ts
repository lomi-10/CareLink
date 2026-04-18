import API_URL from '@/constants/api';

export type AttendanceDay = {
  date: string;
  weekday: string;
  status: string;
  checked_in: boolean;
  check_in_at: string | null;
  check_out_at: string | null;
  note?: string | null;
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
