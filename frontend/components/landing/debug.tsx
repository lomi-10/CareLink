// components/landing/LandingPage.tsx
import Ellipse4 from "@/assets/landing/Ellipse-4.svg";
import Ellipse51 from "@/assets/landing/Ellipse-5.svg";
import Vector from "@/assets/landing/Vector.svg";
import Logo from "@/components/branding/Logo";
import FrameComponent1 from "@/components/landing/FeatureSection";
import FrameComponent from "@/components/landing/HeroSection";
import PESOVerifiedTag from "@/components/landing/PESOVerifiedTag";
import RadialGradient from "@/components/landing/RadialGradient";
import {
  Border,
  BoxShadow,
  Color,
  FontFamily,
  FontSize,
  Height,
  Padding,
} from "@/constants/GlobalStyles";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

const LandingPage = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  return (
    // 1. The Root Background Gradient stays here
    <View style={{flex: 1, backgroundColor: "#140a07"}}>
      {/* 1. Base Linear Gradient */}
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={["#7a5b37", "#140a07"]}
        locations={[0, 1]}
      />

      {/* 2. Radial Glow (The Orange "Spotlight") */}
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

      {/* 3. The ScrollView now only contains actual content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.landingPageScrollViewContent}
      >
        
        {/* DELETED the useless empty mainGradient here */}

        {/* Logo and Vector Header*/}
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
            {/* Vector Icon*/}
            <View style={[styles.vectorWrapper, styles.logoParentFlexBox]}>
              <Vector style={styles.vectorIcon} width={25} height={25} />
            </View>
          </View>
        </View>

        <View style={styles.frameGroup}>
          <LinearGradient
            style={[styles.rectangleParent, styles.frameChildLayout]}
            locations={[0, 0.58, 0.73, 0.91]}
            colors={["#fcdeb3", "#fcdeb3", "#cc9757", "#4c331a"]}
          >
            
            {/* DELETED the useless frameChild with display: "none" here */}

            <View style={styles.frameContainer}>
              <View style={styles.pesoVerifiedTagParent}>
                <PESOVerifiedTag />
                <View style={[styles.frameWrapper, styles.frameWrapperLayout]}>
                  <View
                    style={[
                      styles.trustedConnectionsBetterLiParent,
                      styles.frameWrapperLayout,
                    ]}
                  >
                    <Text 
                      style={[
                        styles.trustedConnectionsBetterContainer,
                        styles.carelinkConnectsFamiliesFlexBox,
                      ]}
                    >
                      <Text style={styles.trustedConnectionsBetterContainer2}>
                        <Text style={styles.trustedConnections}>
                          Trusted Connections,{"\n"}
                        </Text>
                        <Text style={styles.betterLives}>
                          Better Lives
                        </Text>
                      </Text>
                    </Text>
                    <View style={styles.frameItem} />
                  </View>
                </View>
              </View>
              <View style={styles.carelinkConnectsFamiliesWitWrapper}>
                <Text
                  style={[
                    styles.carelinkConnectsFamilies,
                    styles.carelinkConnectsFamiliesFlexBox,
                  ]}
                >
                  CareLink connects families with verified helpers - safely,
                  quickly, and with peace of mind
                </Text>
              </View>
            </View>
            
            <View style={styles.hangingFrameParent}>
              <Image
                style={[styles.hangingFrameIcon, styles.wrapperPosition]}
                contentFit="cover"
                source={require("@/assets/landing/hanging-frame.png")}
              />
              <Image
                style={styles.brownChairIcon}
                contentFit="cover"
                source={require("@/assets/landing/brown-chair.png")}
              />
              <Image
                style={styles.plantIcon}
                contentFit="cover"
                source={require("@/assets/landing/Plant.png")}
              />
              <View style={[styles.vectorParent, styles.vectorParentLayout]}>
                <LinearGradient
                  style={[styles.wrapper, styles.iconLayout]}
                  locations={[0, 1]}
                  colors={[Color.colorBurlywood, "#cc9757"]}
                >
                  <Ellipse51 style={styles.iconLayout} />
                </LinearGradient>
                <Image
                  style={[
                    styles.domesticHelplerImage,
                    styles.vectorParentLayout,
                  ]}
                  contentFit="cover"
                  source={require("@/assets/landing/domestic-helpler-image.png")}
                />
              </View>
              <Ellipse4 style={styles.frameInner} width={3} height={3} />
            </View>
            <FrameComponent />
          </LinearGradient>
          <FrameComponent1 />
        </View>
      </ScrollView>
      
    </View>
  );
};

const styles = StyleSheet.create({
  webShell: { flex: 1, backgroundColor: "#0F172A" },
  landingPageScrollViewContent: {
    flexDirection: "column",
    paddingHorizontal: 15,
    paddingTop: 38,
    paddingBottom: 17,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 34,
    flexGrow: 1,
  },
  landingPageLayout: {
    maxWidth: "100%",
    flex: 1,
    backgroundColor: "transparent",
    width: "100%",
  },
  logoParentLayout: {
    height: Height.height_50,
    flexDirection: "row",
  },
  logoParentFlexBox: {
    zIndex: 3,
    alignItems: "center",
  },
  frameChildLayout: {
    borderRadius: Border.br_30,
    width: "100%",
    backgroundColor: "transparent",
  },
  frameWrapperLayout: {
    height: Height.height_130,
    alignItems: "flex-start",
  },
  carelinkConnectsFamiliesFlexBox: {
    alignItems: "center",
    display: "flex",
    textAlign: "left",
  },
  wrapperPosition: {
    top: 0,
    position: "absolute",
  },
  vectorParentLayout: {
    width: "70%",
    aspectRatio: 261/355,
    position: "absolute",
  },
  iconLayout: {
    boxShadow: BoxShadow.shadow_drop,
    height: "100%",
    backgroundColor: "transparent",
    width: "100%",
  },
  landingPage: {
    backgroundColor: "transparent",
  },
  keyboardawarescrollview: {
    backgroundColor: "transparent",
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
    gap: 20,
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexDirection: "row",
    height: Height.height_50,
  },
  logoParent: {
    gap: 10,
    flexDirection: "row",
    height: Height.height_50,
  },
  carelinkWrapper: {
    height: 39,
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
    height: 37,
    justifyContent: "flex-end",
    paddingBottom: 12,
    width: 25,
  },
  vectorIcon: {
    height: 25,
    color: Color.colorSilver,
    width: 25,
    zIndex: 3,
  },
  frameGroup: {
    width: "100%",
    zIndex: 3,
    alignItems: "center",
  },
  rectangleParent: {
    paddingTop: 29,
    paddingBottom: 17,
    paddingHorizontal: Padding.padding_15,
    borderRadius: Border.br_30,
    width: "100%", 
    height: "auto",
    
  },
  frameContainer: {
    gap: 28,
    width: "100%",
    alignItems: "flex-start",
    
  },
  pesoVerifiedTagParent: {
    zIndex: 2,
    width: "100%",
    alignItems: "flex-start",
  },
  frameWrapper: {
    paddingLeft: Padding.padding_6,
    width: "100%",
    flexDirection: "row",
    
  },
  trustedConnectionsBetterLiParent: {
    zIndex: 6,
    paddingBottom: 2,
    width: "100%",
  },
  trustedConnectionsBetterContainer: {
    fontSize: 30,
    zIndex: 6,
    width: "100%",
    fontFamily: FontFamily.fredokaOne,
  },
  trustedConnectionsBetterContainer2: {
    width: "100%",
    fontFamily: FontFamily.fredokaOne,
  },
  trustedConnections: {
    fontFamily: FontFamily.fredokaOne,
    color: Color.colorGray,
    
  },
  betterLives: {
    fontFamily: FontFamily.fredokaRegular,
    color: Color.colorChocolate200,
  },
  frameItem: {
    width: 58,
    height: 2,
    borderStyle: "solid",
    borderColor: Color.colorChocolate200,
    borderTopWidth: 2,
    zIndex: 7,
  },
  carelinkConnectsFamiliesWitWrapper: {
    zIndex: 9,
    width: "100%",
    paddingLeft: 5,
    alignItems: "flex-start",
    flexDirection: "row",
  },
  carelinkConnectsFamilies: {
    width: "100%",
    fontSize: FontSize.fs_14,
    fontFamily: FontFamily.fredokaRegular,
    color: Color.colorBlack,
    zIndex: 9,
  },
  hangingFrameParent: {
    top: 92,
    width: "100%",
    aspectRatio: 410/508,
    left: 0,
    right: 0,
    position: "absolute",
  },
  hangingFrameIcon: {
    right: 0,
    width: "43%",
    aspectRatio: 178/107,
    zIndex: 4,
    opacity: 0.9,
  },
  brownChairIcon: {
    top: "50%",
    width: "45%",
    aspectRatio: 185/245,
    zIndex: 6,
    left: 0,
    position: "absolute",
    opacity: 0.95,
  },
  plantIcon: {
    top: "53%",
    left: "19%",
    width: "24%",
    aspectRatio: 100/174,
    zIndex: 7,
    position: "absolute",
    opacity: 0.9,
  },
  vectorParent: {
    top: "13%",
    left: "36%",
    width: "64%",
    aspectRatio: 261/355,
  },
  wrapper: {
    zIndex: 5,
    left: 0,
    top: 0,
    position: "absolute",
  },
  domesticHelplerImage: {
    top: "14%",
    height: "73%",
    zIndex: 8,
    left: 0,
    opacity: 1,
  },
  frameInner: {
    top: "20%",
    left: "22%",
    width: 3,
    height: 3,
    zIndex: 7,
    color: Color.colorChocolate200,
    position: "absolute",
  },
});

export default LandingPage;