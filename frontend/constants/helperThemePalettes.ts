import type { ThemeColor } from '@/constants/theme';
import type { ParentThemeId } from '@/constants/parentThemePalettes';
import { isParentThemeId, mergeParentThemeColors } from '@/constants/parentThemePalettes';

export const HELPER_PORTAL_APPEARANCE_KEY = 'helper_portal_appearance_v1' as const;

/**
 * Merged `theme.color` for the helper portal. Reuses parent palette definitions and aligns
 * `canvasHelper` with the selected canvas so portal themes look consistent.
 */
export function mergeHelperThemeColors(id: ParentThemeId): ThemeColor {
  const merged = mergeParentThemeColors(id);
  if (id === 'default') {
    return merged;
  }
  return { ...merged, canvasHelper: merged.canvasParent } as unknown as ThemeColor;
}

/** Baseline helper portal palette (used when resetting global `theme.color` on unmount). */
export const HELPER_THEME_DEFAULT_MERGED = mergeHelperThemeColors('default');

export { isParentThemeId };
export type { ParentThemeId };
