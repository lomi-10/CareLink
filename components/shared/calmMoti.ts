import { Easing } from 'react-native-reanimated';

/** Shared ease for modal / toast Moti transitions (no spring, no scale on containers). */
export const CALM_EASE = Easing.out(Easing.ease);

export const CALM_MODAL_IN = { opacity: 1, translateY: 0 } as const;
export const CALM_MODAL_OUT = { opacity: 0, translateY: 8 } as const;
export const CALM_MODAL_FROM = { opacity: 0, translateY: 8 } as const;

export const CALM_MODAL_TRANSITION = {
  type: 'timing' as const,
  duration: 200,
  easing: CALM_EASE,
};

export const CALM_TOAST_IN = { opacity: 1, translateY: 0 } as const;
export const CALM_TOAST_OUT = { opacity: 0, translateY: -6 } as const;
export const CALM_TOAST_FROM = { opacity: 0, translateY: -6 } as const;

export const CALM_TOAST_TRANSITION = {
  type: 'timing' as const,
  duration: 180,
  easing: CALM_EASE,
};
