export const DEFAULT_WORK_START = '08:00';
export const DEFAULT_WORK_END = '17:00';

/** "HH:MM" (24h) -> minutes since midnight, or null if invalid */
function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** "08:00" -> "8:00 AM", "17:30" -> "5:30 PM" */
export function formatTime12h(value: string): string {
  const minutes = parseHHMM(value);
  if (minutes == null) return '';
  let h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Daily work hours, excluding a 1-hour lunch break.
 * Handles an overnight shift (end <= start) by wrapping to the next day.
 */
export function computeWorkHoursLabel(start: string, end: string): string {
  const hours = computeScheduledWorkHours(start, end);
  if (hours == null) return '';
  const formatted = hours % 1 === 0 ? String(hours) : hours.toFixed(1);
  return `= ${formatted} hours/day`;
}

/** Scheduled daily work hours, excluding the default 1-hour lunch break. */
export function computeScheduledWorkHours(start: string, end: string): number | null {
  const startMin = parseHHMM(start);
  const endMin = parseHHMM(end);
  if (startMin == null || endMin == null) return null;
  let diff = endMin - startMin;
  if (diff <= 0) diff += 24 * 60;
  diff = Math.max(0, diff - 60);
  return diff / 60;
}

/** Free-text "work_hours" value sent to the backend */
export function workHoursToString(start: string, end: string, flexible: boolean): string {
  if (flexible) return 'Flexible (varies by daily agreement)';
  const startLabel = formatTime12h(start);
  const endLabel = formatTime12h(end);
  if (!startLabel || !endLabel) return '';
  return `${startLabel} – ${endLabel}`;
}

/** "8:00 AM" -> "08:00", "5:30 PM" -> "17:30"; null if unparseable */
function parseTime12hToHHMM(value: string): string | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 1 || h > 12 || min < 0 || min > 59) return null;
  const period = m[3].toUpperCase();
  if (period === 'AM') {
    h = h === 12 ? 0 : h;
  } else {
    h = h === 12 ? 12 : h + 12;
  }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Reverse of workHoursToString. Parses "8:00 AM – 5:00 PM" back into 24h start/end
 * times, or detects the "Flexible (...)" sentinel. Falls back to the default work
 * empty times if the string is blank or unrecognized, so an unspecified
 * schedule is not silently presented as an agreed 8:00 AM–5:00 PM shift.
 */
export function parseWorkHoursString(s: string): { start: string; end: string; flexible: boolean } {
  const trimmed = s.trim();
  if (trimmed === '') return { start: '', end: '', flexible: false };
  if (/^flexible/i.test(trimmed)) return { start: '', end: '', flexible: true };
  const parts = trimmed.split(/\s*[–—-]\s*/);
  if (parts.length === 2) {
    const start = parseTime12hToHHMM(parts[0]);
    const end = parseTime12hToHHMM(parts[1]);
    if (start && end) {
      return { start, end, flexible: false };
    }
  }
  return { start: '', end: '', flexible: false };
}
