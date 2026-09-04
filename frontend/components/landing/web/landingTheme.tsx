// components/landing/web/landingTheme.tsx
//
// Light and dark palettes for the landing page, plus the context that switches
// them.
//
// WHY A SECOND PALETTE RATHER THAN AN INVERSION
//
// Inverting a dark theme gives you grey text on grey cards. CareLink's identity
// is warm — Fredoka, orange, brown — so the light mode is built from the same
// warmth rather than from white: a cream ground the app itself already uses,
// with the accent unchanged so the brand reads identically in both. The accent
// is the one value that must NOT move between modes; everything else may.
//
// Both palettes carry the same keys, so a component reads c.text and never
// asks which mode it is in.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LandingMode = 'dark' | 'light';

export interface LandingPalette {
  mode: LandingMode;
  /** Page ground. */
  bg: string;
  /** Raised surfaces sitting on the ground. */
  bg2: string;
  /** Cards. */
  card: string;
  cardBorder: string;
  /** Glass over the hero image, and the nav once it is stuck. */
  glass: string;
  glassBorder: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  /** Brand accent — deliberately identical in both modes. */
  accent: string;
  accentSoft: string;
  gold: string;
  /** Tint for the animated backdrop's drifting glows. */
  glowA: string;
  glowB: string;
  /** Inverted button: a surface that contrasts with the page in BOTH modes.
   *  Cream-on-dark becomes dark-on-cream, so a secondary button never
   *  disappears into the background it is sitting on. */
  invBg: string;
  invText: string;
  brownGradient: readonly [string, string];
  ctaGradient: readonly [string, string];
  /** Overlay laid over the hero photograph so text stays legible. */
  heroOverlay: readonly [string, string, string];
}

const ACCENT = '#EA6F2A';
const GOLD = '#F6C453';

export const DARK_PALETTE: LandingPalette = {
  mode: 'dark',
  bg: '#140B04',
  bg2: '#1B0F06',
  card: 'rgba(255,255,255,0.05)',
  cardBorder: 'rgba(255,255,255,0.10)',
  glass: 'rgba(20,11,4,0.72)',
  glassBorder: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.66)',
  textSubtle: 'rgba(255,255,255,0.42)',
  accent: ACCENT,
  accentSoft: 'rgba(234,111,42,0.16)',
  gold: GOLD,
  glowA: 'rgba(234,111,42,0.20)',
  glowB: 'rgba(246,196,83,0.12)',
  invBg: '#FBEEDD',
  invText: '#3C250D',
  brownGradient: ['#3C250D', '#1B0F06'],
  ctaGradient: ['#5A3D1F', '#241406'],
  heroOverlay: ['rgba(15,9,4,0.93)', 'rgba(15,9,4,0.55)', 'rgba(15,9,4,0.08)'],
};

export const LIGHT_PALETTE: LandingPalette = {
  mode: 'light',
  // The cream the rest of CareLink already uses, so the landing page and the
  // app do not look like two different products.
  bg: '#FBF5EC',
  bg2: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#EFE2D0',
  glass: 'rgba(251,245,236,0.82)',
  glassBorder: '#EFE2D0',
  text: '#2A1608',
  textMuted: 'rgba(42,22,8,0.68)',
  textSubtle: 'rgba(42,22,8,0.45)',
  accent: ACCENT,
  accentSoft: 'rgba(234,111,42,0.12)',
  gold: '#B8860B',
  glowA: 'rgba(234,111,42,0.14)',
  glowB: 'rgba(246,196,83,0.16)',
  // Lighter overlay: the same photograph needs far less darkening to hold
  // brown text than it does to hold white.
  invBg: '#2A1608',
  invText: '#FBF5EC',
  brownGradient: ['#FFFFFF', '#FBF5EC'],
  ctaGradient: ['#FFF6E9', '#FBEEDD'],
  heroOverlay: ['rgba(251,245,236,0.94)', 'rgba(251,245,236,0.60)', 'rgba(251,245,236,0.10)'],
};

const STORAGE_KEY = 'carelink.landing.mode';

interface Ctx {
  c: LandingPalette;
  mode: LandingMode;
  toggle: () => void;
}

const LandingThemeContext = createContext<Ctx>({
  c: DARK_PALETTE,
  mode: 'dark',
  toggle: () => {},
});

export function LandingThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<LandingMode>('dark');

  // Restore the visitor's choice. Failing silently is right here: a landing
  // page that cannot read storage should still render, in the default mode.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') setMode(saved);
      } catch {}
    })();
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ c: mode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE, mode, toggle }),
    [mode, toggle],
  );

  return <LandingThemeContext.Provider value={value}>{children}</LandingThemeContext.Provider>;
}

export function useLandingTheme() {
  return useContext(LandingThemeContext);
}

// ─── Layout ──────────────────────────────────────────────────────────────────
export const CONTAINER_MAX = 1180;

/** Sections the nav tracks. Order matters: scroll position is matched against it. */
export const SECTIONS = [
  { key: 'offer', label: 'What We Offer' },
  { key: 'management', label: 'Work Mode' },
  { key: 'trust', label: 'Trust & Safety' },
  { key: 'team', label: 'Team' },
] as const;

export type SectionKey = (typeof SECTIONS)[number]['key'];
