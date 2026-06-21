// lib/pesoDashboardApi.ts
// PHP: peso/get_dashboard_overview.php
import API_URL from '@/constants/api';
import { withPesoStaffQuery } from '@/lib/pesoStaffQuery';

export type InterviewsToday = { scheduled: number; completed: number; missed: number };

export type DashboardStats = {
  helpers_waiting: number;
  jobs_awaiting_approval: number;
  interviews_today: InterviewsToday;
  active_contracts: number;
  contracts_expiring_soon: number;
  open_complaints: number;
  success_rate_pct: number;
  placements_this_month: number;
  applications_this_month: number;
  interviews_this_month: number;
};

export type QueueEntry = {
  user_id: number;
  code: string;
  name: string;
  profile_image: string | null;
  tags: string[];
  submitted_label: string;
};

export type VerificationQueue = {
  helpers: QueueEntry[];
  helpers_total: number;
  employers: QueueEntry[];
  employers_total: number;
};

export type ActivityEntry = {
  type: 'application' | 'job_approved' | 'interview_completed' | 'contract_signed';
  title: string;
  subtitle: string;
  ts: string;
  ts_label: string;
};

export type MonthlyOverviewPoint = { week_label: string; placements: number };
export type TopCategoryShare = { category_name: string; pct: number };

export type DashboardOverview = {
  stats: DashboardStats;
  verification_queue: VerificationQueue;
  recent_activities: ActivityEntry[];
  monthly_overview: MonthlyOverviewPoint[];
  top_categories: TopCategoryShare[];
};

export async function fetchPesoDashboardOverview(): Promise<{ success: boolean; data?: DashboardOverview; message?: string }> {
  const url = await withPesoStaffQuery(`${API_URL}/peso/get_dashboard_overview.php`);
  const res = await fetch(url);
  return res.json();
}
