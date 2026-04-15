// app/(helper)/profile.styles.ts
import { StyleSheet } from "react-native";
import { theme } from "@/constants/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  // ── empty / error state ─────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "transparent",
    gap: 12,
  },
  emptyText: {
    fontSize: 17,
    color: theme.color.muted,
    fontWeight: "600",
    textAlign: "center",
  },
  createProfileBtn: {
    backgroundColor: theme.color.helper,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: theme.radius.md,
    marginTop: 8,
    ...theme.shadow.nav,
  },
  createProfileText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  // ── desktop layout ───────────────────────────────────────────────────────
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 32,
    paddingBottom: 64,
  },

  // ── page header (desktop) ────────────────────────────────────────────────
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: theme.color.ink,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: theme.color.muted,
    fontWeight: "600",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.helper,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    gap: 8,
    ...theme.shadow.nav,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  // ── mobile header ────────────────────────────────────────────────────────
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
    ...theme.shadow.nav,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  mobileTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.color.ink,
    letterSpacing: -0.3,
  },
  editIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.color.helperSoft,
    borderWidth: 1,
    borderColor: theme.color.helper + "33",
  },
  mobileScrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
});
