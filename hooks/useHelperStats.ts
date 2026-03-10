// hooks/useHelperStats.ts
// Custom hook for fetching and managing helper statistics

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../constants/api';

export interface HelperStats {
  applications: number;
  saved_jobs: number;
  profile_views: number;
}

export function useHelperStats() {
  const [stats, setStats] = useState<HelperStats>({
    applications: 0,
    saved_jobs: 0,
    profile_views: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch statistics from backend
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
      const response = await fetch(`${API_URL}/helper/get_stats.php?user_id=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.message || 'Failed to fetch stats');
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  // Refresh statistics
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
