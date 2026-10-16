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

export function useParentWorkDashboard({ includeOperations = false }: { includeOperations?: boolean } = {}) {
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
          const [attendanceResult, taskResult, leaveRes] = await Promise.all([
            includeOperations ? fetchAttendanceToday(appId, hId).catch((error) => {
              console.error(`[useParentWorkDashboard] Could not load attendance for application ${appId}:`, error);
              return null;
            }) : Promise.resolve(null),
            includeOperations ? fetchApplicationTasks(appId, parentId, 'parent', 'today').catch((error) => {
              console.error(`[useParentWorkDashboard] Could not load tasks for application ${appId}:`, error);
              return null;
            }) : Promise.resolve(null),
            fetchLeaveRequests(appId, parentId, 'parent').catch((error) => {
            console.error(`[useParentWorkDashboard] Could not load leave requests for application ${appId}:`, error);
            return null;
            }),
          ]);
          const tasks = taskResult?.data ?? [];
          const pendingLeaves = (leaveRes?.data ?? []).filter((l) => l.status === 'pending');
          return {
            placement: p,
            checkedIn: attendanceResult?.data?.checked_in ?? false,
            checkInAt: attendanceResult?.data?.checked_in_at ?? null,
            tasksTotal: includeOperations ? tasks.length : 0,
            tasksDone: includeOperations ? tasks.filter((task) => task.status === 'done').length : 0,
            pendingLeaves,
          } satisfies PlacementDashData;
        }),
      );
      setPerPlacement(results);
      setStats({
        activeHelpers: results.length,
        checkedInToday: results.filter((r) => r.checkedIn).length,
        pendingTasksTotal: results.reduce((total, r) => total + (r.tasksTotal - r.tasksDone), 0),
        pendingLeaveTotal: results.reduce((s, r) => s + r.pendingLeaves.length, 0),
      });
    } finally {
      setDashLoading(false);
    }
  }, [includeOperations, placements]);

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
