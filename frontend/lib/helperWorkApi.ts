export function ymdLocal(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday Y-m-d of the week containing `ymd` (local calendar). */
export function mondayOfWeekContaining(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  date.setDate(date.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
  return ymdLocal(date);
}
