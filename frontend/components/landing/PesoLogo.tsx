// components/landing/PesoLogo.tsx
import Pesologoellipse from "@/assets/landing/peso-logo-ellipse.svg";
import { Color, Height, Width } from "@/constants/GlobalStyles";
import { Image } from "expo-image";
import * as React from "react";
import { StyleSheet, View } from "react-native";

const PesoLogo = () => {
  return (
    <View style={styles.pesoLogo}>
      <Pesologoellipse style={[styles.pesoLogoEllipse, styles.pesoPosition]} />
      <Image
        style={[styles.pesoOrmocLogo, styles.pesoPosition]}
        contentFit="cover"
        source={require("@/assets/landing/peso-ormoc-logo.png")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pesoPosition: {
    overflow: "hidden",
    maxWidth: "100%",
    left: "0%",
    right: "0%",
    width: "100%",
    position: "absolute",
  },
  pesoLogo: {
    width: Width.width_45,
    zIndex: 3,
    height: Height.height_45,
  },
  pesoLogoEllipse: {
    height: "100%",
    top: "0%",
    bottom: "0%",
    maxHeight: "100%",
    color: Color.colorBurlywood,
  },
  pesoOrmocLogo: {
    top: 0,
    zIndex: 1,
    height: Height.height_45,
  },
});

export default PesoLogo;