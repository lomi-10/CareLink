// components/parent/web/parentWebTheme.ts
// Light-mode palette for the CareLink PARENT web (desktop) screens.
//
// Now derived from constants/designSystem.ts rather than declaring its own
// colours, so parent shares one set of status colours, spacing, radii and shadows
// with helper and the staff portals. Only the BRAND accent (gold), the secondary
// caramel accent and the warmer canvas tint are specific to this role.
//
// The exported `pt` object keeps exactly the same key names it always had, so no
// existing parent screen needed to change.

import { createRoleTheme, space, radius, font, fontSize, shadow } from '@/constants/designSystem';

const base = createRoleTheme({
  accent: '#D9A441',      // parent gold — the single "this matters" accent
  accent2: '#E4B657',
  accentSoft: '#FBEFD3',
  overrides: {
    canvas: '#FFF9F2',
    ink: '#3B2A18',       // deep brown text — never pure black
    muted: '#7E6347',
    subtle: '#A68F73',
    line: '#EFE0CB',
    lineSoft: '#F6ECDD',
    raise: '#FCF8F1',
    feat1: '#8B5A2B',     // parent's feature gradient is a warmer brown
    feat2: '#3B2A18',
    featInk: '#FBF1E4',
  },
});

export const pt = {
  ...base,
  // Secondary accent — caramel (pipeline steps, secondary buttons).
  caramel: '#C88B4A',
  caramelSoft: '#F3E3CF',
} as const;

export const FEATURE_GRADIENT = [pt.feat1, pt.feat2] as const;
export const ACCENT_GRADIENT = [pt.accent2, pt.accent] as const;
// Warm caramel → deep-brown hero gradient (the one "name card" focal element).
export const CARAMEL_GRADIENT = ['#C88B4A', '#7A4E22'] as const;

// Re-exported so parent web components can pull layout tokens from the same place.
export { space, radius, font, fontSize, shadow };
