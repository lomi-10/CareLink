// hooks/peso/usePesoDashboard.ts
import { useCallback, useEffect, useState } from 'react';
import { fetchPesoDashboardOverview, type DashboardOverview } from '@/lib/pesoDashboardApi';

export function usePesoDashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPesoDashboardOverview();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Could not load dashboard data.');
      }
    } catch {
      setError('Network error while loading dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
