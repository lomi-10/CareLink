// components/peso/NotificationModal.tsx
// Reusable Notification Modal for PESO Admin (better than alerts for web)
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";

interface NotificationModalProps {
  visible: boolean;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function NotificationModal({
  visible,
  type,
  title,
  message,
  onClose,
  actionLabel,
  onAction,
  autoClose = false,
  autoCloseDelay = 3000,
}: NotificationModalProps) {
  // useRef, NOT a bare `new Animated.Value(0)`.
  //
  // A value constructed inline is rebuilt on every render, and the entrance
  // animation only runs from the `visible` effect. So any re-render while the
  // modal was open -- a parent calling setProcessing(true), say -- handed the
  // overlay a brand new value pinned at 0, and the modal went fully
  // transparent while still mounted and still swallowing every click.
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const getConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: "checkmark-circle",
          color: "#34C759",
          bgColor: "#E8F5E9",
        };
      case "error":
        return {
          icon: "close-circle",
          color: "#FF3B30",
          bgColor: "#FFEBEE",
        };
      case "warning":
        return {
          icon: "warning",
          color: "#FF9500",
          bgColor: "#FFF4E5",
        };
      case "info":
        return {
          icon: "information-circle",
          color: "#007AFF",
          bgColor: "#E3F2FD",
        };
    }
  };

  const config = getConfig();

  return (
    <Modal visible={visible} animationType="none" transparent={true}>
      <Animated.View
        style={[styles.overlay, { opacity: fadeAnim }]}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            <Ionicons name={config.icon as any} size={48} color={config.color} />
          </View>

          {/* Content */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {actionLabel && onAction && (
              <TouchableOpacity
                style={[styles.button, styles.actionButton, { backgroundColor: config.color }]}
                onPress={() => {
                  // Close FIRST, synchronously, then run the action.
                  //
                  // This used to await the action and close afterwards:
                  //   Promise.resolve(onAction()).finally(handleClose)
                  //
                  // Every confirm handler in the PESO portal is async and opens
                  // a follow-up modal -- "Missing required document", "Approved!",
                  // an error. That modal opened, and the trailing finally() then
                  // tore it straight back down. Approving a user with a missing
                  // Valid ID was therefore impossible: the "Approve anyway"
                  // prompt was destroyed in the same tick it appeared, so the
                  // officer saw a button that did nothing, however many times
                  // they pressed it.
                  //
                  // Closing synchronously (no fade -- a fade's completion
                  // callback reintroduces the same race 200ms later) leaves the
                  // action in sole control of what is on screen when it ends.
                  onClose();
                  onAction();
                }}
              >
                <Text style={styles.actionButtonText}>{actionLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                actionLabel ? styles.closeButton : styles.closeButtonFull,
              ]}
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1C1E",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    flex: 1,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  closeButton: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  closeButtonFull: {
    flex: 1,
    backgroundColor: "#007AFF",
  },
  closeButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
