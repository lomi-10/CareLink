import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from '@/hooks/shared/use-color-scheme';

const STORAGE_KEY = 'carelink_color_scheme_preference';

export type ColorSchemePreference = 'system' | 'light' | 'dark';

type ColorSchemePreferenceContextValue = {
  /** User choice; `'system'` follows the device. */
  preference: ColorSchemePreference;
  setPreference: (next: ColorSchemePreference) => Promise<void>;
  /** Resolved light/dark for navigation theme. */
  resolvedColorScheme: 'light' | 'dark';
  hydrated: boolean;
};

const ColorSchemePreferenceContext = createContext<
  ColorSchemePreferenceContextValue | undefined
>(undefined);

export function ColorSchemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ColorSchemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && (raw === 'light' || raw === 'dark' || raw === 'system')) {
          setPreferenceState(raw);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback(async (next: ColorSchemePreference) => {
    setPreferenceState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      console.warn('Color scheme preference save failed', e);
    }
  }, []);

  const resolvedColorScheme: 'light' | 'dark' =
    preference === 'system' ? systemScheme : preference;

  const value = useMemo(
    () => ({ preference, setPreference, resolvedColorScheme, hydrated }),
    [preference, setPreference, resolvedColorScheme, hydrated],
  );

  return (
    <ColorSchemePreferenceContext.Provider value={value}>
      {children}
    </ColorSchemePreferenceContext.Provider>
  );
}

export function useColorSchemePreference(): ColorSchemePreferenceContextValue {
  const ctx = useContext(ColorSchemePreferenceContext);
  if (!ctx) {
    throw new Error('useColorSchemePreference must be used within ColorSchemePreferenceProvider');
  }
  return ctx;
}
