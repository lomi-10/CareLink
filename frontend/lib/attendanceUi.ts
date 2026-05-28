import { theme } from '@/constants/theme';

import type { AttendanceCellType, AttendanceDay } from '@/lib/attendanceApi';

/** Dot color for weekly attendance grid (present / absent / leave / holiday). */
export function attendanceDotBackground(status: string, checkedIn: boolean): string {
  if (checkedIn || status === 'present') return theme.color.success;
  if (status === 'leave') return theme.color.warning;
  if (status === 'holiday') return '#9333EA';
  return theme.color.line;
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
 * Monthly calendar cell fill + optional today ring.
 * Green=present, purple=rest, yellow=leave, gray=absent/no_work, white=future, blue ring=today.
 */
export function attendanceCalendarCellStyle(
  cellType: AttendanceCellType,
  isToday: boolean,
): { backgroundColor: string; borderColor: string; borderWidth: number } {
  let backgroundColor = theme.color.surfaceElevated;
  switch (cellType) {
    case 'present':
      backgroundColor = '#22C55E';
      break;
    case 'rest':
      backgroundColor = '#A855F7';
      break;
    case 'leave':
      backgroundColor = '#EAB308';
      break;
    case 'unpaid_leave':
      backgroundColor = '#F59E0B';
      break;
    case 'holiday':
      backgroundColor = '#EA580C';
      break;
    case 'absent':
      backgroundColor = '#9CA3AF';
      break;
    case 'no_work':
      backgroundColor = '#6B7280';
      break;
    case 'future':
      backgroundColor = '#FFFFFF';
      break;
    case 'out_of_contract':
      backgroundColor = theme.color.surface;
      break;
    default:
      backgroundColor = '#9CA3AF';
  }

  const borderColor = isToday ? '#2563EB' : theme.color.line;
  const borderWidth = isToday ? 3 : 1;

  return { backgroundColor, borderColor, borderWidth };
}
