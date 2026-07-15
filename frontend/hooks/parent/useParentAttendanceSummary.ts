// hooks/parent/useParentAttendanceSummary.ts
// This-week attendance summary across the parent's placements (work dashboard donut).
// PHP: parent/get_attendance_summary.php
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

export interface AttendanceSummary {
  present: number; absent: number; leave: number; total: number;
  present_pct: number; absent_pct: number; leave_pct: number;
}
const EMPTY: AttendanceSummary = { present: 0, absent: 0, leave: 0, total: 0, present_pct: 0, absent_pct: 0, leave_pct: 0 };

export function useParentAttendanceSummary() {
  const [attendance, setAttendance] = useState<AttendanceSummary>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res = await fetch(`${API_URL}/parent/get_attendance_summary.php?parent_id=${user.user_id}&requester_id=${user.user_id}`);
      const data = await res.json();
      setAttendance(data.success ? data.attendance : EMPTY);
    } catch { setAttendance(EMPTY); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  return { attendance, loading, refresh: fetchSummary };
}
