// hooks/parent/useParentUpcomingInterviews.ts
// Upcoming interviews across all of the parent's applications (dashboard widget).
// PHP: parent/get_upcoming_interviews.php
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

export interface UpcomingInterview {
  interview_id: number;
  application_id: number;
  full_name: string;
  profile_image?: string | null;
  job_title: string;
  interview_date: string;
  interview_type: string;
  location_or_link?: string | null;
  status: string;
  helper_confirmed: boolean;
  is_today: boolean;
}

export function useParentUpcomingInterviews(limit = 5) {
  const [interviews, setInterviews] = useState<UpcomingInterview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res = await fetch(`${API_URL}/parent/get_upcoming_interviews.php?parent_id=${user.user_id}&requester_id=${user.user_id}&limit=${limit}`);
      const data = await res.json();
      setInterviews(data.success ? (data.interviews || []) : []);
    } catch { setInterviews([]); }
    finally { setLoading(false); }
  }, [limit]);

  useEffect(() => { fetchInterviews(); }, [fetchInterviews]);

  return { interviews, loading, refresh: fetchInterviews };
}
