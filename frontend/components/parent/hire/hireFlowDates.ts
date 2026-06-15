/** Normalize API/job date to YYYY-MM-DD for hire flow text inputs */
export function toYmdInput(d: string | null | undefined): string {
  if (d == null || d === '') return '';
  const t = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const x = new Date(t);
  if (Number.isNaN(x.getTime())) return '';
  return toYmd(x);
}

/** Format a Date as YYYY-MM-DD using local date parts (no UTC shift) */
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type DurationUnit = 'Days' | 'Weeks' | 'Months' | 'Years';

export const DURATION_UNITS: DurationUnit[] = ['Days', 'Weeks', 'Months', 'Years'];

export const DURATION_QUICK_PRESETS: { label: string; amount: number; unit: DurationUnit }[] = [
  { label: '3 Months', amount: 3, unit: 'Months' },
  { label: '6 Months', amount: 6, unit: 'Months' },
  { label: '1 Year', amount: 1, unit: 'Years' },
  { label: '2 Years', amount: 2, unit: 'Years' },
  { label: '3 Years', amount: 3, unit: 'Years' },
];

/** Today + 3 days, as YYYY-MM-DD — default suggested employment start date */
export function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return toYmd(d);
}

/**
 * Add a calendar-correct duration to a YYYY-MM-DD date.
 * Months/Years clamp the day-of-month to the last valid day of the target
 * month (e.g. Jan 31 + 1 Month -> Feb 28/29, not Mar 3).
 */
export function addCalendarDuration(startYmd: string, amount: number, unit: DurationUnit): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startYmd) || !Number.isFinite(amount) || amount <= 0) return '';
  const [y, m, d] = startYmd.split('-').map(Number);

  if (unit === 'Days') return toYmd(new Date(y, m - 1, d + amount));
  if (unit === 'Weeks') return toYmd(new Date(y, m - 1, d + amount * 7));

  const totalMonths = unit === 'Years' ? amount * 12 : amount;
  const targetIndex = (m - 1) + totalMonths;
  const targetYear = y + Math.floor(targetIndex / 12);
  const targetMonth = targetIndex % 12;
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(d, daysInTargetMonth);
  return toYmd(new Date(targetYear, targetMonth, clampedDay));
}

/**
 * Compute the contract end date for display/submission.
 * Fixed Term ends the day BEFORE the duration's anniversary (e.g. a 1 Year
 * contract starting Jan 1, 2026 ends Dec 31, 2026). Indefinite or invalid
 * input returns ''.
 */
export function computeContractEndDate(
  startYmd: string,
  contractType: 'Fixed Term' | 'Indefinite',
  amount: number,
  unit: DurationUnit,
): string {
  if (contractType === 'Indefinite') return '';
  const after = addCalendarDuration(startYmd, amount, unit);
  if (!after) return '';
  const [y, m, d] = after.split('-').map(Number);
  return toYmd(new Date(y, m - 1, d - 1));
}

/** "2026-12-31" -> "December 31, 2026 (Thursday)" */
export function formatLongDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const datePart = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${datePart} (${weekday})`;
}

/** (1, 'Years') -> "1 Year", (6, 'Months') -> "6 Months" */
export function formatDurationString(amount: number, unit: DurationUnit): string {
  const singular: Record<DurationUnit, string> = {
    Days: 'Day',
    Weeks: 'Week',
    Months: 'Month',
    Years: 'Year',
  };
  return `${amount} ${amount === 1 ? singular[unit] : unit}`;
}

/**
 * Reverse of formatDurationString. Parses "1 Year", "6 Months", etc. back into a
 * duration amount/unit, or detects the "Indefinite" sentinel (also used for empty
 * input). Falls back to a 1 Year Fixed Term if the string isn't recognized.
 */
export function parseDurationString(s: string): {
  contractType: 'Fixed Term' | 'Indefinite';
  amount: number;
  unit: DurationUnit;
} {
  const trimmed = s.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'indefinite') {
    return { contractType: 'Indefinite', amount: 1, unit: 'Years' };
  }
  const m = /^(\d+)\s*(day|days|week|weeks|month|months|year|years)$/i.exec(trimmed);
  if (m) {
    const amount = Math.max(1, Math.min(99, parseInt(m[1], 10)));
    const unitWord = m[2].toLowerCase();
    const unit: DurationUnit = unitWord.startsWith('day')
      ? 'Days'
      : unitWord.startsWith('week')
        ? 'Weeks'
        : unitWord.startsWith('month')
          ? 'Months'
          : 'Years';
    return { contractType: 'Fixed Term', amount, unit };
  }
  return { contractType: 'Fixed Term', amount: 1, unit: 'Years' };
}
