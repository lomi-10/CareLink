import {
  applicationTerminationDetailsUrl,
  applicationTerminationInitiateUrl,
} from '@/constants/applications';

export type TerminationReasonCode =
  | 'moving_away'
  | 'family_emergency'
  | 'found_other_work'
  | 'misconduct'
  | 'end_of_term'
  | 'mutual_agreement'
  | 'other';

export const TERMINATION_REASON_OPTIONS: { value: TerminationReasonCode; label: string }[] = [
  { value: 'moving_away', label: 'Moving away' },
  { value: 'family_emergency', label: 'Family emergency' },
  { value: 'found_other_work', label: 'Found other work' },
  { value: 'misconduct', label: 'Misconduct' },
  { value: 'end_of_term', label: 'End of term' },
  { value: 'mutual_agreement', label: 'Mutual agreement' },
  { value: 'other', label: 'Other' },
];

export type TerminationFinalPayEstimate = {
  amount: number | null;
  currency: string;
  note: string;
  salary_period: string | null;
};

export type TerminationDetailsResponse = {
  success: boolean;
  message?: string;
  application_id?: number;
  status?: string;
  termination_reason?: string | null;
  termination_reason_label?: string | null;
  termination_note?: string | null;
  termination_notice_date?: string | null;
  termination_last_day?: string | null;
  termination_initiated_by?: number | null;
  final_pay_estimate?: TerminationFinalPayEstimate;
};

export async function fetchTerminationDetails(
  applicationId: number,
  userId: number,
  userType: 'parent' | 'helper',
) {
  const url = applicationTerminationDetailsUrl(applicationId, userId, userType);
  const r = await fetch(url);
  return r.json() as Promise<TerminationDetailsResponse>;
}

export async function postTerminationInitiate(body: {
  application_id: number;
  user_id: number;
  user_type: 'parent' | 'helper';
  reason: TerminationReasonCode;
  note?: string;
  is_mutual_agreement: boolean;
}) {
  const r = await fetch(applicationTerminationInitiateUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json() as Promise<
    TerminationDetailsResponse & {
      termination_notice_date?: string;
      termination_last_day?: string;
    }
  >;
}

export function addDaysToYmd(ymd: string, delta: number): string {
  const [yy, mm, dd] = ymd.split('-').map(Number);
  const d = new Date(yy, mm - 1, dd);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computePreviewLastWorkingDay(isMutual: boolean, todayYmd: string): string {
  if (isMutual) return todayYmd;
  return addDaysToYmd(todayYmd, 5);
}

/** Normalize API application / placement status strings. */
export function isTerminationPendingStatus(status: string): boolean {
  const s = status.trim().toLowerCase().replace(/\s+/g, '_');
  return s === 'termination_pending' || s === 'pending_termination';
}

/**
 * True while the notice-period UI should show: termination pending and either no last day yet
 * or today is still on/before last working day (local YYYY-MM-DD lexicographic compare).
 */
export function noticePeriodStillActive(
  isTerminationPending: boolean,
  terminationLastDayYmd: string | null | undefined,
  todayYmd: string,
): boolean {
  if (!isTerminationPending) return false;
  const last = terminationLastDayYmd?.trim();
  if (!last) return true;
  return todayYmd <= last;
}
