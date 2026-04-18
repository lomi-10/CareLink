import { theme } from '@/constants/theme';

/** Dot color for weekly attendance grid (present / absent / leave / holiday). */
export function attendanceDotBackground(status: string, checkedIn: boolean): string {
  if (checkedIn || status === 'present') return theme.color.success;
  if (status === 'leave') return theme.color.warning;
  if (status === 'holiday') return '#9333EA';
  return theme.color.line;
}
