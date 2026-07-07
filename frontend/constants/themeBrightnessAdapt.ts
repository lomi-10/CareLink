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

  // Warm dark-brown ("cocoa") canvas — CareLink's chosen night look. Any light
  // palette turns into this cohesive warm dark when brightness = dark, with the
  // brand accent hues preserved (just brightened for contrast on the dark canvas).
  return {
    ...base,
    canvasHelper: '#16100C',
    canvasParent: '#16100C',
    canvasPeso: '#1A120D',
    canvasAdmin: '#14100C',
    surface: '#1E1712',
    surfaceElevated: '#2A2019',
    ink: '#F3EBE3',
    inkMuted: '#C9BDB2',
    muted: '#9E9186',
    subtle: '#7D7369',
    line: '#3A302A',
    lineStrong: '#4F443A',

    parent: '#E0B080',
    parentSoft: '#2A1E14',
    helper: '#F2793A',
    helperSoft: '#2E2117',
    peso: '#FDBA74',
    pesoSoft: '#2A1E14',
    success: '#4ADE80',
    successSoft: '#16281C',
    warning: '#FBBF24',
    warningSoft: '#2B2315',
    danger: '#F87171',
    dangerSoft: '#2C1818',
    info: '#7DD3FC',
    infoSoft: '#1A2433',

    overlay: 'rgba(0, 0, 0, 0.6)',
    modalTintParent: '#130E0A',
    modalTintHelper: '#130E0A',
    modalTintPeso: '#130E0A',
  } as unknown as ThemeColor;
}
