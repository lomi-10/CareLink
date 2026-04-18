import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ImageBackground,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { theme } from "@/constants/theme";

export default function RoleSelectionScreen() {
  const router = useRouter();

  const backgroundImage = Platform.select({
    web: require("../../assets/images/CareLink.BackGround.Web.png"),
    default: require("../../assets/images/CareLink.BackGround.Mobile.png"),
  });

  const handleRoleSelect = (role: string) => {
    router.push({
      pathname: "/(auth)/signup",
      params: { role },
    });
  };

  const RoleCard = ({
    role,
    title,
    description,
    icon,
    accent,
    soft,
  }: {
    role: string;
    title: string;
    description: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    accent: string;
    soft: string;
  }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: accent, backgroundColor: soft }]}
      onPress={() => handleRoleSelect(role)}
      activeOpacity={0.88}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={30} color={accent} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={theme.color.subtle} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/")}>
              <Ionicons name="arrow-back" size={22} color={theme.color.ink} />
            </TouchableOpacity>

            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <CareLinkLogoMark size={64} />
            </View>

            <Text style={styles.kicker}>Get started</Text>
            <Text style={styles.title}>Choose your role</Text>
            <Text style={styles.subtitle}>
              This decides how CareLink guides you — you can’t change it later without support.
            </Text>

            <View style={styles.cardsContainer}>
              <RoleCard
                role="parent"
                title="I'm a parent"
                description="Post jobs, browse helpers, and hire with PESO-aligned verification."
                icon="people"
                accent={theme.color.parent}
                soft={theme.color.parentSoft}
              />
              <RoleCard
                role="helper"
                title="I'm a helper"
                description="Build your profile, upload documents, and apply to trusted employers."
                icon="briefcase"
                accent={theme.color.helper}
                soft={theme.color.helperSoft}
              />
            </View>

            <Text style={styles.footerText}>
              Already registered?{" "}
              <Text style={styles.link} onPress={() => router.push("/login")}>
                Sign in
              </Text>
            </Text>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.color.surface },
  background: { flex: 1, width: "100%", height: "100%" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(248, 250, 252, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: theme.space.xxl,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  backButton: {
    position: "absolute",
    top: theme.space.lg,
    left: theme.space.lg,
    zIndex: 10,
    padding: theme.space.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.color.surface,
  },
  kicker: {
    fontSize: theme.font.caption,
    fontWeight: "700",
    color: theme.color.peso,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: theme.space.sm,
    marginTop: theme.space.xl,
    textAlign: "center",
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: "800",
    color: theme.color.ink,
    marginBottom: theme.space.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: theme.font.small,
    color: theme.color.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: theme.space.xxl,
    paddingHorizontal: theme.space.sm,
  },
  cardsContainer: { gap: theme.space.md, marginBottom: theme.space.xl },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    borderWidth: 1,
    borderColor: theme.color.line,
    borderLeftWidth: 5,
    ...theme.shadow.nav,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.space.md,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: theme.font.subtitle, fontWeight: "800", color: theme.color.ink, marginBottom: 4 },
  cardDescription: { fontSize: theme.font.small, color: theme.color.muted, lineHeight: 20 },
  footerText: { textAlign: "center", color: theme.color.muted, fontSize: theme.font.small },
  link: { color: theme.color.parent, fontWeight: "700" },
});
