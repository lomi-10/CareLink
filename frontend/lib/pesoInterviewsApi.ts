// lib/pesoInterviewsApi.ts
// PHP: peso/get_interviews.php
import API_URL from '@/constants/api';
import { withPesoStaffQuery } from '@/lib/pesoStaffQuery';

export type InterviewStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Rescheduled';
export type InterviewResult = 'Pending' | 'Pass' | 'Fail' | 'No Show';

export type PesoInterviewRow = {
  interview_id: number;
  code: string;
  job_title: string;
  helper_name: string;
  employer_name: string;
  interview_date: string;
  interview_type: 'In-person' | 'Video Call' | 'Phone';
  location_or_link: string | null;
  status: InterviewStatus;
  result: InterviewResult;
  parent_confirmed: boolean;
  helper_confirmed: boolean;
};

export async function fetchPesoInterviews(status: InterviewStatus | 'All' = 'All') {
  const base = `${API_URL}/peso/get_interviews.php?status=${encodeURIComponent(status)}`;
  const url = await withPesoStaffQuery(base);
  const res = await fetch(url);
  return res.json() as Promise<{ success: boolean; data?: { interviews: PesoInterviewRow[] }; message?: string }>;
}
