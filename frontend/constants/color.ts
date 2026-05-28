/**
 * CareLink Color System
 *
 * Logic:
 * 1. 'tintColorLight' is your main app color (usually the Parent Blue).
 * 2. 'carelink' object holds specific themes for your 3 roles.
 */

const tintColorLight = '#007AFF'; // <--- CHANGE THIS to your main blue
const tintColorDark = '#fff';

export const Colors = {
  // 1. STANDARD THEME (Required by Expo)
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },

  // 2. YOUR CUSTOM THEME (This is the important part for you!)
  carelink: {
    // PARENT THEME (Trust & Calm)
    parent: {
      primary: '',    // <-- Put your MAIN BLUE hex code here
      secondary: '',  // <-- Put a lighter blue (for backgrounds) here
      accent: '',     // <-- Maybe a yellow/gold for "Top Rated" stars
    },

    // HELPER THEME (Growth & Service)
    helper: {
      primary: '',    // <-- Put your MAIN GREEN hex code here
      secondary: '',  // <-- Put a lighter green here
      text: '',       // <-- A dark green for text
    },

    // ADMIN THEME (Authority)
    admin: {
      primary: '',    // <-- Put a dark Navy Blue or Red here
      sidebar: '',    // <-- Color for the side menu background
    },

    // GLOBAL STATUS COLORS (For your Log Trail!)
    status: {
      success: '#34C759', // Green (Keep this standard)
      error: '#FF3B30',   // Red (Keep this standard)
      warning: '#FF9500', // Orange (Pending)
      info: '#007AFF',    // Blue (Info)
    }
  }
};