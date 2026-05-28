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
import { ymdLocal } from '@/lib/helperWorkApi';
import { isTerminationPendingStatus } from '@/lib/terminationApi';

export type ActiveHire = {
  application_id: number;
  job_post_id: number;
  parent_id: number;
  job_title: string;
  employer_name: string;
  placement_status?: 'active' | 'termination_pending';
  termination_last_day?: string | null;
  termination_notice_date?: string | null;
};

export type EmploymentEndedInfo = {
  application_id: number;
  job_post_id: number;
  parent_id: number;
  job_title: string;
  employer_name: string;
  employment_ended_on: string | null;
};

type HelperWorkModeContextValue = {
  ready: boolean;
  isWorkMode: boolean;
  activeHire: ActiveHire | null;
  employmentEnded: EmploymentEndedInfo | null;
  refresh: () => Promise<void>;
};

const HelperWorkModeContext = createContext<HelperWorkModeContextValue | undefined>(undefined);

type LoadResult = {
  isWorkMode: boolean;
  activeHire: ActiveHire | null;
  employmentEnded: EmploymentEndedInfo | null;
};

async function loadWorkContext(): Promise<LoadResult> {
  const raw = await AsyncStorage.getItem('user_data');
  if (!raw) return { isWorkMode: false, activeHire: null, employmentEnded: null };
  const user = JSON.parse(raw) as { user_type?: string; user_id?: string | number };
  if (user.user_type !== 'helper') return { isWorkMode: false, activeHire: null, employmentEnded: null };
  const helperId = Number(user.user_id);
  if (!helperId) return { isWorkMode: false, activeHire: null, employmentEnded: null };

  const res = await fetch(`${API_URL}/helper/get_work_context.php?helper_id=${helperId}`);
  const data = await res.json();
  if (!data.success) return { isWorkMode: false, activeHire: null, employmentEnded: null };

  const employmentEnded = (data.employment_ended as EmploymentEndedInfo | null | undefined) ?? null;

  if (!data.active_hire) {
    return {
      isWorkMode: false,
      activeHire: null,
      employmentEnded,
    };
  }

  const todayYmd = ymdLocal();
  const lastDayRaw = (data.termination_last_day ?? '').trim();
  const pendingNotice = isTerminationPendingStatus(String(data.placement_status ?? ''));
  const noticeStale =
    pendingNotice && lastDayRaw !== '' && todayYmd > lastDayRaw;

  if (noticeStale) {
    const hire = data.active_hire as ActiveHire;
    const synthesized: EmploymentEndedInfo = {
      application_id: hire.application_id,
      job_post_id: hire.job_post_id,
      parent_id: hire.parent_id,
      job_title: hire.job_title,
      employer_name: hire.employer_name,
      employment_ended_on: lastDayRaw,
    };
    return {
      isWorkMode: false,
      activeHire: null,
      employmentEnded: employmentEnded ?? synthesized,
    };
  }

  const placement_status = isTerminationPendingStatus(String(data.placement_status ?? ''))
    ? 'termination_pending'
    : 'active';

  const activeHire: ActiveHire = {
    ...(data.active_hire as ActiveHire),
    placement_status,
    termination_last_day: data.termination_last_day ?? null,
    termination_notice_date: data.termination_notice_date ?? null,
  };

  return {
    isWorkMode: !!data.is_work_mode,
    activeHire,
    employmentEnded,
  };
}

export function HelperWorkModeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isWorkMode, setIsWorkMode] = useState(false);
  const [activeHire, setActiveHire] = useState<ActiveHire | null>(null);
  const [employmentEnded, setEmploymentEnded] = useState<EmploymentEndedInfo | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await loadWorkContext();
      setIsWorkMode(next.isWorkMode);
      setActiveHire(next.activeHire);
      setEmploymentEnded(next.employmentEnded);
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
        setEmploymentEnded(next.employmentEnded);
      } catch (e) {
        console.error('Work context:', e);
        if (alive) {
          setIsWorkMode(false);
          setActiveHire(null);
          setEmploymentEnded(null);
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
    () => ({ ready, isWorkMode, activeHire, employmentEnded, refresh }),
    [ready, isWorkMode, activeHire, employmentEnded, refresh],
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
    employmentEnded: null,
    refresh: async () => {},
  };
}
