import API_URL from '@/constants/api';

export type LeaveRequestStatus = 'pending' | 'approved' | 'declined';

export type LeaveRequestRow = {
  id: number;
  application_id: number;
  helper_id: number;
  helper_name?: string | null;
  date: string;
  reason: string | null;
  status: LeaveRequestStatus;
  responded_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

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
  body: { date: string; reason?: string | null },
) {
  const r = await fetch(`${API_URL}/v1/leave-requests/create.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      application_id: applicationId,
      helper_id: helperId,
      date: body.date,
      reason: body.reason?.trim() || undefined,
    }),
  });
  return r.json() as Promise<{
    success: boolean;
    data?: LeaveRequestRow;
    message?: string;
  }>;
}

export async function respondToLeaveRequest(
  leaveRequestId: number,
  parentUserId: number,
  status: 'approved' | 'declined',
) {
  const r = await fetch(`${API_URL}/v1/leave-requests/respond.php`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leave_request_id: leaveRequestId,
      user_id: parentUserId,
      status,
    }),
  });
  return r.json() as Promise<{
    success: boolean;
    data?: { id: number; status: string; responded_at: string };
    message?: string;
  }>;
}
