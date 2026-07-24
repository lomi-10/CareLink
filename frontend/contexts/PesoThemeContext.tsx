// contexts/PesoThemeContext.tsx
// The design foundation for the PESO staff portal: one warm palette in a light and
// a dark variant, plus the spacing / radius / shadow / gradient tokens every shared
// primitive reads from. Screens and components call usePesoTheme() so the whole
// portal recolours together and light/dark stays consistent.
//
// Mirrors the token SHAPE of the app's other themes, but adds gradients and an
// elevation helper so the UI can be animated and layered rather than flat.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type PesoThemeName = 'light' | 'dark';

export interface PesoColors {
  canvas: string; surface: string; raise: string; sunken: string;
  ink: string; muted: string; subtle: string;
  line: string; lineStrong: string;
  accent: string; accent2: string; accentSoft: string; accentInk: string; onAccent: string;
  ok: string; okSoft: string;
  warn: string; warnSoft: string;
  bad: string; badSoft: string;
  info: string; infoSoft: string;
  // gradients (2-stop)
  accentGrad: readonly [string, string];
  heroGrad: readonly [string, string];
  /** faint decorative blob colour for header backgrounds */
  blob: string;
  overlay: string;
}

const LIGHT: PesoColors = {
  canvas: '#FAF7F1', surface: '#FFFFFF', raise: '#FFFDFB', sunken: '#F3ECE1',
  ink: '#2B1608', muted: '#7C6047', subtle: '#A8927A',
  line: '#EFE4D5', lineStrong: '#E2D3BE',
  accent: '#0F7B54', accent2: '#149468', accentSoft: '#E6F4EF', accentInk: '#0B5C3F', onAccent: '#FFFFFF',
  ok: '#059669', okSoft: '#ECFDF5',
  warn: '#B87309', warnSoft: '#FAEFD6',
  bad: '#DC2626', badSoft: '#FBE9E9',
  info: '#2563EB', infoSoft: '#E9F0FD',
  accentGrad: ['#149468', '#0C6A49'] as const,
  heroGrad: ['#F1FAF6', '#FAF7F1'] as const,
  blob: 'rgba(15,123,84,0.10)',
  overlay: 'rgba(42,20,9,0.45)',
};

const DARK: PesoColors = {
  canvas: '#241206', surface: '#33190B', raise: '#3E1F0E', sunken: '#1C0E04',
  ink: '#FBEFE4', muted: '#D9BFA6', subtle: '#A8886A',
  line: 'rgba(255,236,220,0.12)', lineStrong: 'rgba(255,236,220,0.20)',
  accent: '#22A06B', accent2: '#2CB77C', accentSoft: 'rgba(34,160,107,0.18)', accentInk: '#8FE7C1', onAccent: '#08140E',
  ok: '#2FBF87', okSoft: 'rgba(47,191,135,0.15)',
  warn: '#E8A33D', warnSoft: 'rgba(232,163,61,0.15)',
  bad: '#F2635C', badSoft: 'rgba(242,99,92,0.15)',
  info: '#5B9BF5', infoSoft: 'rgba(91,155,245,0.15)',
  accentGrad: ['#2CB77C', '#158A5A'] as const,
  heroGrad: ['#341B0C', '#241206'] as const,
  blob: 'rgba(44,183,124,0.14)',
  overlay: 'rgba(0,0,0,0.6)',
};

// Systematic tokens — identical in both themes.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const font = {
  regular: 'Fredoka-Regular', medium: 'Fredoka-Regular',
  semibold: 'Fredoka-SemiBold', display: 'Fredoka-SemiBold',
} as const;

/** Cross-platform soft elevation, warm-tinted. */
export function shadow(level: 'sm' | 'md' | 'lg', dark: boolean) {
  const specs = { sm: [1, 3, 0.06, 1], md: [6, 18, 0.09, 3], lg: [16, 36, 0.14, 8] } as const;
  const [y, blur, alpha, elevation] = specs[level];
  const a = dark ? Math.min(alpha * 3.2, 0.5) : alpha;
  const rgb = dark ? '0,0,0' : '74,44,20';
  return Platform.OS === 'web'
    ? ({ boxShadow: `0 ${y}px ${blur}px rgba(${rgb},${a})` } as any)
    : ({ shadowColor: dark ? '#000' : '#4A2C14', shadowOffset: { width: 0, height: y }, shadowOpacity: a, shadowRadius: blur / 2, elevation } as any);
}

interface PesoThemeValue {
  name: PesoThemeName;
  dark: boolean;
  c: PesoColors;
  toggle: () => void;
  setTheme: (n: PesoThemeName) => void;
}

const Ctx = createContext<PesoThemeValue | null>(null);
const KEY = 'carelink_peso_theme';

export function PesoThemeProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<PesoThemeName>('light');
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => { if (v === 'light' || v === 'dark') setName(v); }); }, []);
  const setTheme = (n: PesoThemeName) => { setName(n); AsyncStorage.setItem(KEY, n).catch(() => {}); };
  const toggle = () => setTheme(name === 'light' ? 'dark' : 'light');
  const value = useMemo<PesoThemeValue>(() => ({ name, dark: name === 'dark', c: name === 'dark' ? DARK : LIGHT, toggle, setTheme }), [name]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePesoTheme(): PesoThemeValue {
  const v = useContext(Ctx);
  if (!v) return { name: 'light', dark: false, c: LIGHT, toggle: () => {}, setTheme: () => {} };
  return v;
}
