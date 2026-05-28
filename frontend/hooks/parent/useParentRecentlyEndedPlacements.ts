import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

export type RecentlyEndedPlacement = {
  application_id: number;
  job_post_id: number;
  helper_id: number;
  helper_name: string;
  job_title: string;
  ended_on: string | null;
};

export function useParentRecentlyEndedPlacements(maxRows = 1) {
  const [placements, setPlacements] = useState<RecentlyEndedPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) {
        setPlacements([]);
        return;
      }
      const user = JSON.parse(raw) as { user_id?: number };
      const parentId = Number(user.user_id);
      if (!parentId) {
        setPlacements([]);
        return;
      }

      const res = await fetch(
        `${API_URL}/parent/placement_recently_ended.php?parent_id=${parentId}`,
      );
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Failed to load');
        setPlacements([]);
        return;
      }
      const list = (data.placements ?? []) as RecentlyEndedPlacement[];
      setPlacements(list.slice(0, maxRows));
    } catch (e: unknown) {
      console.error('[useParentRecentlyEndedPlacements]', e);
      setError(e instanceof Error ? e.message : 'Failed to load');
      setPlacements([]);
    } finally {
      setLoading(false);
    }
  }, [maxRows]);

  useEffect(() => {
    void load();
  }, [load]);

  return { placements, loading, error, refresh: load };
}
