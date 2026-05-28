import API_URL from '@/constants/api';

export type ComplaintCategory = 'conduct' | 'payment' | 'safety' | 'contract' | 'other';

export async function submitComplaint(body: {
  application_id: number;
  user_id: number;
  user_type: 'parent' | 'helper';
  subject: string;
  description: string;
  category?: ComplaintCategory | string;
}) {
  const res = await fetch(`${API_URL}/shared/submit_complaint.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      application_id: body.application_id,
      user_id: body.user_id,
      user_type: body.user_type,
      subject: body.subject,
      body: body.description,
      category: body.category ?? 'other',
    }),
  });
  return res.json() as Promise<{ success: boolean; message?: string; complaint_id?: number }>;
}

export type AdminComplaintRow = {
  complaint_id: number;
  application_id: number | null;
  placement_id?: number | null;
  complainant_user_id: number;
  respondent_id?: number | null;
  complainant_role: string | null;
  complainant_name: string;
  category: string | null;
  subject: string;
  body: string;
  status: string;
  severity: string;
  admin_notes: string | null;
  forwarded_by_admin_id: number | null;
  forwarded_at: string | null;
  created_at: string;
};

export async function fetchAdminComplaints(adminUserId: number) {
  const res = await fetch(`${API_URL}/admin/get_complaints.php?admin_user_id=${adminUserId}`);
  return res.json() as Promise<{ success: boolean; complaints?: AdminComplaintRow[]; message?: string }>;
}

export async function forwardComplaintToPeso(body: {
  complaint_id: number;
  admin_user_id: number;
  admin_note?: string;
}) {
  const res = await fetch(`${API_URL}/admin/forward_complaint_peso.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ success: boolean; message?: string }>;
}

export async function fetchPesoComplaints(pesoUserId: number) {
  const res = await fetch(`${API_URL}/peso/get_complaints.php?peso_user_id=${pesoUserId}`);
  return res.json() as Promise<{ success: boolean; complaints?: AdminComplaintRow[]; message?: string }>;
}
