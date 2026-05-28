/** Normalize API/job date to YYYY-MM-DD for hire flow text inputs */
export function toYmdInput(d: string | null | undefined): string {
  if (d == null || d === '') return '';
  const t = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const x = new Date(t);
  if (Number.isNaN(x.getTime())) return '';
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
