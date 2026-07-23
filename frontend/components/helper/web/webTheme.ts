// components/helper/web/webTheme.ts
// Light-mode palette for the CareLink helper WEB (desktop) screens.
//
// Now derived from constants/designSystem.ts rather than declaring its own
// colours, so the helper app shares one set of status colours, spacing, radii and
// shadows with parent and the staff portals. Only the BRAND accent (orange) and
// the canvas tint are specific to this role.
//
// The exported `wt` object keeps exactly the same key names it always had, so no
// existing helper screen needed to change.

import { createRoleTheme, space, radius, font, fontSize, shadow } from '@/constants/designSystem';

export const wt = createRoleTheme({
  accent: '#E8641A',      // helper orange
  accent2: '#F2871F',
  accentSoft: '#FCEBD9',
  overrides: {
    canvas: '#FBF6EE',
    ink: '#2B1608',
    muted: '#7C6047',
    subtle: '#A8927A',
    line: '#EFE4D5',
    lineSoft: '#F5EDE1',
    raise: '#FFFDFA',
    featInk: '#FBEFE4',
  },
});

export const FEATURE_GRADIENT = [wt.feat1, wt.feat2] as const;
export const ACCENT_GRADIENT = [wt.accent2, wt.accent] as const;

// Re-exported so helper web components can pull layout tokens from the same place.
export { space, radius, font, fontSize, shadow };
