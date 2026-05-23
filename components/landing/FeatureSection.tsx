// components/landing/FeatureSection.tsx
import Secure from "@/assets/landing/Secure.svg";
import {
  Color,
  FontFamily,
  FontSize,
  Gap,
  Height,
  Padding,
  Width,
} from "@/constants/GlobalStyles";
import * as React from "react";
import { StyleSheet, Text, View } from "react-native";
import PesoLogo from "./PesoLogo";

const FrameComponent1 = () => {
  return (
    <View style={styles.frameWrapper}>
      <Text style={[styles.inPartnershipWith, styles.pesoOrmocTypo]}>
        In partnership with trusted agency
      </Text>
      
      <View style={styles.frameParent}>
        <View style={styles.frameGroup}>
          <PesoLogo />
          <Text style={[styles.pesoOrmoc, styles.pesoOrmocTypo]}>
            PESO ORMOC
          </Text>
        </View>

        <View style={styles.frameGroup}>
          <Secure width={Width.width_45} height={Height.height_45} />
          <Text style={[styles.pesoOrmoc, styles.pesoOrmocTypo]}>
            100% Secure
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frameWrapper: {
    width: "100%", // Fixed from 382
    alignItems: "center", // Center everything nicely
    gap: 15,
    paddingVertical: 20,
  },
  pesoOrmocTypo: {
    color: Color.colorBurlywood,
    fontFamily: FontFamily.fredokaRegular,
    fontSize: FontSize.fs_16,
  },
  inPartnershipWith: {
    textAlign: "center",
  },
  frameParent: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap", // If screen is tiny, they stack
    gap: 20,
  },
  frameGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pesoOrmoc: {
    textAlign: "left",
  },
});

export default FrameComponent1;