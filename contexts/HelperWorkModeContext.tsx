import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

export type ActiveHire = {
  application_id: number;
  job_post_id: number;
  parent_id: number;
  job_title: string;
  employer_name: string;
};

type HelperWorkModeContextValue = {
  ready: boolean;
  isWorkMode: boolean;
  activeHire: ActiveHire | null;
  refresh: () => Promise<void>;
};

const HelperWorkModeContext = createContext<HelperWorkModeContextValue | undefined>(undefined);

async function loadWorkContext(): Promise<{ isWorkMode: boolean; activeHire: ActiveHire | null }> {
  const raw = await AsyncStorage.getItem('user_data');
  if (!raw) return { isWorkMode: false, activeHire: null };
  const user = JSON.parse(raw) as { user_type?: string; user_id?: string | number };
  if (user.user_type !== 'helper') return { isWorkMode: false, activeHire: null };
  const helperId = Number(user.user_id);
  if (!helperId) return { isWorkMode: false, activeHire: null };

  const res = await fetch(`${API_URL}/helper/get_work_context.php?helper_id=${helperId}`);
  const data = await res.json();
  if (!data.success) return { isWorkMode: false, activeHire: null };
  return {
    isWorkMode: !!data.is_work_mode,
    activeHire: (data.active_hire ?? null) as ActiveHire | null,
  };
}

export function HelperWorkModeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isWorkMode, setIsWorkMode] = useState(false);
  const [activeHire, setActiveHire] = useState<ActiveHire | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await loadWorkContext();
      setIsWorkMode(next.isWorkMode);
      setActiveHire(next.activeHire);
    } catch (e) {
      console.error('Work context refresh:', e);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const next = await loadWorkContext();
        if (!alive) return;
        setIsWorkMode(next.isWorkMode);
        setActiveHire(next.activeHire);
      } catch (e) {
        console.error('Work context:', e);
        if (alive) {
          setIsWorkMode(false);
          setActiveHire(null);
        }
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(
    () => ({ ready, isWorkMode, activeHire, refresh }),
    [ready, isWorkMode, activeHire, refresh],
  );

  return (
    <HelperWorkModeContext.Provider value={value}>{children}</HelperWorkModeContext.Provider>
  );
}

export function useHelperWorkMode(): HelperWorkModeContextValue {
  const ctx = useContext(HelperWorkModeContext);
  if (ctx) return ctx;
  return {
    ready: true,
    isWorkMode: false,
    activeHire: null,
    refresh: async () => {},
  };
}
