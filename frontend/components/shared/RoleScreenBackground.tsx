import React from "react";
import { View, StyleSheet, useWindowDimensions, Platform } from "react-native";
import { Image } from "expo-image";
import { theme } from "@/constants/theme";
import { useHelperTheme } from "@/contexts/HelperThemeContext";
import { useParentTheme } from "@/contexts/ParentThemeContext";

// Abstract warm-brand background art for WEB only (mobile keeps the soft blob
// look). Covers the full screen behind every helper/parent web screen — this
// is the single place that wraps them all, so no per-screen wiring needed.
const WEB_BG_IMAGE: Partial<Record<ScreenRole, any>> = {
  helper: require("../../assets/background/helper-web-bg.png"),
  parent: require("../../assets/background/parent-web-bg.png"),
};

export type ScreenRole = "helper" | "parent" | "peso" | "admin";

const CANVAS: Record<ScreenRole, string> = {
  helper: theme.color.canvasHelper,
  parent: theme.color.canvasParent,
  peso: theme.color.canvasPeso,
  admin: theme.color.canvasAdmin,
};

const BLOB_A: Record<ScreenRole, string> = {
  helper: theme.color.helperSoft,
  parent: theme.color.parentSoft,
  peso: theme.color.pesoSoft,
  admin: theme.color.line,
};

const BLOB_B: Record<ScreenRole, string> = {
  helper: theme.color.successSoft,
  parent: theme.color.infoSoft,
  peso: theme.color.warningSoft,
  admin: theme.color.lineStrong,
};

type Props = {
  role: ScreenRole;
  children: React.ReactNode;
};

/**
 * Soft tinted canvas + large blurred blobs (no images).
 * Web uses larger, softer shapes; mobile keeps blobs tighter so content stays readable.
 */
export function RoleScreenBackground({ role, children }: Props) {
  const { width, height } = useWindowDimensions();
  const { color: parentColor } = useParentTheme();
  const { color: helperColor } = useHelperTheme();
  const isWide = width >= 768;
  const canvas =
    role === "parent" ? parentColor.canvasParent : role === "helper" ? helperColor.canvasHelper : CANVAS[role];
  const b1 =
    role === "parent"
      ? parentColor.parentSoft
      : role === "helper"
        ? helperColor.helperSoft
        : BLOB_A[role];
  const b2 =
    role === "parent"
      ? parentColor.infoSoft
      : role === "helper"
        ? helperColor.successSoft
        : BLOB_B[role];

  const topBlob = {
    top: isWide ? -height * 0.06 : -height * 0.04,
    right: isWide ? -width * 0.12 : -width * 0.25,
    width: isWide ? width * 0.52 : width * 0.92,
    height: isWide ? width * 0.48 : width * 0.75,
    opacity: Platform.OS === "web" ? 0.55 : 0.42,
  };

  const bottomBlob = {
    bottom: isWide ? height * 0.02 : 0,
    left: isWide ? -width * 0.1 : -width * 0.2,
    width: isWide ? width * 0.38 : width * 0.75,
    height: isWide ? width * 0.36 : width * 0.55,
    opacity: Platform.OS === "web" ? 0.38 : 0.32,
  };

  // Web gets the uploaded abstract brand art (fills behind every helper/parent
  // web screen, sized to cover so it stays full-bleed at any window size);
  // mobile keeps the lighter blob treatment since the art is tuned for wide
  // screens and would overpower a phone.
  const bgImage = Platform.OS === "web" ? WEB_BG_IMAGE[role] : null;

  return (
    <View style={[styles.root, { backgroundColor: canvas }]}>
      {bgImage ? (
        <View style={styles.blobs} pointerEvents="none">
          <Image source={bgImage} style={styles.bgImage} contentFit="cover" />
          {/* Cream wash so foreground cards keep full contrast over the art. */}
          <View style={[styles.bgImage, { backgroundColor: "rgba(251,246,238,0.5)" }]} />
        </View>
      ) : (
        <View style={styles.blobs} pointerEvents="none">
          <View
            style={[
              styles.blob,
              topBlob,
              { backgroundColor: b1 },
            ]}
          />
          <View
            style={[
              styles.blob,
              bottomBlob,
              { backgroundColor: b2 },
            ]}
          />
        </View>
      )}
      <View style={styles.foreground}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  blobs: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    borderRadius: 9999,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  foreground: {
    flex: 1,
  },
});
