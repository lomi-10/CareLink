import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import { theme } from '@/constants/theme';
import type { ThemeColor } from '@/constants/theme';
import {
  HELPER_PORTAL_APPEARANCE_KEY,
  isParentThemeId,
  mergeHelperThemeColors,
  type ParentThemeId,
} from '@/constants/helperThemePalettes';
import { mergeParentThemeColors } from '@/constants/parentThemePalettes';

type HelperThemeValue = {
  themeId: ParentThemeId;
  setThemeId: (id: ParentThemeId) => Promise<void>;
  color: ThemeColor;
};

const HelperThemeContext = createContext<HelperThemeValue | null>(null);

export function HelperThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ParentThemeId>('default');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HELPER_PORTAL_APPEARANCE_KEY);
        if (!cancelled && isParentThemeId(raw)) {
          setThemeIdState(raw);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeId = useCallback(async (id: ParentThemeId) => {
    setThemeIdState(id);
    try {
      await AsyncStorage.setItem(HELPER_PORTAL_APPEARANCE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const color = useMemo(() => mergeHelperThemeColors(themeId), [themeId]);

  const applyToGlobalTheme = useCallback((merged: ThemeColor) => {
    const t = theme.color as unknown as Record<keyof ThemeColor, string>;
    (Object.keys(merged) as (keyof ThemeColor)[]).forEach((k) => {
      t[k] = merged[k] as string;
    });
  }, []);

  useLayoutEffect(() => {
    applyToGlobalTheme(mergeHelperThemeColors(themeId));
  }, [applyToGlobalTheme, themeId]);

  useLayoutEffect(
    () => () => {
      applyToGlobalTheme(mergeParentThemeColors('default'));
    },
    [applyToGlobalTheme],
  );

  const value = useMemo<HelperThemeValue>(
    () => ({ themeId, setThemeId, color }),
    [themeId, setThemeId, color],
  );

  return <HelperThemeContext.Provider value={value}>{children}</HelperThemeContext.Provider>;
}

/**
 * Merged `theme.color` for the helper portal. Use under `HelperThemeProvider` in `app/(helper)/_layout`.
 */
export function useHelperTheme(): HelperThemeValue {
  const v = useContext(HelperThemeContext);
  if (v) return v;
  return {
    themeId: 'default',
    setThemeId: async () => {},
    color: theme.color,
  };
}
