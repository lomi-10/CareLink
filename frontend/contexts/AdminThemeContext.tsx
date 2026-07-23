// contexts/AdminThemeContext.tsx
// The Super Admin portal is dark by design ("control room"). This context lets the
// admin switch that dark surface between two palettes — the original NAVY and
// CareLink's warm BROWN — and remembers the choice. Every admin screen reads its
// colours from here through useAdminTheme(), so the whole portal recolours at once
// and stays consistent (the old dashboard was navy while the data screens were a
// separate light iOS palette — this unifies them).
//
// Only the neutral SURFACE changes between palettes. The green brand accent and the
// (brightened-for-dark) status colours are shared, so "verified" is the same green
// whichever surface you pick.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AdminThemeName = 'navy' | 'brown';

type Surface = {
  bg: string; panel: string; panel2: string; border: string;
  text: string; muted: string; subtle: string; rowAlt: string;
};

// Neutral surfaces per palette (the only thing the toggle changes).
const SURFACES: Record<AdminThemeName, Surface> = {
  navy: {
    bg: '#0B1526',       // canvas
    panel: '#132038',    // raised card
    panel2: '#0F1A2E',   // sidebar / secondary
    border: 'rgba(255,255,255,0.08)',
    text: '#EAF0F8',
    muted: '#8595AD',
    subtle: '#5C6B85',
    rowAlt: 'rgba(255,255,255,0.03)',
  },
  brown: {
    bg: '#241206',
    panel: '#33190B',
    panel2: '#2A1409',
    border: 'rgba(255,236,220,0.10)',
    text: '#FBEFE4',
    muted: '#D9BFA6',
    subtle: '#A8886A',
    rowAlt: 'rgba(255,236,220,0.03)',
  },
};

// Shared across both palettes. Status hues are lifted for dark backgrounds.
const SHARED = {
  accent: '#22A06B',       // staff green — official/verified
  accentText: '#FFFFFF',
  accentSoft: 'rgba(34,160,107,0.16)',
  blue: '#5B9BF5',
  green: '#2FBF87',
  red: '#F2635C',
  amber: '#E8A33D',
  purple: '#A78BFA',
  redSoft: 'rgba(242,99,92,0.16)',
};

export type AdminPalette = Surface & typeof SHARED;

interface AdminThemeValue {
  name: AdminThemeName;
  palette: AdminPalette;
  /** Flip navy <-> brown (persisted). */
  toggle: () => void;
  setTheme: (n: AdminThemeName) => void;
}

const AdminThemeContext = createContext<AdminThemeValue | null>(null);
const STORAGE_KEY = 'carelink_admin_theme';

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to navy (the original look the admin knows); the header toggle flips
  // to CareLink brown. The choice is then remembered.
  const [name, setName] = useState<AdminThemeName>('navy');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'navy' || v === 'brown') setName(v);
    });
  }, []);

  const setTheme = (n: AdminThemeName) => {
    setName(n);
    AsyncStorage.setItem(STORAGE_KEY, n).catch(() => {});
  };
  const toggle = () => setTheme(name === 'navy' ? 'brown' : 'navy');

  const palette = useMemo<AdminPalette>(() => ({ ...SURFACES[name], ...SHARED }), [name]);

  const value = useMemo(() => ({ name, palette, toggle, setTheme }), [name, palette]);
  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
}

export function useAdminTheme(): AdminThemeValue {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    // Safe fallback so a screen rendered outside the provider never crashes.
    return {
      name: 'brown',
      palette: { ...SURFACES.brown, ...SHARED },
      toggle: () => {},
      setTheme: () => {},
    };
  }
  return ctx;
}
