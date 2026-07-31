// hooks/shared/useDemoSession.ts
// Is this user in a test session with the seeded demo employers?
//
// Drives whether the "Finish demo session" handover is offered. Fails closed —
// on any error it reports false, so a real user is never shown a demo control.
// Once demo_reset.php has cleared their activity this flips back to false on the
// next check, so nothing needs to be manually turned off after testing.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

export function useDemoSession() {
  const [isDemoParticipant, setIsDemoParticipant] = useState(false);

  const check = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const user = raw ? JSON.parse(raw) : {};
      const userId = String(user.user_id ?? '');
      if (!userId) { setIsDemoParticipant(false); return; }

      const res = await fetch(
        `${API_URL}/shared/demo_status.php?user_id=${encodeURIComponent(userId)}&requester_id=${encodeURIComponent(userId)}`,
      );
      const data = await res.json();
      setIsDemoParticipant(Boolean(data?.is_demo_participant));
    } catch {
      setIsDemoParticipant(false);
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  return { isDemoParticipant, refresh: check };
}
