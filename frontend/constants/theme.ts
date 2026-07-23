/**
 * CareLink design tokens — use for consistent, professional UI across roles.
 *
 * These were originally a cool slate/blue palette (Tailwind-ish: #0F172A ink,
 * #F8FAFC surfaces). The PESO/admin portals and a handful of helper/parent
 * components are built on them, while the rest of the product uses the warm
 * cream-and-brown CareLink brand — so the staff side read as a different product
 * bolted onto the app.
 *
 * They are now retuned to that warm brand, sourcing the shared values from
 * constants/designSystem.ts so there is ONE definition of "verified green",
 * "warning amber", etc. Key names are unchanged, so every existing consumer keeps
 * working and simply inherits the warmer look.
 */
import { neutral, status } from './designSystem';

export const theme = {
  color: {
    // Warm CareLink neutrals (were cool slate)
    ink: neutral.ink,
    inkMuted: neutral.muted,
    muted: neutral.muted,
    subtle: neutral.subtle,
    line: neutral.line,
    lineStrong: "#E2D3BE",
    surface: neutral.canvas,
    surfaceElevated: neutral.surface,
    // Role accents — match each portal's brand theme
    parent: "#D9A441",        // parent gold (was blue)
    parentSoft: "#FBEFD3",
    helper: "#E8641A",        // helper orange (was green)
    helperSoft: "#FCEBD9",
    peso: "#0F7B54",          // staff green — "official/verified" (was orange)
    pesoSoft: "#E6F4EF",
    // Semantic status — single source of truth
    success: status.green,
    successSoft: status.greenSoft,
    warning: status.amber,
    warningSoft: status.amberSoft,
    danger: status.red,
    dangerSoft: status.redSoft,
    info: status.blue,
    infoSoft: status.blueSoft,
    overlay: "rgba(42, 20, 9, 0.45)",   // warm brown scrim, not slate
    /** Full-screen canvas behind content (not pure white) */
    canvasHelper: "#FBF6EE",
    canvasParent: "#FFF9F2",
    canvasPeso: "#FAF7F1",
    canvasAdmin: "#FAF7F1",
    /** Modal body tint (pairs with accent) */
    modalTintHelper: "#FFFDFA",
    modalTintParent: "#FFFDF8",
    modalTintPeso: "#FFFDFA",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    section: 32,
  },
  font: {
    titleLarge: 28,
    title: 22,
    subtitle: 17,
    body: 15,
    small: 13,
    caption: 12,
  },
  shadow: {
    card: {
      shadowColor: "#4A2C14",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    nav: {
      shadowColor: "#4A2C14",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
  },
} as const;

/** Light/dark palette for template components (`collapsible`, `useThemeColor`) */
export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    icon: "#687076",
    tint: theme.color.parent,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    icon: "#9BA1A6",
    tint: theme.color.helper,
  },
} as const;

export type ThemeColor = typeof theme.color;
