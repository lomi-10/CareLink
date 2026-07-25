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

// Accent is CareLink ORANGE — it's the brand colour and pairs far better with the
// warm brown ground than green did. Green is kept ONLY for the "verified/success"
// status, so the two never fight (orange = brand/interactive, green = verified).
const LIGHT: PesoColors = {
  canvas: '#FBF6EE', surface: '#FFFFFF', raise: '#FFFCF7', sunken: '#F4ECDF',
  ink: '#2B1608', muted: '#7C6047', subtle: '#A8927A',
  line: '#EFE2D0', lineStrong: '#E4D3BB',
  accent: '#E8641A', accent2: '#F2871F', accentSoft: '#FCEAD9', accentInk: '#B44810', onAccent: '#FFFFFF',
  ok: '#0E9F6E', okSoft: '#E7F6EE',
  warn: '#C97A0E', warnSoft: '#FBEFD3',
  bad: '#DC2626', badSoft: '#FBE9E9',
  info: '#2563EB', infoSoft: '#E9F0FD',
  accentGrad: ['#F2871F', '#E05B12'] as const,
  heroGrad: ['#FDEFE0', '#FBF6EE'] as const,
  blob: 'rgba(232,100,26,0.10)',
  overlay: 'rgba(42,20,9,0.45)',
};

const DARK: PesoColors = {
  // Warm layered browns (not a single flat brown) + a glowing orange accent.
  canvas: '#20100A', surface: '#2E1810', raise: '#3A2015', sunken: '#180B06',
  ink: '#FBEEE3', muted: '#D8BFA9', subtle: '#A88B72',
  line: 'rgba(255,224,200,0.13)', lineStrong: 'rgba(255,224,200,0.22)',
  accent: '#FF8A3D', accent2: '#FFA35C', accentSoft: 'rgba(255,138,61,0.17)', accentInk: '#FFC08A', onAccent: '#2A1206',
  ok: '#34C88A', okSoft: 'rgba(52,200,138,0.16)',
  warn: '#E8A33D', warnSoft: 'rgba(232,163,61,0.16)',
  bad: '#F2635C', badSoft: 'rgba(242,99,92,0.16)',
  info: '#5B9BF5', infoSoft: 'rgba(91,155,245,0.16)',
  accentGrad: ['#FF9A4D', '#E86A1E'] as const,
  heroGrad: ['#3A2013', '#20100A'] as const,
  blob: 'rgba(255,138,61,0.16)',
  overlay: 'rgba(0,0,0,0.62)',
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
