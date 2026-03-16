// hooks/useParentStats.ts
// Custom hook for fetching and managing parent statistics

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../constants/api';

export interface ParentStats {
  posted_jobs: number;
  active_applications: number;
  messages: number;
  hired_helpers: number;
}

export function useParentStats() {
  const [stats, setStats] = useState<ParentStats>({
    posted_jobs: 0,
    active_applications: 0,
    messages: 0,
    hired_helpers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('No user data found');
      }

      const user = JSON.parse(userData);
      const userId = user.user_id;

      // TODO: Replace with actual API endpoint
      const response = await fetch(`${API_URL}/parent/get_stats.php?user_id=${userId}`);
      const data = await response.json();

      // Uncomment when API is ready:
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchStats();
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refresh,
  };
}
