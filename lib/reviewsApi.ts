import API_URL from '@/constants/api';

export type PendingReview = {
  application_id: number;
  job_title: string;
  counterparty_name: string;
};

export async function fetchPendingReviews(userId: number, userType: 'parent' | 'helper') {
  const qs = new URLSearchParams({ user_id: String(userId), user_type: userType });
  const res = await fetch(`${API_URL}/shared/placement_review_pending.php?${qs}`);
  return res.json() as Promise<{ success: boolean; pending?: PendingReview[]; message?: string }>;
}

export async function submitPlacementReview(body: {
  application_id: number;
  user_id: number;
  user_type: 'parent' | 'helper';
  rating: number;
  comment?: string;
}) {
  const res = await fetch(`${API_URL}/shared/submit_placement_review.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ success: boolean; message?: string; review_id?: number }>;
}
