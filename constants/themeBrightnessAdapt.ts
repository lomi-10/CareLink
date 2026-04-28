import type { ThemeColor } from '@/constants/theme';

function hexRgb(hex: string): { r: number; g: number; b: number } | null {
  const norm = hex.replace('#', '').trim();
  if (norm.length === 6 && /^[0-9a-fA-F]+$/.test(norm)) {
    return {
      r: parseInt(norm.slice(0, 2), 16),
      g: parseInt(norm.slice(2, 4), 16),
      b: parseInt(norm.slice(4, 6), 16),
    };
  }
  return null;
}

/** Relative luminance 0–1 (sRGB). */
export function luminance(hex: string): number {
  const rgb = hexRgb(hex);
  if (!rgb) return 0.5;
  const lin = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function isNaturallyDark(canvas: string): boolean {
  return luminance(canvas) < 0.38;
}

/**
 * Applies a cohesive dark palette on top of the chosen portal colors (accent hues preserved).
 * If the palette is already dark (e.g. Cocoa), only tweaks overlays and borders slightly.
 */
export function adaptPortalColorsForBrightness(
  base: ThemeColor,
  appearance: 'light' | 'dark',
): ThemeColor {
  if (appearance === 'light') {
    return { ...base };
  }

  /** Palettes like Cocoa are already dark — only soften overlays. */
  if (isNaturallyDark(base.canvasHelper) || isNaturallyDark(base.canvasParent)) {
    return {
      ...base,
      overlay: 'rgba(0, 0, 0, 0.55)',
    } as unknown as ThemeColor;
  }

  return {
    ...base,
    canvasHelper: '#0b1320',
    canvasParent: '#0b1320',
    canvasPeso: '#0f172a',
    canvasAdmin: '#0f172a',
    surface: '#151d2e',
    surfaceElevated: '#1a2740',
    ink: '#f1f5f9',
    inkMuted: '#cbd5f5',
    muted: '#94a3b8',
    subtle: '#64748b',
    line: '#334155',
    lineStrong: '#475569',

    parent: '#93c5fd',
    parentSoft: '#1e3a5f',
    helper: '#6ee7b7',
    helperSoft: '#14533d',
    peso: '#fdba74',
    pesoSoft: '#431407',
    success: '#4ade80',
    successSoft: '#14532d',
    warning: '#fbbf24',
    warningSoft: '#451a03',
    danger: '#f87171',
    dangerSoft: '#450a0a',
    info: '#7dd3fc',
    infoSoft: '#164e63',

    overlay: 'rgba(0, 0, 0, 0.55)',
    modalTintParent: '#0f172a',
    modalTintHelper: '#0f172a',
    modalTintPeso: '#0f172a',
  } as unknown as ThemeColor;
}
