// components/branding/Logo.tsx
import Ellipse1 from "@/assets/landing/Ellipse-1.svg";
import { Color, Height } from "@/constants/GlobalStyles";
import { Image } from "expo-image";
import * as React from "react";
import { StyleSheet, View } from "react-native";

const Logo = () => {
  return (
    <View style={styles.logo}>
      <Ellipse1 style={[styles.logoChild, styles.logoChildLayout]} />
      <Image
        style={[styles.logo1Icon, styles.logoChildLayout]}
        contentFit="cover"
        source={require("@/assets/landing/logo-1.png")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logoChildLayout: {
    overflow: "hidden",
    maxWidth: "100%",
    position: "absolute",
  },
  logo: {
    height: Height.height_50,
    width: 50,
    zIndex: 3,
  },
  logoChild: {
    height: "90.2%",
    width: "89.66%",
    top: "6.2%",
    right: "5.57%",
    bottom: "3.6%",
    left: "4.77%",
    maxHeight: "100%",
    color: Color.colorGainsboro,
    zIndex: 2,
  },
  logo1Icon: {
    width: "100%",
    height: "100%",
    zIndex: 3,
  },
});

export default Logo;