// lib/payrollApi.ts
// Read-only payroll CLARITY summary for a placement. No cash-out / money movement —
// just what's been earned, days worked, and leave used, so the helper (or parent)
// can keep track. Final pay is always set by the employer.
import API_URL from '@/constants/api';

export type PayrollSummary = {
  has_contract: boolean;
  currency: string;
  salary_amount: number;
  salary_period: string;        // Monthly | Weekly | Daily
  payment_schedule: string | null;
  period_label: string;         // e.g. "July 2026"
  period_start: string;
  period_end: string;
  days_worked: number;
  days_scheduled: number;
  leave_used: number;
  estimated_earned: number;
  is_estimate: boolean;
  next_payout: string;
};

export async function fetchPayrollSummary(
  applicationId: number,
  userId: number,
  userType: 'helper' | 'parent',
): Promise<{ success: boolean; data?: PayrollSummary; message?: string }> {
  try {
    const res = await fetch(
      `${API_URL}/v1/applications/payroll.php?application_id=${applicationId}&user_id=${userId}&user_type=${userType}`,
    );
    const data = await res.json();
    if (!data.success) return { success: false, message: data.message };
    return { success: true, data: data as PayrollSummary };
  } catch (e: any) {
    return { success: false, message: e?.message ?? 'Network error' };
  }
}

/** Short label for a salary period, e.g. "mo" / "wk" / "day". */
export function salaryPeriodAbbr(period: string): string {
  const p = (period || '').toLowerCase();
  if (p.startsWith('week')) return 'wk';
  if (p.startsWith('day')) return 'day';
  return 'mo';
}

/** Format a peso amount with no decimals for compact display. */
export function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString()}`;
}
