import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

export type PlacementHistoryItem = {
  application_id: number;
  job_post_id: number;
  helper_id: number;
  helper_name: string;
  helper_photo: string | null;
  job_title: string;
  status: string;
  employment_start_date: string | null;
  ended_on: string | null;
  confirmed_salary: number | null;
  salary_period: string | null;
};

export function useParentPlacementHistory() {
  const [placements, setPlacements] = useState<PlacementHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) { setPlacements([]); return; }
      const user = JSON.parse(raw) as { user_id?: number };
      const parentId = Number(user.user_id);
      if (!parentId) { setPlacements([]); return; }
      const res = await fetch(`${API_URL}/parent/placement_history.php?parent_id=${parentId}`);
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Failed'); setPlacements([]); return; }
      setPlacements(data.placements ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
      setPlacements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  return { placements, loading, error, refresh: load };
}
