import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ThemeColor } from "@/constants/theme";
import { theme } from "@/constants/theme";
import { useHelperTheme } from "@/contexts/HelperThemeContext";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Block = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: string[];
  accent: string;
  soft: string;
  border: string;
  chipBg: string;
  chipText: string;
  chipBorder: string;
};

const buildBlocks = (jobs: string[], skills: string[], languages: string[], c: ThemeColor): Block[] => [
  {
    key: "jobs",
    title: "Job roles",
    subtitle: "Roles you’re open to",
    icon: "briefcase",
    items: jobs,
    accent: c.warning,
    soft: c.warningSoft,
    border: "rgba(217, 119, 6, 0.25)",
    chipBg: c.warningSoft,
    chipText: c.inkMuted,
    chipBorder: "rgba(245, 158, 11, 0.35)",
  },
  {
    key: "skills",
    title: "Skills",
    subtitle: "What you bring to the home",
    icon: "construct",
    items: skills,
    accent: c.helper,
    soft: c.helperSoft,
    border: "rgba(5, 150, 105, 0.2)",
    chipBg: c.helperSoft,
    chipText: c.inkMuted,
    chipBorder: "rgba(16, 185, 129, 0.35)",
  },
  {
    key: "languages",
    title: "Languages",
    subtitle: "How you communicate",
    icon: "chatbubbles",
    items: languages,
    accent: c.info,
    soft: c.infoSoft,
    border: "rgba(2, 132, 199, 0.22)",
    chipBg: c.infoSoft,
    chipText: c.inkMuted,
    chipBorder: "rgba(14, 165, 233, 0.4)",
  },
];

type Props = {
  jobs: string[];
  skills: string[];
  languages: string[];
  onPressEdit?: () => void;
};

function Chip({
  label,
  chipBg,
  chipText,
  chipBorder,
  chipStyle,
  chipLabelStyle,
}: {
  label: string;
  chipBg: string;
  chipText: string;
  chipBorder: string;
  chipStyle: object;
  chipLabelStyle: object;
}) {
  const onPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        chipStyle,
        {
          backgroundColor: chipBg,
          borderColor: chipBorder,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Text style={[chipLabelStyle, { color: chipText }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function createSpecialtiesStyles(c: ThemeColor) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surfaceElevated,
      borderRadius: theme.radius.xl,
      marginBottom: theme.space.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.line,
      ...theme.shadow.card,
    },
    cardAccent: {
      height: 4,
      backgroundColor: c.helper,
      opacity: 0.9,
    },
    headRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: theme.space.lg,
      paddingTop: theme.space.lg,
      paddingBottom: theme.space.sm,
      gap: theme.space.md,
    },
    headLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space.md,
      flex: 1,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      fontSize: theme.font.subtitle,
      fontWeight: "800",
      color: c.ink,
      letterSpacing: -0.3,
    },
    cardSub: {
      marginTop: 2,
      fontSize: theme.font.caption,
      color: c.muted,
      lineHeight: 16,
      maxWidth: 260,
    },
    editLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    editLinkText: {
      fontSize: theme.font.small,
      fontWeight: "700",
      color: c.helper,
    },
    block: {
      marginHorizontal: theme.space.lg,
      marginBottom: theme.space.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      padding: theme.space.md,
    },
    blockHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space.sm,
      marginBottom: theme.space.md,
    },
    blockIcon: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.72)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.9)",
    },
    blockTitle: {
      fontSize: theme.font.body,
      fontWeight: "800",
      color: c.ink,
    },
    blockSub: {
      fontSize: 11,
      color: c.muted,
      marginTop: 1,
      fontWeight: "500",
    },
    countPill: {
      minWidth: 28,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.radius.full,
      overflow: "hidden",
      fontSize: 12,
      fontWeight: "800",
      textAlign: "center",
      backgroundColor: "rgba(255,255,255,0.75)",
      borderWidth: 1,
      borderColor: "rgba(15, 23, 42, 0.06)",
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      maxWidth: "100%",
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 18,
    },
    emptyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
    },
    emptyText: {
      flex: 1,
      fontSize: 13,
      color: c.muted,
      fontStyle: "italic",
    },
  });
}

export function SpecialtiesShowcase({ jobs, skills, languages, onPressEdit }: Props) {
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createSpecialtiesStyles(c), [c]);
  const blocks = useMemo(() => buildBlocks(jobs, skills, languages, c), [jobs, skills, languages, c]);

  return (
    <View style={styles.card}>
      <View style={styles.cardAccent} />

      <View style={styles.headRow}>
        <View style={styles.headLeft}>
          <View style={[styles.iconWrap, { backgroundColor: c.helperSoft }]}>
            <Ionicons name="sparkles" size={22} color={c.helper} />
          </View>
          <View>
            <Text style={styles.cardTitle}>Specialties & skills</Text>
            <Text style={styles.cardSub}>Tap chips — your full profile powers better matches</Text>
          </View>
        </View>
        {onPressEdit ? (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onPressEdit();
            }}
            style={({ pressed }) => [styles.editLink, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.editLinkText}>Edit</Text>
            <Ionicons name="chevron-forward" size={16} color={c.helper} />
          </Pressable>
        ) : null}
      </View>

      {blocks.map((block) => (
        <View
          key={block.key}
          style={[
            styles.block,
            { borderColor: block.border, backgroundColor: block.soft },
          ]}
        >
          <View style={styles.blockHead}>
            <View style={styles.blockIcon}>
              <Ionicons name={block.icon} size={18} color={block.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.blockTitle}>{block.title}</Text>
              <Text style={styles.blockSub}>{block.subtitle}</Text>
            </View>
            <Text style={[styles.countPill, { color: block.accent }]}>
              {block.items.filter(Boolean).length}
            </Text>
          </View>

          {block.items.filter(Boolean).length === 0 ? (
            <View style={styles.emptyRow}>
              <Ionicons name="add-circle-outline" size={18} color={c.muted} />
              <Text style={styles.emptyText}>Nothing listed yet — add in Edit Profile</Text>
            </View>
          ) : (
            <View style={styles.chipWrap}>
              {block.items
                .filter(Boolean)
                .map((item, i) => (
                  <Chip
                    key={`${block.key}-${i}-${item}`}
                    label={item.trim()}
                    chipBg={block.chipBg}
                    chipText={block.chipText}
                    chipBorder={block.chipBorder}
                    chipStyle={styles.chip}
                    chipLabelStyle={styles.chipLabel}
                  />
                ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
