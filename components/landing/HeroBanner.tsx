// components/landing/HeroBanner.tsx
import Ellipse4 from "@/assets/landing/Ellipse-4.svg";
import Ellipse51 from "@/assets/landing/Ellipse-5.svg";
import FrameComponent from "@/components/landing/HeroSection";
import PESOVerifiedTag from "@/components/landing/PESOVerifiedTag";
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
import { StyleSheet, Text, View } from "react-native";

const HeroBanner = () => {
  return (
    <LinearGradient
      style={[styles.rectangleParent, styles.frameChildLayout]}
      locations={[0, 0.58, 0.73, 0.91]}
      colors={["#fcdeb3", "#fcdeb3", "#cc9757", "#4c331a"]}
    >
      <View style={styles.frameContainer}>
        <View style={styles.pesoVerifiedTagParent}>
          <PESOVerifiedTag />
          <View style={[styles.frameWrapper, styles.frameWrapperLayout]}>
            <View style={[styles.trustedConnectionsBetterLiParent, styles.frameWrapperLayout]}>
              <Text style={[styles.trustedConnectionsBetterContainer, styles.carelinkConnectsFamiliesFlexBox]}>
                <Text style={styles.trustedConnectionsBetterContainer2}>
                  <Text style={styles.trustedConnections}>
                    Trusted {"\n"}Connections,{"\n"}
                  </Text>
                  <Text style={styles.betterLives}>Better Lives</Text>
                </Text>
              </Text>
              <View style={styles.line}>
                <View style={styles.frameItem} />
                <Ellipse4 style={styles.frameInner} width={3} height={3} />
              </View>
            </View>
          </View>
        </View>
        <View style={styles.carelinkConnectsFamiliesWitWrapper}>
          <Text style={[styles.carelinkConnectsFamilies, styles.carelinkConnectsFamiliesFlexBox]}>
            CareLink connects {"\n"}families with verified {"\n"}helpers - safely, {"\n"}quickly, and with {"\n"}peace of mind
          </Text>
        </View>
      </View>

      <View style={styles.hangingFrameParent}>
        <Image style={[styles.hangingFrameIcon, styles.wrapperPosition]} contentFit="cover" source={require("@/assets/landing/hanging-frame.png")} />
        <Image style={styles.brownChairIcon} contentFit="cover" source={require("@/assets/landing/brown-chair.png")} />
        <Image style={styles.plantIcon} contentFit="cover" source={require("@/assets/landing/Plant.png")} />
        
        <View style={[styles.vectorParent, styles.vectorParentLayout]}>
          <LinearGradient style={[styles.wrapper, styles.iconLayout]} locations={[0, 1]} colors={[Color.colorBurlywood, "#cc9757"]}>
            <Ellipse51 style={styles.iconLayout} />
          </LinearGradient>
          <Image 
          style={[styles.domesticHelplerImage, styles.vectorParentLayout]} contentFit="cover" source={require("@/assets/landing/domestic-helpler-image.png")} />
        </View>
        
      </View>

      <View style={styles.heroSectionWrapper}>
        <FrameComponent />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  frameChildLayout: {
    borderRadius: Border.br_30,
    width: "100%",
  },
  frameWrapperLayout: {
    height: Height.height_130,
    alignItems: "center",
  },
  carelinkConnectsFamiliesFlexBox: {
    alignItems: "center",
    display: "flex",
    textAlign: "left",
  },
  wrapperPosition: {
    position: "absolute",
  },
  vectorParentLayout: {
    width: "70%",
    aspectRatio: 261 / 355,
    position: "absolute",
  },
  iconLayout: {
    boxShadow: BoxShadow.shadow_drop,
    height: "100%",
    width: "100%",
  },
  rectangleParent: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 15,
    alignItems: "center",
    paddingHorizontal: Padding.padding_15,
    borderRadius: Border.br_30,
    width: "100%",
    height: "auto",
    overflow: "hidden", // Keeps the gradient inside the borders perfectly
  },
  frameContainer: {
    width: "100%",
    zIndex: 2,
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
    marginTop: 5,
    fontSize: 30,
    zIndex: 6,
    width: "100%",
    fontFamily: FontFamily.fredokaOne,
  },
  trustedConnectionsBetterContainer2: {
    width: "100%",
    fontFamily: FontFamily.fredokaSemiBold,
  },
  trustedConnections: {
    fontFamily: FontFamily.fredokaSemiBold,
    color: Color.colorGray,
  },
  betterLives: {
    fontFamily: FontFamily.fredokaSemiBold,
    color: Color.colorChocolate200,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
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
    top: "10%",
    width: "100%",
    aspectRatio: 410/508, 
    position: "absolute",
    zIndex: 2,
    left: 0,
    right: 0,
    alignItems: "flex-end",
  },
  hangingFrameIcon: {
    position: "absolute",
    top: "10%",
    right: "-10%",
    width: "43%",
    aspectRatio: 178 / 107,
    zIndex: 2,
    opacity: 0.4,
  },
  brownChairIcon: {
    top: "50%",
    width: "45%",
    aspectRatio: 185 / 245,
    zIndex: 6,
    left: 0,
    position: "absolute",
    opacity: 0.4,
  },
  plantIcon: {
    top: "53%",
    left: "19%",
    width: "24%",
    aspectRatio: 100 / 174,
    zIndex: 7,
    position: "absolute",
    opacity: 0.4,
  },
  vectorParent: {
    top: "22%",
    right: -15,
    width: "70%",
    aspectRatio: 261 / 355, // Keep the tall rectangle so the women fit perfectly
    position: "absolute",
    zIndex: 5,
  },
  wrapper: {
    position: "absolute",    
    right: "-20%",
    aspectRatio: 1, 
    borderRadius: 999,
    overflow: "hidden",
    zIndex: 5,
  },
  domesticHelplerImage: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: "100%",
    height: "55%",
    zIndex: 8,
    top: "16%",
  },
  frameInner: {
    left: "25%",
    position: "absolute",
  },
  heroSectionWrapper: {
    
    width: "100%",
    zIndex: 7,// This pulls the white box up into the images, fixing the gap!
  },
});

export default HeroBanner;