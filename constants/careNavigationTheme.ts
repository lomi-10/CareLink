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

  return {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: '#60a5fa',
      background: '#0b1320',
      card: '#1a2740',
      text: '#f1f5f9',
      border: '#334155',
      notification: '#fb7185',
    },
  };
}
