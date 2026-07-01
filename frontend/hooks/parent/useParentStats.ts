// hooks/useParentStats.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

export interface ParentStats {
  active_job_posts:     number;
  total_applicants:     number;
  active_placements:    number;
  saved_helpers:        number;
  pending_applications: number;
  shortlisted_count:    number;
}

const DEFAULT: ParentStats = {
  active_job_posts:     0,
  total_applicants:     0,
  active_placements:    0,
  saved_helpers:        0,
  pending_applications: 0,
  shortlisted_count:    0,
};

export function useParentStats() {
  const [stats, setStats]   = useState<ParentStats>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const { user_id } = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/parent/get_stats.php?user_id=${user_id}&requester_id=${user_id}`);
      const data = await res.json();
      if (data.success) setStats({ ...DEFAULT, ...data.stats });
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return { stats, loading, error, refresh: fetchStats };
}
