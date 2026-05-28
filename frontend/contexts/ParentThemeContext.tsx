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
  isParentThemeId,
  mergeParentThemeColors,
  PARENT_PORTAL_APPEARANCE_KEY,
  type ParentThemeId,
} from '@/constants/parentThemePalettes';
import { adaptPortalColorsForBrightness } from '@/constants/themeBrightnessAdapt';
import { useColorSchemePreference } from '@/contexts/ColorSchemePreferenceContext';

type ParentThemeValue = {
  themeId: ParentThemeId;
  setThemeId: (id: ParentThemeId) => Promise<void>;
  color: ThemeColor;
};

const ParentThemeContext = createContext<ParentThemeValue | null>(null);

export function ParentThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedColorScheme } = useColorSchemePreference();
  const [themeId, setThemeIdState] = useState<ParentThemeId>('default');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PARENT_PORTAL_APPEARANCE_KEY);
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
      await AsyncStorage.setItem(PARENT_PORTAL_APPEARANCE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const color = useMemo(() => {
    const base = mergeParentThemeColors(themeId);
    return adaptPortalColorsForBrightness(base, resolvedColorScheme === 'dark' ? 'dark' : 'light');
  }, [resolvedColorScheme, themeId]);

  /** So existing screens using `import { theme }` pick up the chosen portal palette. */
  const applyToGlobalTheme = useCallback((merged: ThemeColor) => {
    const t = theme.color as unknown as Record<keyof ThemeColor, string>;
    (Object.keys(merged) as (keyof ThemeColor)[]).forEach((k) => {
      t[k] = merged[k] as string;
    });
  }, []);

  useLayoutEffect(() => {
    const base = mergeParentThemeColors(themeId);
    applyToGlobalTheme(
      adaptPortalColorsForBrightness(base, resolvedColorScheme === 'dark' ? 'dark' : 'light'),
    );
  }, [applyToGlobalTheme, resolvedColorScheme, themeId]);

  useLayoutEffect(
    () => () => {
      applyToGlobalTheme(mergeParentThemeColors('default'));
    },
    [applyToGlobalTheme],
  );

  const value = useMemo<ParentThemeValue>(
    () => ({ themeId, setThemeId, color }),
    [themeId, setThemeId, color],
  );

  return <ParentThemeContext.Provider value={value}>{children}</ParentThemeContext.Provider>;
}

/**
 * Merged `theme.color` for the parent portal (backgrounds, cards, lines).
 * Use only under `ParentThemeProvider` (app/(parent)/_layout). If missing, returns the global theme.
 */
export function useParentTheme(): ParentThemeValue {
  const v = useContext(ParentThemeContext);
  if (v) return v;
  return {
    themeId: 'default',
    setThemeId: async () => {},
    color: theme.color,
  };
}
