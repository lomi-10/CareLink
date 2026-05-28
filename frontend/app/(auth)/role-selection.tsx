// app/(auth)/role-selection.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  Text,
  View,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Platform, // 👈 Added Platform for safe web transitions
} from "react-native";
import { Image } from "expo-image";
import Logo from "@/components/branding/Logo";
import { LinearGradient } from "expo-linear-gradient";
import RadialGradient from "@/components/landing/RadialGradient";
import { styles } from "./role-selection.styles";

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024; // Breakpoint for Web

  const handleRoleSelect = (role: string) => {
    router.replace({
      pathname: "/(auth)/signup",
      params: { role },
    });
  };

  // ==========================================
  // 🖥️ WEB DESIGN (SPLIT SCREEN LAYOUT)
  // ==========================================
  if (isDesktop) {
    return (
      <LinearGradient
        colors={["#422919", "#2A1608", "#1A0D04"]}
        style={styles.webPageContainer}
      >
        <RadialGradient
          colors={["rgba(233, 102, 19, 0.18)", "rgba(42, 22, 8, 0)"]}
          locations={[0, 1]}
          cx="50%"
          cy="20%"
          rx="70%"
          ry="70%"
          style={[styles.radialHighlight, { zIndex: 0 }]}
        />

        <SafeAreaView style={{ flex: 1 }}>
          {/* HEADER */}
          <View style={styles.webHeader}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={26} color="white" />
            </Pressable>

            <View style={styles.webLogoRow}>
              <Logo />
              <Text style={styles.carelink}>
                <Text style={styles.care}>Care</Text>
                <Text style={styles.link}>Link</Text>
              </Text>
            </View>
          </View>

          {/* MAIN CONTENT */}
          <View style={styles.webContent}>
            <Text style={styles.getStarted}>GET STARTED</Text>

            <Text style={styles.webCenteredTitle}>
              Choose your role
            </Text>

            <Text style={styles.webCenteredSubtitle}>
              This decides how CareLink customizes your dashboard
              and guides you to the right experience.
            </Text>

            {/* CARDS */}
            <View style={styles.webModernCardsContainer}>

              {/* PARENT */}
              <Pressable
                onPress={() => handleRoleSelect("parent")}
                style={({ pressed, hovered }: any) => [
                  styles.webModernParentCard,
                  {
                    transform: [{ translateY: hovered ? -8 : 0 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >

                {/* ========================================== */}
                {/* 🎨 BACKGROUND CIRCLE / GLOW SHAPE */}
                {/* Put large colored circle behind the family image */}
                {/* Example color: rgba(255,255,255,0.18) */}
                {/* ========================================== */}

                {/* <View style={styles.webParentCircle} /> */}


                {/* ========================================== */}
                {/* 🖼️ DECORATIVE BACKGROUND IMAGES */}
                {/* Put hanging frames, plants, toys, etc. */}
                {/* These should be ABOVE the circle but BELOW the character */}
                {/* ========================================== */}

                {/*
                <Image
                  source={require("@/assets/landing/frame.png")}
                  style={styles.webFrameDecor}
                  contentFit="contain"
                />
                */}

                {/*
                <Image
                  source={require("@/assets/landing/plant.png")}
                  style={styles.webPlantDecor}
                  contentFit="contain"
                />
                */}


                {/* ========================================== */}
                {/* 👨‍👩‍👧 MAIN CHARACTER IMAGE */}
                {/* Main foreground image */}
                {/* ========================================== */}

                <Image
                  source={require("@/assets/landing/family-role.png")}
                  style={styles.webModernImage}
                  contentFit="contain"
                />

                {/* ========================================== */}
                {/* ✨ OPTIONAL EXTRA GLOW / LIGHT EFFECT */}
                {/* Put blur glows or floating particles here */}
                {/* ========================================== */}

                {/* <View style={styles.webParentGlow} /> */}


                {/* ========================================== */}
                {/* 📝 TEXT CONTENT */}
                {/* Always stays ABOVE everything */}
                {/* ========================================== */}

                <View style={styles.webModernOverlay}>
                  <View style={styles.iconBadge}>
                    <Ionicons
                      name="people"
                      size={20}
                      color="#3B1E08"
                    />
                  </View>

                  <Text style={styles.roleTitleDark}>
                    I’m a parent
                  </Text>

                  <Text style={styles.roleDescriptionDark}>
                    Post jobs, browse helpers, and hire with
                    PESO-aligned verification.
                  </Text>
                </View>
              </Pressable>

              {/* HELPER */}
              <Pressable
                onPress={() => handleRoleSelect("helper")}
                style={({ pressed, hovered }: any) => [
                  styles.webModernHelperCard,
                  {
                    transform: [{ translateY: hovered ? -8 : 0 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >

                {/* ========================================== */}
                {/* 🎨 BACKGROUND CIRCLE / GLOW SHAPE */}
                {/* Put soft brown/white glow behind helper */}
                {/* ========================================== */}

                {/* <View style={styles.webHelperCircle} /> */}


                {/* ========================================== */}
                {/* 🖼️ DECORATIVE OBJECTS */}
                {/* Documents, badge, clipboard, floating UI */}
                {/* ========================================== */}

                {/*
                <Image
                  source={require("@/assets/landing/document.png")}
                  style={styles.webDocumentDecor}
                  contentFit="contain"
                />
                */}

                {/*
                <Image
                  source={require("@/assets/landing/badge.png")}
                  style={styles.webBadgeDecor}
                  contentFit="contain"
                />
                */}


                {/* ========================================== */}
                {/* 👩 MAIN CHARACTER IMAGE */}
                {/* ========================================== */}

                <Image
                  source={require("@/assets/landing/helper-role.png")}
                  style={styles.webModernImage}
                  contentFit="contain"
                />

                {/* ========================================== */}
                {/* ✨ OPTIONAL EXTRA LIGHT EFFECT */}
                {/* ========================================== */}

                {/* <View style={styles.webHelperGlow} /> */}


                {/* ========================================== */}
                {/* 📝 TEXT CONTENT */}
                {/* ========================================== */}

                <View style={styles.webModernOverlay}>
                  <View
                    style={[
                      styles.iconBadge,
                      { backgroundColor: "rgba(255,255,255,0.1)" },
                    ]}
                  >
                    <Ionicons
                      name="briefcase"
                      size={20}
                      color="white"
                    />
                  </View>

                  <Text style={styles.roleTitleLight}>
                    I’m a helper
                  </Text>

                  <Text style={styles.roleDescriptionLight}>
                    Build your profile, upload documents,
                    and apply to trusted employers.
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* FOOTER */}
            <View style={styles.webFooterContainer}>
              <Text style={styles.footerText}>
                Already registered?{" "}
                <Text
                  style={styles.signInLink}
                  onPress={() => router.push("/(auth)/login")}
                >
                  Sign in
                </Text>
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ==========================================
  // 📱 MOBILE DESIGN (UNCHANGED)
  // ==========================================
  return (
    <LinearGradient 
      colors={["#422919", "#2A1608", "#1A0D04"]} 
      style={styles.container}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <RadialGradient
          colors={["rgba(233, 102, 19, 0.25)", "rgba(42, 22, 8, 0)"]}
          locations={[0, 1]}
          cx="50%" cy="20%" rx="60%" ry="60%"
          style={styles.radialHighlight}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.backButtonContainer}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </Pressable>
            </View>
            <View style={styles.logoParentLayout}>
              <Logo />
              <View style={styles.carelinkWrapper}>
                <Text style={styles.carelink}>
                  <Text style={styles.care}>Care</Text>
                  <Text style={styles.link}>Link</Text>
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.getStarted}>GET STARTED</Text>
            <Text style={styles.mainTitle}>Choose your role</Text>
            <Text style={styles.subtitle}>This decides how CareLink guides you.</Text>
          </View>

          <View style={styles.cardsContainer}>

            <Pressable onPress={() => handleRoleSelect("parent")}>
              {({ pressed }) => (
                <View
                  style={[
                    styles.parentCard,
                    {
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >

                  {/* ========================================== */}
                  {/* 🎨 BACKGROUND CIRCLE / SHAPE */}
                  {/* Put large colored circle behind image */}
                  {/* Example: rgba(255,255,255,0.15) */}
                  {/* ========================================== */}

                  {/* <View style={styles.mobileParentCircle} /> */}


                  {/* ========================================== */}
                  {/* 🖼️ DECORATIVE OBJECTS */}
                  {/* Frames, toys, plants, stars, etc */}
                  {/* ========================================== */}

                  {/*
                  <Image
                    source={require("@/assets/landing/frame.png")}
                    style={styles.mobileFrameDecor}
                    contentFit="contain"
                  />
                  */}

                  {/*
                  <Image
                    source={require("@/assets/landing/star.png")}
                    style={styles.mobileStarDecor}
                    contentFit="contain"
                  />
                  */}


                  {/* ========================================== */}
                  {/* 👨‍👩‍👧 MAIN CHARACTER IMAGE */}
                  {/* ========================================== */}

                  <Image
                    source={require("@/assets/landing/family-role.png")}
                    style={styles.parentRoleImageRight}
                    contentFit="cover"
                  />

                  {/* ========================================== */}
                  {/* ✨ PRESS OVERLAY */}
                  {/* ========================================== */}

                  <View
                    style={[
                      styles.pressOverlay,
                      {
                        backgroundColor: pressed
                          ? "rgba(0,0,0,0.08)"
                          : "transparent",
                      },
                    ]}
                  />

                  {/* ========================================== */}
                  {/* 📝 TEXT CONTENT */}
                  {/* ========================================== */}

                  <View style={styles.cardOverlay}>
                    <View style={styles.iconBadge}>
                      <Ionicons name="people" size={20} color="#3B1E08" />
                    </View>

                    <Text style={styles.roleTitleDark}>I’m a parent</Text>

                    <Text style={styles.roleDescriptionDark}>
                      Post jobs, browse helpers, and hire with PESO-aligned verification.
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>

            <Pressable onPress={() => handleRoleSelect("helper")}>
              {({ pressed }) => (
                <View
                  style={[
                    styles.helperCard,
                    {
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >

                  {/* ========================================== */}
                  {/* 🎨 BACKGROUND CIRCLE / SHAPE */}
                  {/* Put soft glow behind helper image */}
                  {/* ========================================== */}

                  {/* <View style={styles.mobileHelperCircle} /> */}


                  {/* ========================================== */}
                  {/* 🖼️ DECORATIVE OBJECTS */}
                  {/* Documents, clipboard, badges, etc */}
                  {/* ========================================== */}

                  {/*
                  <Image
                    source={require("@/assets/landing/document.png")}
                    style={styles.mobileDocumentDecor}
                    contentFit="contain"
                  />
                  */}


                  {/* ========================================== */}
                  {/* 👩 MAIN CHARACTER IMAGE */}
                  {/* ========================================== */}

                  <Image
                    source={require("@/assets/landing/helper-role.png")}
                    style={styles.roleImageRight}
                    contentFit="cover"
                  />

                  {/* ========================================== */}
                  {/* ✨ PRESS OVERLAY */}
                  {/* ========================================== */}

                  <View
                    style={[
                      styles.pressOverlay,
                      {
                        backgroundColor: pressed
                          ? "rgba(255,255,255,0.05)"
                          : "transparent",
                      },
                    ]}
                  />

                  {/* ========================================== */}
                  {/* 📝 TEXT CONTENT */}
                  {/* ========================================== */}

                  <View style={styles.cardOverlay}>
                    <View
                      style={[
                        styles.iconBadge,
                        { backgroundColor: 'rgba(255,255,255,0.1)' }
                      ]}
                    >
                      <Ionicons
                        name="briefcase"
                        size={20}
                        color="white"
                      />
                    </View>

                    <Text style={styles.roleTitleLight}>I’m a helper</Text>

                    <Text style={styles.roleDescriptionLight}>
                      Build your profile, upload documents,
                      and apply to trusted employers.
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already registered? <Text style={styles.signInLink} onPress={() => router.push("/(auth)/login")}>Sign in</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
