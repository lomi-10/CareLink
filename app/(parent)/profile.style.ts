// app/(parent)/profile.style.ts

import { StyleSheet } from "react-native";
import { theme } from "@/constants/theme";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "transparent",
  },
  emptyText: { fontSize: 16, color: theme.color.muted, marginTop: 16, marginBottom: 24 },
  createProfileBtn: {
    backgroundColor: theme.color.parent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: theme.radius.md,
  },
  createProfileText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  mainContent: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 60 },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.color.ink,
    letterSpacing: -0.8,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.parent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    gap: 8,
    ...theme.shadow.nav,
  },
  editButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
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
  menuButton: { padding: 8 },
  mobileTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.color.ink,
    letterSpacing: -0.3,
  },
  editIconButton: { padding: 8 },
  mobileScrollContent: { padding: 16, paddingBottom: 40 },
});
