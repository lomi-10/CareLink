// hooks/parent/useParentRecentApplicants.ts
// Recent applicants across all of the parent's job posts (dashboard widget).
// PHP: parent/get_recent_applicants.php
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

export interface RecentApplicant {
  application_id: number;
  helper_id: number;
  full_name: string;
  profile_image?: string | null;
  role: string;
  job_title: string;
  status: string;
  is_verified: boolean;
  applied_at: string;
}

export function useParentRecentApplicants(limit = 6) {
  const [applicants, setApplicants] = useState<RecentApplicant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchApplicants = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res = await fetch(`${API_URL}/parent/get_recent_applicants.php?parent_id=${user.user_id}&requester_id=${user.user_id}&limit=${limit}`);
      const data = await res.json();
      if (data.success) { setApplicants(data.applicants || []); setTotal(data.total || 0); }
      else { setApplicants([]); setTotal(0); }
    } catch { setApplicants([]); setTotal(0); }
    finally { setLoading(false); }
  }, [limit]);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);

  return { applicants, total, loading, refresh: fetchApplicants };
}
