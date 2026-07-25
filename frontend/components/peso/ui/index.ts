// components/peso/ui — the shared PESO design system.
// Build screens from these primitives so the whole portal stays consistent,
// theme-aware (light/dark) and animated.
export * from './primitives';
export * from './ScreenHeader';
export * from './PesoBackground';
export { usePesoTheme, space, radius, font, shadow } from '@/contexts/PesoThemeContext';
export type { PesoColors } from '@/contexts/PesoThemeContext';
