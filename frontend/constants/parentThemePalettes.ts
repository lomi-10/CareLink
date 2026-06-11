import type { ThemeColor } from '@/constants/theme';
import { theme } from '@/constants/theme';

/**
 * Immutable default palette — do not depend on any runtime `theme.color` mutation.
 * Overrides the brand "parent" accent from the original blue to a warm caramel/brown
 * identity (family-focused, distinct from the helper portal's orange). This is the
 * brand accent — it stays consistent across every appearance preset below (the
 * "cocoa night" dark preset overrides it again locally for contrast on its dark canvas).
 */
const PARENT_THEME_COLOR_BASE: ThemeColor = {
  ...theme.color,
  parent: '#8B5A2B',
  parentSoft: '#F3E3CF',
} as unknown as ThemeColor;

export const PARENT_PORTAL_APPEARANCE_KEY = 'parent_portal_appearance_v1' as const;

export type ParentThemeId = 'default' | 'warm' | 'sage' | 'dusk' | 'cocoa';

export const PARENT_THEME_OPTIONS: { id: ParentThemeId; label: string; hint: string }[] = [
  { id: 'default', label: 'Caramel cream (default)', hint: 'Warm cream and caramel — the new CareLink parent look' },
  { id: 'warm', label: 'Warm paper', hint: 'Cream and warm neutrals, less cold white' },
  { id: 'sage', label: 'Sage mist', hint: 'Calm green-gray, easy on the eyes' },
  { id: 'dusk', label: 'Cloud gray', hint: 'Cool gray canvas with soft cards' },
  {
    id: 'cocoa',
    label: 'Cocoa night',
    hint: 'Warm dark brown with soft blue accents — easy on the eyes at night',
  },
];

type Palette = Partial<Record<keyof ThemeColor, string>>;

const PALETTES: Record<ParentThemeId, Palette> = {
  /** New family-focused warm look: cream canvas, caramel-tinted cards. */
  default: {
    canvasParent: '#FFF9F2',
    surface: '#FFF4E6',
    surfaceElevated: '#FFFDF8',
    modalTintParent: '#FDF7EE',
    // Warm brown-toned text & dividers — cool slate grays from the base theme
    // read as washed-out/pale against this cream canvas, so shift them warm
    // (mirrors how the helper portal uses brown-tinted text on its cream pages).
    ink: '#3B2A18',
    inkMuted: '#6B5640',
    muted: '#8A7257',
    subtle: '#B8A186',
    line: '#EDE0D0',
    lineStrong: '#E0CFB8',
  },
  warm: {
    canvasParent: '#F4EFE6',
    surface: '#FAF6EF',
    surfaceElevated: '#FFFBF5',
    line: '#E6DDD0',
    lineStrong: '#D1C4B3',
    parentSoft: '#F0E8DC',
    infoSoft: '#E2EDF4',
    modalTintParent: '#FFFAF3',
  },
  sage: {
    canvasParent: '#EBF1ED',
    surface: '#F1F5F2',
    surfaceElevated: '#FCFEFD',
    line: '#D5E0D9',
    lineStrong: '#B8C9BE',
    parentSoft: '#E2EEE7',
    infoSoft: '#DBE8E3',
    modalTintParent: '#F5FAF7',
  },
  dusk: {
    canvasParent: '#E4E7EC',
    surface: '#ECEFF4',
    surfaceElevated: '#F4F6FA',
    line: '#CDD3DC',
    lineStrong: '#B4BCC8',
    parentSoft: '#DDE4F2',
    infoSoft: '#D4E0F0',
    ink: '#0C1220',
    inkMuted: '#3D4A5C',
    muted: '#5C6675',
    modalTintParent: '#EEF2F8',
  },
  /** Dark warm brown — use light text, muted borders, and a brighter “parent” blue for contrast. */
  cocoa: {
    canvasParent: '#16100C',
    surface: '#1E1712',
    surfaceElevated: '#2A2019',
    ink: '#F3EBE3',
    inkMuted: '#C9BDB2',
    muted: '#9E9186',
    subtle: '#7D7369',
    line: '#3D332B',
    lineStrong: '#4F443A',
    parent: '#7EB0FF',
    parentSoft: '#1E2A3A',
    helper: '#34D399',
    helperSoft: '#132820',
    peso: '#FDBA74',
    pesoSoft: '#2A1E14',
    success: '#4ADE80',
    successSoft: '#152A1C',
    warning: '#FBBF24',
    warningSoft: '#2B2315',
    danger: '#F87171',
    dangerSoft: '#2C1818',
    info: '#7DD3FC',
    infoSoft: '#1A2433',
    overlay: 'rgba(8, 5, 3, 0.72)',
    modalTintParent: '#130E0A',
    canvasPeso: '#1A120D',
  },
};

export function mergeParentThemeColors(id: ParentThemeId): ThemeColor {
  return { ...PARENT_THEME_COLOR_BASE, ...PALETTES[id] } as ThemeColor;
}

export function isParentThemeId(s: string | null | undefined): s is ParentThemeId {
  return s === 'default' || s === 'warm' || s === 'sage' || s === 'dusk' || s === 'cocoa';
}
