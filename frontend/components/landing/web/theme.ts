// components/landing/web/theme.ts
// Shared palette, gradients, and layout primitives for the web landing page
// sections (components/landing/web/*). Keep this the single source of truth
// for colors so the dark cinematic look stays consistent as you redesign
// individual sections.
import { StyleSheet } from "react-native";

// ─── Palette — dark cinematic theme, warm orange/gold accents ───────────────
export const BG_DARK           = "#1B0F06";
export const BG_DARK_2         = "#140B04";
export const CARD_GLASS        = "rgba(255,255,255,0.05)";
export const CARD_GLASS_BORDER = "rgba(255,255,255,0.10)";
export const TEXT_LIGHT        = "#FFFFFF";
export const TEXT_LIGHT_MUTED  = "rgba(255,255,255,0.66)";
export const TEXT_LIGHT_SUBTLE = "rgba(255,255,255,0.42)";
export const ORANGE            = "#EA6F2A";
export const GOLDEN            = "#F6C453";
export const CREAM_SOFT        = "#FBEEDD";
export const DARK              = "#3C250D";
export const PHOTO_BG          = "#2A1A0D"; // placeholder fill behind photo sections

// ─── Gradients ───────────────────────────────────────────────────────────────
export const HERO_OVERLAY   = ["rgba(15,9,4,0.93)", "rgba(15,9,4,0.55)", "rgba(15,9,4,0.08)"] as const;
export const BROWN_GRADIENT = ["#3C250D", "#1B0F06"] as const;
export const CTA_GRADIENT   = ["#5A3D1F", "#241406"] as const;
export const CTA_EDGE_GLOW  = ["transparent", "rgba(194,72,4,0.45)", "rgba(234,111,42,0.4)"] as const;

// ─── Layout ──────────────────────────────────────────────────────────────────
export const CONTAINER_MAX = 1180;

export const layout = StyleSheet.create({
  container: { width: "100%", maxWidth: CONTAINER_MAX, alignSelf: "center", paddingHorizontal: 32 },
  section: { paddingVertical: 56 },
});

// Sections the nav can smooth-scroll to (see WebLandingRedesign.tsx).
export type SectionKey = "howItWorks" | "management" | "trust";
