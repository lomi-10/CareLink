import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

/**
 * Navigation chrome (cards, modal scrims, default text) aligned with CareLink portals.
 */
export function createCareLinkNavigationTheme(scheme: 'light' | 'dark'): Theme {
  if (scheme === 'light') {
    return {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: '#2563eb',
        background: '#f8fafc',
        card: '#ffffff',
        text: '#0f172a',
        border: '#e2e8f0',
        notification: '#ef4444',
      },
    };
  }

  // Warm dark-brown ("cocoa night") — matches the portal dark adaptation so
  // navigation-themed surfaces don't clash with the brown canvas.
  return {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: '#E0B080',
      background: '#16100C',
      card: '#1E1712',
      text: '#F3EBE3',
      border: '#3A302A',
      notification: '#fb7185',
    },
  };
}
