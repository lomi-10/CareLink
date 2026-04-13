/**
 * CareLink design tokens — use for consistent, professional UI across roles.
 */
export const theme = {
  color: {
    ink: "#0F172A",
    inkMuted: "#475569",
    muted: "#64748B",
    subtle: "#94A3B8",
    line: "#E2E8F0",
    lineStrong: "#CBD5E1",
    surface: "#F8FAFC",
    surfaceElevated: "#FFFFFF",
    parent: "#2563EB",
    parentSoft: "#EFF6FF",
    helper: "#059669",
    helperSoft: "#ECFDF5",
    peso: "#EA580C",
    pesoSoft: "#FFF7ED",
    success: "#16A34A",
    successSoft: "#DCFCE7",
    warning: "#D97706",
    warningSoft: "#FEF3C7",
    danger: "#DC2626",
    dangerSoft: "#FEE2E2",
    info: "#0284C7",
    infoSoft: "#E0F2FE",
    overlay: "rgba(15, 23, 42, 0.45)",
    /** Full-screen canvas behind content (not pure white) */
    canvasHelper: "#EFF8F4",
    canvasParent: "#F0F4FD",
    canvasPeso: "#FFF8F2",
    canvasAdmin: "#F1F5F9",
    /** Modal body tint (pairs with accent) */
    modalTintHelper: "#F4FBF8",
    modalTintParent: "#F5F8FF",
    modalTintPeso: "#FFFCF8",
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
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    nav: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
  },
} as const;

export type ThemeColor = typeof theme.color;
