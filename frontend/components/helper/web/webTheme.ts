// components/helper/web/webTheme.ts
// Light-mode palette for the CareLink helper WEB (desktop) redesign. Feature
// cards (hero / profile progress / CareBot) use the warm dark-brown gradient in
// both modes. Dark mode for the web screens is a later pass — kept as one object
// so it's easy to tokenize then.

export const wt = {
  canvas: '#FBF6EE',
  surface: '#FFFFFF',
  raise: '#FFFDFA',
  ink: '#2B1608',
  muted: '#7C6047',
  subtle: '#A8927A',
  line: '#EFE4D5',
  lineSoft: '#F5EDE1',
  accent: '#E8641A',
  accent2: '#F2871F',
  accentSoft: '#FCEBD9',
  green: '#16A34A',
  greenSoft: '#E7F6EC',
  amber: '#C97A0E',
  amberSoft: '#FBEFD3',
  blue: '#2563EB',
  blueSoft: '#E9F0FD',
  red: '#DC2626',
  redSoft: '#FCE8E8',
  purple: '#7C5CD6',
  purpleSoft: '#EEE9FB',
  // dark-brown feature gradient + its text
  feat1: '#5A3018',
  feat2: '#2A1409',
  featInk: '#FBEFE4',
  featMut: '#D9BFA6',
} as const;

export const FEATURE_GRADIENT = [wt.feat1, wt.feat2] as const;
export const ACCENT_GRADIENT = [wt.accent2, wt.accent] as const;
