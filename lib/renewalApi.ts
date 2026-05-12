import API_URL from '@/constants/api';

export type RenewalStatusResponse = {
  success: boolean;
  message?: string;
  application_id?: number;
  parent_interested?: boolean | null;
  helper_interested?: boolean | null;
  both_interested?: boolean;
};

export async function fetchRenewalStatus(
  applicationId: number,
  userId: number,
  userType: 'parent' | 'helper',
) {
  const qs = new URLSearchParams({
    application_id: String(applicationId),
    user_id: String(userId),
    user_type: userType,
  });
  const res = await fetch(`${API_URL}/shared/placement_renewal_status.php?${qs}`);
  return res.json() as Promise<RenewalStatusResponse>;
}

export async function postRenewalIntent(body: {
  application_id: number;
  user_id: number;
  user_type: 'parent' | 'helper';
  interested: boolean;
}) {
  const res = await fetch(`${API_URL}/shared/placement_renewal_intent.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<RenewalStatusResponse & { message?: string }>;
}
