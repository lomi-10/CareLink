/** Shared contract date window helpers for attendance month/week navigation. */

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function ymdLastOfMonth(y: number, m: number): string {
  const d = new Date(y, m, 0);
  return `${y}-${pad2(m)}-${pad2(d.getDate())}`;
}

/** True if any calendar day in that month overlaps [start, end] inclusive (null = open on that side). */
export function monthOverlapsContract(
  y: number,
  mo: number,
  start: string | null,
  end: string | null,
): boolean {
  if (!start && !end) return true;
  const first = `${y}-${pad2(mo)}-01`;
  const last = ymdLastOfMonth(y, mo);
  if (start && last < start) return false;
  if (end && first > end) return false;
  return true;
}
