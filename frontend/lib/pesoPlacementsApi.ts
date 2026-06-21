// lib/pesoPlacementsApi.ts
// PHP: peso/get_placements.php
import API_URL from '@/constants/api';
import { withPesoStaffQuery } from '@/lib/pesoStaffQuery';

export type PlacementLifecycleStatus = 'Active' | 'Terminating' | 'Terminated';

export type PesoPlacementRow = {
  application_id: number;
  job_post_id: number;
  job_title: string;
  lifecycle_status: PlacementLifecycleStatus;
  parent_id: number;
  parent_name: string;
  helper_id: number;
  helper_name: string;
  employment_start_date: string | null;
  employment_end_date: string | null;
  termination_reason: string | null;
  termination_notice_date: string | null;
  termination_last_day: string | null;
};

export async function fetchPesoPlacements(status: PlacementLifecycleStatus | 'All' = 'All') {
  const base = `${API_URL}/peso/get_placements.php?status=${encodeURIComponent(status)}`;
  const url = await withPesoStaffQuery(base);
  const res = await fetch(url);
  return res.json() as Promise<{ success: boolean; data?: { placements: PesoPlacementRow[] }; message?: string }>;
}
