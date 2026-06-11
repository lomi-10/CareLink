// constants/authThemes.ts
// Shared role-based color themes for auth screens (signup, login).
// Import PARENT_T or HELPER_T wherever you need role-driven colours.

export const PARENT_T = {
  cardBg:      '#FDF0D0',
  inputBg:     '#FFF8E8',
  inputBorder: 'rgba(196,136,42,0.2)',
  inputText:   '#3B1A08',
  label:       '#3B1A08',
  required:    '#C4882A',
  optional:    '#B8956A',
  placeholder: '#B8956A',
  pillBg:      'rgba(196,136,42,0.12)',
  pillBorder:  'rgba(196,136,42,0.25)',
  pillText:    '#3B1A08',
  pillIcon:    '#3B1A08',
  btn:         '#C4882A',
  btnText:     '#FFFFFF',
  reqBg:       'rgba(0,0,0,0.04)',
  reqBorder:   'rgba(0,0,0,0.07)',
  reqText:     '#5C3A1A',
  eye:         '#B8956A',
  footerText:  'rgba(59,26,8,0.55)',
  footerLink:  '#C4882A',
};

export const HELPER_T = {
  cardBg:      '#3B1A08',
  inputBg:     'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.1)',
  inputText:   '#FFFFFF',
  label:       '#FFFFFF',
  required:    '#FBD9A0',
  optional:    'rgba(255,255,255,0.45)',
  placeholder: 'rgba(255,255,255,0.35)',
  pillBg:      'rgba(255,255,255,0.07)',
  pillBorder:  'rgba(255,255,255,0.14)',
  pillText:    '#FFFFFF',
  pillIcon:    '#FFFFFF',
  btn:         '#E86019',
  btnText:     '#FFFFFF',
  reqBg:       'rgba(0,0,0,0.22)',
  reqBorder:   'rgba(255,255,255,0.07)',
  reqText:     '#E0C9A8',
  eye:         'rgba(255,255,255,0.5)',
  footerText:  'rgba(255,255,255,0.5)',
  footerLink:  '#FBD9A0',
};

export type RoleTheme = typeof PARENT_T;
