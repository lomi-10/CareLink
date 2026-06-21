// components/admin/login/AlertModal.tsx
// Simple title/message/Close alert used for login failures, lockouts, and
// success notices on the admin login screen.
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { DARK, ORANGE } from "@/components/landing/web/theme";
import { FontFamily } from "@/constants/GlobalStyles";

export function AlertModal({
  visible, title, message, onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.container}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          <Pressable style={s.button} onPress={onClose}>
            <Text style={s.buttonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  container: { backgroundColor: "#fff", padding: 25, borderRadius: 16, width: "80%", maxWidth: 350, alignItems: "center" },
  title: { fontSize: 18, fontFamily: FontFamily.fredokaSemiBold, marginBottom: 10, color: DARK },
  message: { fontSize: 14, fontFamily: FontFamily.fredokaRegular, textAlign: "center", color: "#555", marginBottom: 20, lineHeight: 20 },
  button: { backgroundColor: ORANGE, paddingVertical: 11, paddingHorizontal: 26, borderRadius: 10 },
  buttonText: { color: "#fff", fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
});
