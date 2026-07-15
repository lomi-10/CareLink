// lib/salary.ts — single source of truth for how CareLink talks about pay.
//
// THE MODEL (important — the codebase used to disagree with itself):
//   • `salary_offered` / `salary_min` / `salary_max` are ALWAYS a MONTHLY amount.
//     post_job.php enforces the ₱7,000/month floor regardless of period, so the
//     stored number only ever means "pesos per month".
//   • `salary_period` is the PAYOUT SCHEDULE — how often the employer hands over
//     that monthly pay. It does NOT change what the amount means.
//
// So "₱8,000 · Semi-monthly" = ₱8,000 per month, released as ₱4,000 on the 15th
// and ₱4,000 at month-end. Rendering it as "₱8,000 / Daily" (as the old UI did)
// wrongly reads as ₱8,000 per day.

export type SalaryPeriod = 'Daily' | 'Weekly' | 'Semi-monthly' | 'Monthly';

/** Kasambahay norm: 6-day week ≈ 26 working days a month. */
export const WORKING_DAYS_PER_MONTH = 26;
export const WEEKS_PER_MONTH = 52 / 12; // ≈ 4.33

export const SALARY_PERIODS: { value: SalaryPeriod; label: string; hint: string }[] = [
  { value: 'Monthly', label: 'Monthly', hint: 'Once a month' },
  { value: 'Semi-monthly', label: 'Kinsenas', hint: '15th & end of month' },
  { value: 'Weekly', label: 'Weekly', hint: 'Every week' },
  { value: 'Daily', label: 'Daily', hint: 'Every working day' },
];

export function isSalaryPeriod(v: unknown): v is SalaryPeriod {
  return v === 'Daily' || v === 'Weekly' || v === 'Semi-monthly' || v === 'Monthly';
}

/** Normalises anything stored/legacy into a valid period. */
export function toSalaryPeriod(v: unknown): SalaryPeriod {
  if (isSalaryPeriod(v)) return v;
  const s = String(v ?? '').toLowerCase();
  if (s.startsWith('semi') || s.includes('kinsen')) return 'Semi-monthly';
  if (s.startsWith('week')) return 'Weekly';
  if (s.startsWith('dai') || s.startsWith('day')) return 'Daily';
  return 'Monthly';
}

/** How many payouts a month, for a given schedule. */
export function payoutsPerMonth(period: SalaryPeriod): number {
  switch (period) {
    case 'Semi-monthly': return 2;
    case 'Weekly': return WEEKS_PER_MONTH;
    case 'Daily': return WORKING_DAYS_PER_MONTH;
    default: return 1;
  }
}

/** Peso formatter — drops the decimals when the amount is whole. */
export function peso(n: number): string {
  if (!isFinite(n)) return '₱0';
  const rounded = Math.round(n * 100) / 100;
  return `₱${rounded.toLocaleString('en-PH', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export type PayoutSlice = { label: string; amount: number };
export type PayoutBreakdown = {
  period: SalaryPeriod;
  monthly: number;
  /** Amount handed over on each payout (approximate for Weekly/Daily). */
  each: number;
  /** True when `each` doesn't divide the month exactly (Weekly/Daily). */
  approximate: boolean;
  /** Concrete payouts to show — exact and summing to `monthly` for Kinsenas/Monthly. */
  slices: PayoutSlice[];
  /** One-line plain-English summary. */
  summary: string;
};

/**
 * Splits a MONTHLY salary across its payout schedule.
 * Kinsenas splits exactly (any centavo remainder lands on the 2nd payout) so the
 * two halves always add back up to the monthly figure.
 */
export function payoutBreakdown(monthly: number, period: SalaryPeriod): PayoutBreakdown {
  const m = Number(monthly) || 0;
  const per = payoutsPerMonth(period);
  const each = per > 0 ? m / per : m;

  if (period === 'Semi-monthly') {
    const first = Math.round((m / 2) * 100) / 100;
    const second = Math.round((m - first) * 100) / 100;
    return {
      period, monthly: m, each: first, approximate: false,
      slices: [
        { label: 'On the 15th', amount: first },
        { label: 'End of month', amount: second },
      ],
      summary: `${peso(first)} on the 15th + ${peso(second)} at month-end = ${peso(m)} a month`,
    };
  }
  if (period === 'Monthly') {
    return {
      period, monthly: m, each: m, approximate: false,
      slices: [{ label: 'Once a month', amount: m }],
      summary: `${peso(m)} once a month`,
    };
  }
  if (period === 'Weekly') {
    return {
      period, monthly: m, each, approximate: true,
      slices: [{ label: 'Each week', amount: each }],
      summary: `about ${peso(each)} per week (≈${WEEKS_PER_MONTH.toFixed(2)} weeks) = ${peso(m)} a month`,
    };
  }
  return {
    period, monthly: m, each, approximate: true,
    slices: [{ label: 'Each working day', amount: each }],
    summary: `about ${peso(each)} per working day (${WORKING_DAYS_PER_MONTH} days) = ${peso(m)} a month`,
  };
}

/** The headline rate — ALWAYS per month, because that's what the amount means. */
export function formatSalary(amount: number | string | null | undefined): string {
  const n = Number(amount) || 0;
  return `${peso(n)} / month`;
}

/** A monthly range, collapsing to a single figure when there's no max. */
export function formatSalaryRange(min: number | string | null | undefined, max?: number | string | null): string {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  if (hi > lo) return `${peso(lo)} – ${peso(hi)} / month`;
  return formatSalary(lo);
}

/** Short label for the payout schedule, e.g. "Paid kinsenas (15th & end of month)". */
export function formatPayoutSchedule(period: SalaryPeriod | string | null | undefined): string {
  const p = toSalaryPeriod(period);
  const cfg = SALARY_PERIODS.find((x) => x.value === p)!;
  return p === 'Semi-monthly' ? 'Paid kinsenas (15th & end of month)' : `Paid ${cfg.label.toLowerCase()}`;
}
