// components/landing/LandingPage.tsx
import Vector from "@/assets/landing/Vector.svg";
import Logo from "@/components/branding/Logo";
import FrameComponent1 from "@/components/landing/FeatureSection";
import HeroBanner from "@/components/landing/HeroBanner";
import RadialGradient from "@/components/landing/RadialGradient";
import { Color, FontFamily, Height, Padding } from "@/constants/GlobalStyles";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const LandingPage = () => {
  return (
    <View style={{ flex: 1, backgroundColor: "#140a07" }}>
      {/* 1. Base Linear Gradient */}
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={["#7a5b37", "#140a07"]}
        locations={[0, 1]}
      />

      {/* 2. Radial Glow */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <RadialGradient
          style={{ opacity: 0.5 }}
          colors={["rgba(217, 138, 58, 0.5)", "rgba(217, 138, 58, 0)"]}
          cx="50%"
          cy="0%"
          rx="50%"
          ry="50%"
        />
      </View>

      {/* 3. Main Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.landingPageScrollViewContent}>
        
        {/* Header */}
        <View style={[styles.landingPageInner, styles.logoParentLayout]}>
          <View style={styles.frameParent}>
            <View style={[styles.logoParent, styles.logoParentFlexBox]}>
              <Logo />
              <View style={styles.carelinkWrapper}>
                <Text style={styles.carelink}>
                  <Text style={styles.care}>Care</Text>
                  <Text style={styles.link}>Link</Text>
                </Text>
              </View>
            </View>
            <View style={[styles.vectorWrapper, styles.logoParentFlexBox]}>
              <Vector style={styles.vectorIcon} width={25} height={25} />
            </View>
          </View>
        </View>

        {/* Hero Section & Features */}
        <View style={styles.frameGroup}>
          <HeroBanner />
          <FrameComponent1 />
        </View>
        
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  landingPageScrollViewContent: {
    flexDirection: "column",
    paddingHorizontal: 15,
    paddingTop: 38,
    paddingBottom: 10,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 10,
    flexGrow: 1,
    
  },
  logoParentLayout: {
    height: Height.height_50,
    flexDirection: "row",
  },
  logoParentFlexBox: {
    zIndex: 3,
    alignItems: "center",
    
  },
  landingPageInner: {
    width: "100%",
    paddingLeft: 11,
    alignItems: "flex-start",
    flexDirection: "row",
    height: Height.height_50,
  },
  frameParent: {
    
    width: "100%",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  logoParent: {
    
    gap: 10,
    flexDirection: "row",
    height: Height.height_50,
  },
  carelinkWrapper: {
    paddingTop: Padding.padding_9,
    alignItems: "flex-start",
  },
  carelink: {
    fontSize: 25,
    textAlign: "center",
    zIndex: 3,
    fontFamily: FontFamily.fredokaSemiBold,
  },
  care: {
    color: Color.colorWhite,
  },
  link: {
    color: Color.colorChocolate100,
  },
  vectorWrapper: {
    
    justifyContent: "flex-end",
    paddingBottom: 12,
    width: 25,
  },
  vectorIcon: {
    
    color: Color.colorSilver,
    width: 25,
    zIndex: 3,
  },
  frameGroup: {
    width: "100%",
    zIndex: 3,
    
    // 1. THIS IS THE MAGIC LINE:
    flex: 1, 
    
    // 2. This now has "space" to actually put "between" the components:
    justifyContent: "space-between", 
    
    // 3. Changed from flex-end to center/stretch so content doesn't hug the right wall
    alignItems: "center",
  },
});

export default LandingPage;