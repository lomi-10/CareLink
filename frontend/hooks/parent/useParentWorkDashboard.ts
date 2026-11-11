import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useParentActivePlacements, type ActivePlacement } from './useParentActivePlacements';
import { fetchLeaveRequests, type LeaveRequestRow } from '@/lib/leaveRequestsApi';

export type PlacementDashData = {
  placement: ActivePlacement;
  pendingLeaves: LeaveRequestRow[];
};

export function useParentWorkDashboard() {
  const { placements, loading: placementsLoading, refresh: refreshPlacements } =
    useParentActivePlacements();
  const [perPlacement, setPerPlacement] = useState<PlacementDashData[]>([]);
  const [dashLoading, setDashLoading] = useState(false);

  const fetchDashData = useCallback(async () => {
    if (placements.length === 0) {
      setPerPlacement([]);
      return;
    }
    const raw = await AsyncStorage.getItem('user_data');
    const parentId = raw ? Number((JSON.parse(raw) as { user_id: number }).user_id) : 0;
    if (!parentId) return;

    setDashLoading(true);
    try {
      const results = await Promise.all(
        placements.map(async (p) => {
          const appId = Number(p.application_id);
          const leaveRes = await fetchLeaveRequests(appId, parentId, 'parent').catch((error) => {
            console.error(`[useParentWorkDashboard] Could not load leave requests for application ${appId}:`, error);
            return null;
          });
          const pendingLeaves = (leaveRes?.data ?? []).filter((l) => l.status === 'pending');
          return {
            placement: p,
            pendingLeaves,
          } satisfies PlacementDashData;
        }),
      );
      setPerPlacement(results);
    } finally {
      setDashLoading(false);
    }
  }, [placements]);

  useEffect(() => {
    void fetchDashData();
  }, [fetchDashData]);

  const refresh = useCallback(async () => {
    await refreshPlacements();
  }, [refreshPlacements]);

  return {
    perPlacement,
    loading: placementsLoading || dashLoading,
    refresh,
  };
}
