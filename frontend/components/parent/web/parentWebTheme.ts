// components/parent/web/parentWebTheme.ts
// Light-mode palette for the CareLink PARENT web (desktop) redesign. Single
// accent = GOLD (does all the "this matters" work); caramel is the secondary
// accent (pipeline steps / secondary buttons). Feature cards use the warm
// brown → deep-brown gradient. Mirrors the helper `wt` token shape so both web
// suites share the same component patterns.

export const pt = {
  canvas: '#FFF9F2',
  surface: '#FFFFFF',
  raise: '#FCF8F1',
  ink: '#3B2A18',      // deep brown text — never pure black
  muted: '#7E6347',
  subtle: '#A68F73',
  line: '#EFE0CB',
  lineSoft: '#F6ECDD',
  // single primary accent — gold
  accent: '#D9A441',
  accent2: '#E4B657',
  accentSoft: '#FBEFD3',
  // secondary accent — caramel (pipeline, secondary buttons)
  caramel: '#C88B4A',
  caramelSoft: '#F3E3CF',
  // status only — never used for decoration
  green: '#059669',
  greenSoft: '#ECFDF5',
  amber: '#C97A0E',
  amberSoft: '#FBEFD3',
  blue: '#2563EB',
  blueSoft: '#E9F0FD',
  red: '#DC2626',
  redSoft: '#FCE8E8',
  // brown → deep-brown feature gradient + its text
  feat1: '#8B5A2B',
  feat2: '#3B2A18',
  featInk: '#FBF1E4',
  featMut: '#D9BFA6',
} as const;

export const FEATURE_GRADIENT = [pt.feat1, pt.feat2] as const;
export const ACCENT_GRADIENT = [pt.accent2, pt.accent] as const;
// Warm caramel → deep-brown hero gradient (the one "name card" focal element).
export const CARAMEL_GRADIENT = ['#C88B4A', '#7A4E22'] as const;
