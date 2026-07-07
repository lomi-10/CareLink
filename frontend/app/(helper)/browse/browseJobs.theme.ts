// app/(helper)/browse/browseJobs.theme.ts
// Color constants for the helper browse-jobs screen. Static values below are the
// light defaults; use makeBrowseTheme()/useBrowseTheme() for a dark-aware palette
// (unchanged in light, warm dark-brown in dark).

import { makeHelperWarm, type HelperWarm } from '@/components/helper/home/helperWarmTheme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import type { ThemeColor } from '@/constants/theme';

export const PAGE_BG = '#FBF5EC';   // warm cream page canvas
export const BAR_BG  = '#FFFBF5';   // top-bar / search-strip background
export const DARK    = '#2A1608';   // primary text — dark brown
export const MUTED   = '#7A5C3E';   // secondary text — muted brown
export const SUBTLE  = '#B0A090';   // placeholder / disabled text
export const ORANGE  = '#E86019';   // brand accent — CTA, sort, filters
export const GREEN   = '#059669';   // PESO verified / success
export const CARD_BG = '#FFFFFF';   // card surface
export const DIVIDER = '#EDE0D0';   // warm hairline dividers
export const ICON_BG = '#F5E6CC';   // default icon-circle background
export const TAG_BORDER = '#D4B896'; // outlined tag border

export type BrowseTheme = {
  PAGE_BG: string; BAR_BG: string; DARK: string; MUTED: string; SUBTLE: string;
  ORANGE: string; GREEN: string; CARD_BG: string; DIVIDER: string; ICON_BG: string;
  TAG_BORDER: string;
};

export function makeBrowseTheme(color?: Pick<ThemeColor, 'canvasHelper'> | null): BrowseTheme {
  const w: HelperWarm = makeHelperWarm(color);
  return {
    PAGE_BG: w.PAGE_BG, BAR_BG: w.SURFACE, DARK: w.DARK, MUTED: w.MUTED, SUBTLE: w.SUBTLE,
    ORANGE: w.ORANGE, GREEN: w.GREEN, CARD_BG: w.SURFACE_ELEVATED, DIVIDER: w.DIVIDER,
    ICON_BG: w.ICON_BG, TAG_BORDER: w.DIVIDER,
  };
}

/** Hook form — reads the active helper theme. */
export function useBrowseTheme(): BrowseTheme {
  return makeBrowseTheme(useHelperTheme().color);
}
