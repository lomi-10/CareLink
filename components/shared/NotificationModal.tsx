// components/shared/NotificationModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "@/constants/theme";

interface NotificationModalProps {
  visible: boolean;
  message: string;
  /** Optional heading (defaults to a label derived from type) */
  title?: string;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

const defaultTitles: Record<NotificationModalProps["type"], string> = {
  success: "Success",
  error: "Something went wrong",
  warning: "Please review",
  info: "Notice",
};

export function NotificationModal({
  visible,
  message,
  title,
  type = "info",
  onClose,
  autoClose = true,
  duration = 3200,
}: NotificationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 48,
        useNativeDriver: true,
      }).start();

      if (autoClose) {
        const timer = setTimeout(() => handleClose(), duration);
        return () => clearTimeout(timer);
      }
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, autoClose, duration]);

  const handleClose = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const cfg =
    type === "success"
      ? { icon: "checkmark-circle" as const, accent: theme.color.success, soft: theme.color.successSoft }
      : type === "error"
        ? { icon: "close-circle" as const, accent: theme.color.danger, soft: theme.color.dangerSoft }
        : type === "warning"
          ? { icon: "warning" as const, accent: theme.color.warning, soft: theme.color.warningSoft }
          : { icon: "information-circle" as const, accent: theme.color.info, soft: theme.color.infoSoft };

  const heading = title ?? defaultTitles[type];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.iconWrap, { backgroundColor: cfg.soft }]}>
            <Ionicons name={cfg.icon} size={36} color={cfg.accent} />
          </View>
          <Text style={styles.title}>{heading}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: cfg.accent }]}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>OK</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.color.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space.xl,
    zIndex: 1000,
  },
  card: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: theme.space.xxl,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    ...theme.shadow.card,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.space.lg,
  },
  title: {
    fontSize: theme.font.subtitle,
    fontWeight: "700",
    color: theme.color.ink,
    marginBottom: theme.space.sm,
    textAlign: "center",
  },
  message: {
    fontSize: theme.font.body,
    textAlign: "center",
    color: theme.color.inkMuted,
    marginBottom: theme.space.xl,
    lineHeight: 22,
  },
  primaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: theme.radius.full,
    minWidth: 140,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
