import { theme } from '@/constants/theme';

import type { AttendanceCellType, AttendanceDay } from '@/lib/attendanceApi';
import { ymdLocal } from '@/lib/helperWorkApi';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Next date (today or later) that falls on one of the contract's rest weekdays. */
export function nextRestDayYmd(restDays: string[] | undefined, fromYmd: string): string | null {
  if (!restDays || restDays.length === 0) return null;
  const restIdx = new Set(restDays.map((d) => WEEKDAY_NAMES.indexOf(d)).filter((i) => i >= 0));
  if (restIdx.size === 0) return null;
  const [y, m, d] = fromYmd.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  for (let i = 0; i <= 7; i++) {
    const cand = new Date(start);
    cand.setDate(start.getDate() + i);
    if (restIdx.has(cand.getDay())) return ymdLocal(cand);
  }
  return null;
}

/** Dot color for weekly attendance grid (present / absent / leave / holiday). */
export function attendanceDotBackground(status: string, checkedIn: boolean): string {
  if (checkedIn || status === 'present') return theme.color.success;
  if (status === 'leave') return theme.color.warning;
  if (status === 'holiday') return '#9333EA';
  return theme.color.line;
}

/** 3-bucket classification for the Work dashboard's weekly attendance dots. */
export type WeekDotState = 'present' | 'scheduled' | 'missed';

export function weekDotState(d: AttendanceDay): WeekDotState {
  const ct = attendanceDayCellType(d);
  if (ct === 'present') return 'present';
  if (ct === 'absent') return 'missed';
  return 'scheduled';
}

/** Resolve cell type from API day row (week or month). */
export function attendanceDayCellType(d: AttendanceDay): AttendanceCellType {
  const ct = d.cell_type;
  if (ct) return ct;
  if (d.checked_in || d.status === 'present') return 'present';
  if (d.status === 'unpaid_leave') return 'unpaid_leave';
  if (d.status === 'leave') return 'leave';
  if (d.status === 'holiday') return 'holiday';
  if (d.status === 'rest' || d.status === 'no_work') return d.status === 'rest' ? 'rest' : 'no_work';
  if (d.status === 'none' || d.status === 'future') return 'future';
  if (ct === 'out_of_contract') return 'out_of_contract';
  return 'absent';
}

/**
 * Monthly calendar cell diagonal shade + optional today ring.
 * Green=checked in, red=absent, dark brown=day off (leave/holiday/rest/no-work), none=future/outside contract.
 */
export function attendanceCalendarCellStyle(
  cellType: AttendanceCellType,
  isToday: boolean,
): { shadeColor: string | null; borderColor: string; borderWidth: number } {
  let shadeColor: string | null = null;
  switch (cellType) {
    case 'present':
      shadeColor = '#22C55E';
      break;
    case 'absent':
      shadeColor = '#DC2626';
      break;
    case 'rest':
    case 'leave':
    case 'unpaid_leave':
    case 'holiday':
    case 'no_work':
      shadeColor = '#78350F';
      break;
    case 'future':
    case 'out_of_contract':
    default:
      shadeColor = null;
  }

  const borderColor = isToday ? '#2563EB' : theme.color.line;
  const borderWidth = isToday ? 3 : 1;

  return { shadeColor, borderColor, borderWidth };
}
