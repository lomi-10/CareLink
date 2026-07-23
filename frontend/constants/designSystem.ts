// constants/designSystem.ts — the one design foundation every role derives from.
//
// WHY THIS EXISTS: helper and parent each had their own theme file, PESO and admin
// had NO theme at all (every colour hand-typed per component — 18 distinct hexes
// across the PESO folder alone). The result was four visual dialects of the same
// product: different greens for "verified", different card radii, different
// shadows, different spacing rhythms.
//
// The split is deliberate:
//   • SYSTEMATIC tokens (spacing, radius, type, shadow, status colour) are SHARED.
//     There is exactly one "verified green" and one card radius in the product.
//   • BRAND tokens (canvas tint, ink, accent) stay per-role, because the roles are
//     meant to feel distinct — helper orange, parent gold, staff green.
//
// Role themes are built with createRoleTheme() so they all expose the SAME token
// names. Any component can then be moved between roles by swapping one import.

import { Platform } from 'react-native';
import { FontFamily } from './GlobalStyles';

// ── Spacing ───────────────────────────────────────────────────────────────────
// A 4pt rhythm. Use these instead of arbitrary numbers so vertical spacing lines
// up across screens built by different passes.
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ── Corner radius ─────────────────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

// ── Typography ────────────────────────────────────────────────────────────────
// NOTE: the app ships Fredoka Light/Regular/SemiBold/One only — there is no
// Medium face. Asking for one silently falls back and looks off, so "medium"
// intentionally maps to Regular.
export const font = {
  regular: FontFamily.fredokaRegular,
  medium: FontFamily.fredokaRegular,
  semibold: FontFamily.fredokaSemiBold,
  display: FontFamily.fredokaOne,
} as const;

export const fontSize = {
  caption: 11,
  small: 12.5,
  body: 14,
  bodyLg: 15,
  subtitle: 17,
  title: 20,
  h2: 24,
  h1: 30,
} as const;

/** Comfortable reading line-height for a given font size. */
export const lineHeight = (size: number) => Math.round(size * 1.45);

// ── Elevation ─────────────────────────────────────────────────────────────────
// RN and web disagree about shadows; these emit whichever the platform honours so
// cards look the same depth in the Expo app and the browser.
const elevation = (y: number, blur: number, alpha: number, native: number) =>
  Platform.OS === 'web'
    ? ({ boxShadow: `0 ${y}px ${blur}px rgba(74, 44, 20, ${alpha})` } as any)
    : ({
        shadowColor: '#4A2C14',
        shadowOffset: { width: 0, height: y },
        shadowOpacity: alpha,
        shadowRadius: blur / 2,
        elevation: native,
      } as any);

export const shadow = {
  none: {},
  sm: elevation(1, 3, 0.06, 1),
  md: elevation(4, 12, 0.08, 3),
  lg: elevation(10, 24, 0.12, 6),
  /** For the accent-coloured primary buttons on hover/press. */
  accent: (hex: string) =>
    Platform.OS === 'web'
      ? ({ boxShadow: `0 6px 16px ${hex}59` } as any)
      : ({ shadowColor: hex, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 } as any),
} as const;

// ── Status colours (SHARED — never redefine per role) ─────────────────────────
// One green means "verified/approved" everywhere, one amber means "pending", etc.
// Helper used #16A34A for green while parent used #059669; both are now this one.
export const status = {
  green: '#059669',
  greenSoft: '#ECFDF5',
  amber: '#C97A0E',
  amberSoft: '#FBEFD3',
  blue: '#2563EB',
  blueSoft: '#E9F0FD',
  red: '#DC2626',
  redSoft: '#FCE8E8',
  purple: '#7C5CD6',
  purpleSoft: '#EEE9FB',
} as const;

// ── Neutral surfaces (warm CareLink base) ─────────────────────────────────────
// Roles may tint `canvas` / `ink`, but the relationships (surface above canvas,
// line lighter than ink) stay the same.
export const neutral = {
  canvas: '#FBF6EE',
  surface: '#FFFFFF',
  raise: '#FFFDFA',
  ink: '#2B1608',
  muted: '#7C6047',
  subtle: '#A8927A',
  line: '#EFE4D5',
  lineSoft: '#F5EDE1',
} as const;

/** The warm brown gradient used for "feature"/hero cards across the product. */
export const featureBrown = {
  feat1: '#5A3018',
  feat2: '#2A1409',
  featInk: '#FBEFE4',
  featMut: '#D9BFA6',
} as const;

// ── Role theme factory ────────────────────────────────────────────────────────
/** Every token name a role theme exposes. */
export type ThemeToken =
  | keyof typeof neutral
  | keyof typeof status
  | keyof typeof featureBrown
  | 'accent'
  | 'accent2'
  | 'accentSoft';

/** A complete role theme. Values are plain strings so roles can tint freely. */
export type RoleTheme = Record<ThemeToken, string>;

export interface RoleBrand {
  /** Primary accent — the "this matters" colour for the role. */
  accent: string;
  /** Lighter accent for gradients. */
  accent2: string;
  /** Very light accent wash for chips/badges. */
  accentSoft: string;
  /** Optional per-role tints of the neutral / feature base (canvas, ink, …). */
  overrides?: Partial<Record<keyof typeof neutral | keyof typeof featureBrown, string>>;
}

/**
 * Builds a full role theme with a consistent token shape. Every role theme
 * exposes the same keys, so a component written against one works against all.
 */
export function createRoleTheme(brand: RoleBrand): RoleTheme {
  return {
    ...neutral,
    ...status,
    ...featureBrown,
    accent: brand.accent,
    accent2: brand.accent2,
    accentSoft: brand.accentSoft,
    ...(brand.overrides ?? {}),
  };
}
