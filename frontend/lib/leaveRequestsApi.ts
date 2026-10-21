import API_URL from '@/constants/api';

export type LeaveRequestStatus = 'pending' | 'approved' | 'declined';

export type LeaveReasonCode = 'sick' | 'personal' | 'family_emergency' | 'other';
export type PaidLeaveSource = 'statutory_sil' | 'contract_sick' | 'contract_vacation' | 'unpaid';

type LeaveBalanceBucket = {
  total: number;
  used: number;
  remaining: number;
};

export type LeaveRequestRow = {
  id: number;
  application_id: number;
  helper_id: number;
  helper_name?: string | null;
  date: string;
  reason_code?: LeaveReasonCode | string;
  helper_note?: string | null;
  reason: string | null;
  status: LeaveRequestStatus;
  /** 1 = paid leave, 0 = unpaid, null = pending or declined */
  paid_leave?: number | null;
  paid_leave_source?: PaidLeaveSource | null;
  response_note?: string | null;
  responded_at: string | null;
  responded_by?: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type LeaveBalanceData = {
  total: number;
  used: number;
  remaining: number;
  at_paid_limit: boolean;
  paid_available_for_reason: {
    sick: boolean;
    personal: boolean;
  };
  as_of_date: string;
  service_year_start: string | null;
  service_year_end: string | null;
  contract_exists: boolean;
  statutory_sil: LeaveBalanceBucket & {
    available: number;
    eligible: boolean;
    eligible_on: string | null;
  };
  contract_vacation: LeaveBalanceBucket;
  contract_sick: LeaveBalanceBucket;
  blocked_dates: string[];
};

export async function fetchLeaveBalance(applicationId: number, helperId: number, date?: string) {
  const params: Record<string, string> = {
    application_id: String(applicationId),
    helper_id: String(helperId),
  };
  if (date) params.date = date;
  const qs = new URLSearchParams(params);
  const r = await fetch(`${API_URL}/v1/leave-requests/balance.php?${qs}`);
  return r.json() as Promise<{
    success: boolean;
    data?: LeaveBalanceData;
    message?: string;
  }>;
}

export async function fetchLeaveRequests(
  applicationId: number,
  userId: number,
  userType: 'parent' | 'helper',
) {
  const qs = new URLSearchParams({
    application_id: String(applicationId),
    user_id: String(userId),
    user_type: userType,
  });
  const r = await fetch(`${API_URL}/v1/applications/leave-requests.php?${qs}`);
  return r.json() as Promise<{
    success: boolean;
    data?: LeaveRequestRow[];
    message?: string;
  }>;
}

export async function submitLeaveRequest(
  applicationId: number,
  helperId: number,
  body: { date: string; reason_code: LeaveReasonCode; helper_note?: string | null },
) {
  const r = await fetch(`${API_URL}/v1/leave-requests/create.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      application_id: applicationId,
      helper_id: helperId,
      date: body.date,
      reason_code: body.reason_code,
      helper_note: body.helper_note?.trim() || undefined,
    }),
  });
  return r.json() as Promise<{
    success: boolean;
    data?: LeaveRequestRow;
    warnings?: string[];
    message?: string;
  }>;
}

export async function respondToLeaveRequest(
  leaveRequestId: number,
  parentUserId: number,
  status: 'approved' | 'declined',
  note?: string | null,
) {
  const r = await fetch(`${API_URL}/v1/leave-requests/respond.php`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leave_request_id: leaveRequestId,
      user_id: parentUserId,
      status,
      note: note?.trim() || undefined,
    }),
  });
  return r.json() as Promise<{
    success: boolean;
    data?: {
      id: number;
      status: string;
      responded_at: string;
      paid_leave?: boolean | null;
      paid_leave_source?: PaidLeaveSource | null;
    };
    message?: string;
  }>;
}

export const LEAVE_REASON_OPTIONS: { value: LeaveReasonCode; label: string }[] = [
  { value: 'sick', label: 'Sick' },
  { value: 'personal', label: 'Personal' },
  { value: 'family_emergency', label: 'Family emergency' },
  { value: 'other', label: 'Other' },
];

export function labelForLeaveReasonCode(code: string | undefined): string {
  const row = LEAVE_REASON_OPTIONS.find((o) => o.value === code);
  return row?.label ?? 'Leave';
}
