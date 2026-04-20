import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ImageBackground,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { theme } from "@/constants/theme";

import { styles } from "./role-selection.styles";

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
