// components/peso/staffTheme.ts — the design tokens for the PESO and Super Admin
// portals.
//
// These two portals previously had NO theme file: every colour was hand-typed in
// each component (18 distinct hexes in components/peso alone), which is why the
// staff side looked unfinished next to the helper and parent apps.
//
// Direction: the SAME warm CareLink brand as the rest of the product, with a deep
// GREEN accent that reads as "official / verified" — the colour PESO's approval
// already uses elsewhere. Staff screens should look unmistakably like CareLink,
// not like a separate admin tool bolted on.
//
// `st` mirrors the token shape of the helper (`wt`) and parent (`pt`) themes, so
// shared component patterns can be lifted between all three.

import { createRoleTheme, space, radius, font, fontSize, shadow } from '@/constants/designSystem';

export const st = createRoleTheme({
  accent: '#0F7B54',      // deep PESO green — official, trustworthy
  accent2: '#149468',     // lighter green for gradients
  accentSoft: '#E6F4EF',  // wash for chips/badges/selected rows
  overrides: {
    // A hair cooler than the consumer canvas so long queue/table screens stay easy
    // on the eyes, while staying firmly in the warm CareLink family.
    canvas: '#FAF7F1',
  },
});

/** Deep-green → dark gradient for staff hero/feature cards. */
export const STAFF_GRADIENT = ['#0F7B54', '#0A4A33'] as const;
/** Accent gradient for primary staff buttons. */
export const STAFF_ACCENT_GRADIENT = [st.accent2, st.accent] as const;

// Re-exported so staff components need a single import for everything.
export { space, radius, font, fontSize, shadow };
