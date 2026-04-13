// components/helper/profile/InfoCard.tsx
// Profile section card — themed, readable, not a wall of bold text

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

interface InfoItem {
  label: string;
  value: string;
}

interface InfoCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  items: InfoItem[];
  children?: React.ReactNode;
}

export function InfoCard({ icon, iconColor, title, items, children }: InfoCardProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.accentBar, { backgroundColor: iconColor }]} />
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={[styles.iconBadge, { borderLeftColor: iconColor }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.grid}>
          {items.map((item, index) => (
            <View
              key={index}
              style={[styles.gridItem, items.length === 1 && styles.gridItemFull]}
            >
              <Text style={styles.label}>{item.label}</Text>
              <View style={styles.valuePill}>
                <Text style={styles.value}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.xl,
    marginBottom: theme.space.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  accentBar: {
    height: 3,
    width: "100%",
    opacity: 0.95,
  },
  inner: {
    padding: theme.space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.md,
    marginBottom: theme.space.lg,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.surface,
    borderLeftWidth: 3,
  },
  title: {
    fontSize: theme.font.subtitle,
    fontWeight: "800",
    color: theme.color.ink,
    letterSpacing: -0.3,
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  gridItem: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: theme.space.md,
  },
  gridItemFull: {
    width: "100%",
  },
  label: {
    fontSize: 10,
    color: theme.color.muted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  valuePill: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  value: {
    fontSize: theme.font.small,
    color: theme.color.ink,
    fontWeight: "600",
    lineHeight: 20,
  },
});
