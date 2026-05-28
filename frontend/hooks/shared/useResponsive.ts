// hooks/useResponsive.ts
// Custom hook for detecting screen sizes and responsive breakpoints

import { useWindowDimensions, Platform } from 'react-native';

export function useResponsive() {
  const { width } = useWindowDimensions();

  // Breakpoint constants
  const MOBILE_BREAKPOINT = 768;
  const DESKTOP_BREAKPOINT = 1024;

  return {
    // Screen size
    width,
    
    // Device type
    isWeb: Platform.OS === 'web',
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    
    // Breakpoints
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < DESKTOP_BREAKPOINT,
    isDesktop: width >= DESKTOP_BREAKPOINT,
    
    // Utility
    getBreakpoint: () => {
      if (width < MOBILE_BREAKPOINT) return 'mobile';
      if (width < DESKTOP_BREAKPOINT) return 'tablet';
      return 'desktop';
    },
  };
}
