import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

type Role = "helper" | "parent";

type Props = {
  percent: number;
  role?: Role;
};

export function ProfileCompletionCard({ percent, role = "helper" }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const accent = role === "parent" ? theme.color.parent : theme.color.helper;
  const soft = role === "parent" ? theme.color.parentSoft : theme.color.helperSoft;

  return (
    <View style={[styles.wrap, { borderColor: theme.color.line }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconBg, { backgroundColor: soft }]}>
          <Ionicons name="pie-chart" size={20} color={accent} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>Profile strength</Text>
          <Text style={styles.hint}>
            {clamped >= 100
              ? "Your profile looks complete."
              : "Add missing details to improve trust and matching."}
          </Text>
        </View>
        <Text style={[styles.pct, { color: accent }]}>{clamped}%</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%` as const,
              backgroundColor: accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.space.lg,
    marginBottom: theme.space.lg,
    ...theme.shadow.card,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.md,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: theme.font.body,
    fontWeight: "700",
    color: theme.color.ink,
  },
  hint: {
    marginTop: 2,
    fontSize: theme.font.caption,
    color: theme.color.muted,
    lineHeight: 16,
  },
  pct: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  track: {
    marginTop: theme.space.md,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.color.line,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: theme.radius.full,
  },
});
