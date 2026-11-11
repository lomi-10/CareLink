import { theme } from '@/constants/theme';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Next date (today or later) that falls on one of the contract's rest weekdays. */
export function nextRestDayYmd(restDays: string[] | undefined, fromYmd: string): string | null {
  if (!restDays || restDays.length === 0) return null;
  const restIndexes = new Set(restDays.map((day) => WEEKDAY_NAMES.indexOf(day)).filter((index) => index >= 0));
  if (restIndexes.size === 0) return null;

  const [year, month, day] = fromYmd.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);
    if (restIndexes.has(candidate.getDay())) {
      const monthPart = String(candidate.getMonth() + 1).padStart(2, '0');
      const dayPart = String(candidate.getDate()).padStart(2, '0');
      return `${candidate.getFullYear()}-${monthPart}-${dayPart}`;
    }
  }
  return null;
}

export function attendanceDotBackground(status: string, checkedIn: boolean): string {
  if (checkedIn || status === 'present') return theme.color.success;
  if (status === 'leave') return theme.color.warning;
  if (status === 'holiday') return '#9333EA';
  return theme.color.line;
}
