// components/admin/login/MobileWarning.tsx
// Desktop/tablet-only gate — the admin portal isn't supported on phones.
import { Ionicons } from "@expo/vector-icons";
import type { useRouter } from "expo-router";
import React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { DARK, ORANGE } from "@/components/landing/web/theme";
import { FontFamily } from "@/constants/GlobalStyles";

export function MobileWarning({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.card}>
        <Ionicons name="desktop" size={72} color={ORANGE} />
        <Text style={s.title}>Desktop Only</Text>
        <Text style={s.message}>
          The Admin Portal is only accessible from desktop or tablet devices.
        </Text>
        <View style={s.instructions}>
          <Text style={s.instructionText}>Please access this portal from:</Text>
          <View style={s.deviceList}>
            <View style={s.deviceItem}>
              <Ionicons name="desktop" size={22} color={ORANGE} />
              <Text style={s.deviceText}>Desktop Computer</Text>
            </View>
            <View style={s.deviceItem}>
              <Ionicons name="tablet-landscape" size={22} color={ORANGE} />
              <Text style={s.deviceText}>Tablet (Landscape)</Text>
            </View>
          </View>
        </View>
        <Pressable onPress={() => router.push("/welcome")}>
          <Text style={s.backText}>← Back to Welcome</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF7F1", justifyContent: "center", alignItems: "center", padding: 20 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 40, maxWidth: 400, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  title: { fontSize: 22, fontFamily: FontFamily.fredokaSemiBold, color: DARK, marginTop: 18, marginBottom: 10 },
  message: { fontSize: 14, fontFamily: FontFamily.fredokaRegular, color: "#7C6047", textAlign: "center", marginBottom: 22, lineHeight: 21 },
  instructions: { width: "100%", backgroundColor: "#FAF7F1", borderRadius: 12, padding: 18, marginBottom: 22 },
  instructionText: { fontSize: 13, fontFamily: FontFamily.fredokaSemiBold, color: "#333", marginBottom: 14 },
  deviceList: { gap: 10 },
  deviceItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  deviceText: { fontSize: 13, fontFamily: FontFamily.fredokaRegular, color: "#7C6047" },
  backText: { color: ORANGE, fontSize: 14, fontFamily: FontFamily.fredokaSemiBold },
});
