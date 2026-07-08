// app/(helper)/profile/profile.theme.ts
// Shared colors for all helper profile screens. Static values below are the
// light defaults; use makeProfileTheme()/useProfileTheme() for a dark-aware
// palette (unchanged in light, warm dark-brown in dark).

import { makeHelperWarm, type HelperWarm } from '@/components/helper/home/helperWarmTheme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import type { ThemeColor } from '@/constants/theme';

export const PAGE_BG  = '#FBF5EC';  // warm cream page background
export const BAR_BG   = '#FFFBF5';  // top nav bar background
export const DARK     = '#2A1608';  // dark brown — primary text
export const MUTED    = '#7A5C3E';  // muted brown — secondary text
export const ORANGE   = '#E86019';  // brand orange — accent, CTA
export const GREEN    = '#059669';  // success green — verified, complete
export const CARD_BG  = '#FFFFFF';  // white card background
export const DIVIDER  = '#EDE0D0';  // warm hairline divider
export const ICON_BG  = '#F5E6CC';  // default icon circle background
// The hero gradient is a warm dark brown — it already reads well on both themes.
export const HERO_GRADIENT = ['#6B2E0A', '#3B1508', '#1E0A04'] as const;

export type ProfileTheme = {
  PAGE_BG: string; BAR_BG: string; DARK: string; MUTED: string; ORANGE: string;
  GREEN: string; CARD_BG: string; DIVIDER: string; ICON_BG: string;
};

export function makeProfileTheme(color?: Pick<ThemeColor, 'canvasHelper'> | null): ProfileTheme {
  const w: HelperWarm = makeHelperWarm(color);
  return {
    PAGE_BG: w.PAGE_BG, BAR_BG: w.SURFACE, DARK: w.DARK, MUTED: w.MUTED, ORANGE: w.ORANGE,
    GREEN: w.GREEN, CARD_BG: w.SURFACE_ELEVATED, DIVIDER: w.DIVIDER, ICON_BG: w.ICON_BG,
  };
}

/** Hook form — reads the active helper theme. */
export function useProfileTheme(): ProfileTheme {
  return makeProfileTheme(useHelperTheme().color);
}
