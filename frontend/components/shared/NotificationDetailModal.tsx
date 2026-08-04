// components/shared/NotificationDetailModal.tsx
// Shown when a user taps a notification in the list. Reads the full message
// first — tapping used to redirect immediately, so testers never actually saw
// what changed (e.g. why a document was rejected) before landing on another
// screen. The "go there" button is a deliberate second step, not automatic.
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated, Modal, Platform, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { theme } from "@/constants/theme";

export type NotificationDetailKind = "success" | "error" | "warning" | "info";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  type?: NotificationDetailKind;
  time?: string;
  /** Label for the action button (e.g. "View Documents"). Omit to hide it. */
  actionLabel?: string | null;
  onAction?: () => void;
  onClose: () => void;
}

export function NotificationDetailModal({
  visible, title, message, type = "info", time, actionLabel, onAction, onClose,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 48, useNativeDriver: true }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const cfg =
    type === "success" ? { icon: "checkmark-circle" as const, accent: theme.color.success, soft: theme.color.successSoft }
    : type === "error"   ? { icon: "close-circle" as const, accent: theme.color.danger, soft: theme.color.dangerSoft }
    : type === "warning" ? { icon: "warning" as const, accent: theme.color.warning, soft: theme.color.warningSoft }
    : { icon: "information-circle" as const, accent: theme.color.info, soft: theme.color.infoSoft };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.iconWrap, { backgroundColor: cfg.soft }]}>
            <Ionicons name={cfg.icon} size={32} color={cfg.accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {!!time && <Text style={styles.time}>{time}</Text>}
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {!!actionLabel && !!onAction && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: cfg.accent }]}
                onPress={onAction}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{actionLabel}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.ghostBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.ghostBtnText}>{actionLabel ? "Not now" : "Close"}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: theme.color.overlay,
    justifyContent: "center", alignItems: "center", padding: theme.space.xl, zIndex: 1000,
  },
  card: {
    backgroundColor: theme.color.surfaceElevated, borderRadius: theme.radius.xl,
    padding: theme.space.xxl, width: "100%", maxWidth: 420, alignItems: "center",
    ...theme.shadow.card,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center", marginBottom: theme.space.lg,
  },
  title: { fontSize: theme.font.subtitle, fontWeight: "700", color: theme.color.ink, marginBottom: 4, textAlign: "center" },
  time: { fontSize: 12, color: theme.color.inkMuted, marginBottom: theme.space.sm },
  message: { fontSize: theme.font.body, textAlign: "center", color: theme.color.inkMuted, marginBottom: theme.space.xl, lineHeight: 22 },
  actions: { alignSelf: "stretch", gap: 10 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: theme.radius.full,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  ghostBtn: { paddingVertical: 12, alignItems: "center" },
  ghostBtnText: { color: theme.color.inkMuted, fontSize: 14, fontWeight: "600" },
});
