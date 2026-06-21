import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useParentActivePlacements, type ActivePlacement } from './useParentActivePlacements';
import { fetchAttendanceToday } from '@/lib/attendanceApi';
import { fetchApplicationTasks } from '@/lib/applicationTasksApi';
import { fetchLeaveRequests, type LeaveRequestRow } from '@/lib/leaveRequestsApi';

export type PlacementDashData = {
  placement: ActivePlacement;
  checkedIn: boolean;
  checkInAt: string | null;
  tasksTotal: number;
  tasksDone: number;
  pendingLeaves: LeaveRequestRow[];
};

export type WorkDashStats = {
  activeHelpers: number;
  checkedInToday: number;
  pendingTasksTotal: number;
  pendingLeaveTotal: number;
};

export function useParentWorkDashboard() {
  const { placements, loading: placementsLoading, refresh: refreshPlacements } =
    useParentActivePlacements();
  const [perPlacement, setPerPlacement] = useState<PlacementDashData[]>([]);
  const [stats, setStats] = useState<WorkDashStats>({
    activeHelpers: 0,
    checkedInToday: 0,
    pendingTasksTotal: 0,
    pendingLeaveTotal: 0,
  });
  const [dashLoading, setDashLoading] = useState(false);

  const fetchDashData = useCallback(async () => {
    if (placements.length === 0) {
      setPerPlacement([]);
      setStats({ activeHelpers: 0, checkedInToday: 0, pendingTasksTotal: 0, pendingLeaveTotal: 0 });
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
          const hId = Number(p.helper_id);
          const [attRes, taskRes, leaveRes] = await Promise.all([
            fetchAttendanceToday(appId, hId).catch(() => null),
            fetchApplicationTasks(appId, parentId, 'parent', 'today').catch(() => null),
            fetchLeaveRequests(appId, parentId, 'parent').catch(() => null),
          ]);
          const tasks = taskRes?.data ?? [];
          const pendingLeaves = (leaveRes?.data ?? []).filter((l) => l.status === 'pending');
          return {
            placement: p,
            checkedIn: attRes?.data?.checked_in ?? false,
            checkInAt: attRes?.data?.checked_in_at ?? null,
            tasksTotal: tasks.length,
            tasksDone: tasks.filter((t) => t.status === 'done').length,
            pendingLeaves,
          } satisfies PlacementDashData;
        }),
      );
      setPerPlacement(results);
      setStats({
        activeHelpers: results.length,
        checkedInToday: results.filter((r) => r.checkedIn).length,
        pendingTasksTotal: results.reduce((s, r) => s + (r.tasksTotal - r.tasksDone), 0),
        pendingLeaveTotal: results.reduce((s, r) => s + r.pendingLeaves.length, 0),
      });
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
    stats,
    loading: placementsLoading || dashLoading,
    refresh,
  };
}
