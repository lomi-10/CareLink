// components/helper/home/helperWarmTheme.ts
// Shared warm "helper portal" palette — used across helper screens & shared nav
// chrome (Sidebar, MobileMenu, StatCard, SectionHeader, MobileHeader, tab bar…)
// so the whole helper side reads as one consistent warm-brown/orange theme.
//
// LIGHT values below are the long-standing defaults (kept byte-for-byte). For
// dark ("cocoa night") mode, screens should call `useHelperWarm()` /
// `makeHelperWarm(color)` — it returns the same token names, swapped to a warm
// dark-brown set when the active canvas is dark. Light mode is unchanged.

import { luminance } from '@/constants/themeBrightnessAdapt';
import type { ThemeColor } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';

export const DARK      = '#2A1608';
export const MUTED     = '#7A5C3E';
export const SUBTLE    = '#B0A090';
export const ORANGE    = '#E86019';
export const GREEN     = '#059669';
export const BLUE      = '#2563EB';
export const DIVIDER   = '#EDE0D0';
export const ICON_BG   = '#F5E6CC';
export const PAGE_BG   = '#FBF5EC';
export const SURFACE   = '#FFFFFF';
export const SUCCESS_BG = '#ECFDF5';
export const WARNING_BG = '#FEF3C7';
export const DANGER     = '#DC2626';
export const DANGER_BG  = '#FEE2E2';
export const INFO       = '#2563EB';
export const INFO_BG    = '#EFF6FF';
export const OVERLAY    = 'rgba(42, 22, 8, 0.5)';

export const ACCENT     = ORANGE;
export const ACCENT_SOFT = ICON_BG;

export type HelperWarm = {
  DARK: string; MUTED: string; SUBTLE: string; ORANGE: string;
  GREEN: string; BLUE: string; DIVIDER: string; ICON_BG: string;
  PAGE_BG: string; SURFACE: string; SURFACE_ELEVATED: string;
  SUCCESS_BG: string; WARNING_BG: string; DANGER: string; DANGER_BG: string;
  INFO: string; INFO_BG: string; OVERLAY: string;
  ACCENT: string; ACCENT_SOFT: string;
};

/** The current light palette, as a HelperWarm object (identical to the consts above). */
const LIGHT: HelperWarm = {
  DARK, MUTED, SUBTLE, ORANGE, GREEN, BLUE, DIVIDER, ICON_BG,
  PAGE_BG, SURFACE, SURFACE_ELEVATED: '#FFFFFF',
  SUCCESS_BG, WARNING_BG, DANGER, DANGER_BG, INFO, INFO_BG, OVERLAY,
  ACCENT, ACCENT_SOFT,
};

/** Warm dark-brown ("cocoa night") counterpart — accents brightened for contrast. */
const DARK_BROWN: HelperWarm = {
  DARK: '#F3EBE3', MUTED: '#B7A899', SUBTLE: '#8A7D70', ORANGE: '#F2793A',
  GREEN: '#34D399', BLUE: '#7EB0FF', DIVIDER: '#3A302A', ICON_BG: '#2E2117',
  PAGE_BG: '#16100C', SURFACE: '#1E1712', SURFACE_ELEVATED: '#2A2019',
  SUCCESS_BG: '#16281C', WARNING_BG: '#2B2315', DANGER: '#F87171', DANGER_BG: '#2C1818',
  INFO: '#7EB0FF', INFO_BG: '#1A2433', OVERLAY: 'rgba(0, 0, 0, 0.6)',
  ACCENT: '#F2793A', ACCENT_SOFT: '#2E2117',
};

/**
 * Resolve the warm helper palette for a given runtime `theme.color`. Returns the
 * unchanged light set for light canvases and the dark-brown set for dark ones,
 * so callers get the same token names either way.
 */
export function makeHelperWarm(c?: Pick<ThemeColor, 'canvasHelper'> | null): HelperWarm {
  const canvas = c?.canvasHelper;
  if (canvas && luminance(canvas) < 0.38) return DARK_BROWN;
  return LIGHT;
}

/** Hook form — reads the active helper theme. Use inside components/style factories. */
export function useHelperWarm(): HelperWarm {
  const { color } = useHelperTheme();
  return makeHelperWarm(color);
}
