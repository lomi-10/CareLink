// hooks/parent/usePlusStatus.ts
// Lightweight CareLink Plus status check for chrome (menu, nav) that needs to
// know only whether the account is subscribed — not the full receipt detail
// that the subscription screen itself loads.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

export function usePlusStatus() {
  const [isPlus, setIsPlus] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const id = String((raw ? JSON.parse(raw) : {})?.user_id ?? '');
      if (!id) { setLoading(false); return; }
      const res = await fetch(`${API_URL}/parent/subscribe.php?parent_id=${id}&requester_id=${id}`);
      const data = await res.json();
      if (data.success) setIsPlus(!!data.plus?.is_plus);
    } catch { /* menu still renders with the default (non-subscriber) label */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { isPlus, loading, refresh };
}
