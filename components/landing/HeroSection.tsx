// components/landing/HeroSection.tsx
import F7person3 from "@/assets/landing/f7-person-3.svg";
import Mdiclockoutline from "@/assets/landing/mdi-clock-outline.svg";
import Sishieldverifiedline from "@/assets/landing/si-shield-verified-line.svg";
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Gap,
  Height,
  Padding,
  Width,
} from "@/constants/GlobalStyles";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const FrameComponent = () => {
  const router = useRouter();
  return (
    <View style={styles.rectangleParent}>
      <View style={[styles.verifiedContainerParent, styles.verifiedWrapperFlexBox]}>
        
        {/* Item 1 */}
        <View style={[styles.verifiedContainer, styles.frameParentFlexBox]}>
          <Sishieldverifiedline width={Width.width_40} height={Height.height_40} />
          <Text style={[styles.verifiedHelpers, styles.helpersFlexBox]}>Verified Helpers</Text>
          <Text style={[styles.allHelpersAre, styles.findOrHireTypo]}>
            All helpers are PESO-verified and DOLE-ready.
          </Text>
        </View>

        <View style={styles.frameItem} />

        {/* Item 2 */}
        <View style={[styles.verifiedContainer, styles.frameParentFlexBox]}>
          <F7person3 width={Width.width_40} height={Height.height_40} />
          <Text style={[styles.verifiedHelpers, styles.helpersFlexBox]}>Trusted by Families</Text>
          <Text style={[styles.allHelpersAre, styles.findOrHireTypo]}>
            Thousand of families hire with confidence.
          </Text>
        </View>

        <View style={styles.frameItem} />

        {/* Item 3 */}
        <View style={[styles.verifiedContainer, styles.frameParentFlexBox]}>
          <Mdiclockoutline width={Width.width_40} height={Height.height_40} />
          <Text style={[styles.verifiedHelpers, styles.helpersFlexBox]}>Fast & Easy</Text>
          <Text style={[styles.allHelpersAre, styles.findOrHireTypo]}>
            Simple steps to find the right match.
          </Text>
        </View>

      </View>

      {/* Interactive Button */}
      <Pressable 
        style={styles.pressable} 
        onPress={() => router.push("/(auth)/role-selection")}
      >
        {({ pressed }) => (
          <LinearGradient
            style={[
              styles.buttonStartNow,
              // Optional: Adds a slight "pressed" scale effect
              { transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            locations={[0, 1]}
            // Switch colors when pressed: Darker orange/brown when active
            colors={pressed ? ["#bd510f", "#a34308"] : ["#e96613", "#d4580b"]}
          >
            <Text style={[styles.startNow, styles.startNowFlexBox]}>Start Now</Text>
            <Text style={[styles.findOrHire, styles.startNowFlexBox]}>
              Find or hire the right match today.
            </Text>
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  // Removed unneeded layouts and flexboxes
  rectangleParent: {
    paddingTop: 15,
    paddingBottom: 15,
    gap: 10,
    paddingHorizontal: Padding.padding_15,
    backgroundColor: Color.colorAntiquewhite,
    borderRadius: Border.br_30,
    width: "100%", // Changed from fixed 369
    height: "auto", // Changed from fixed 251
  },
  verifiedContainerParent: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  verifiedContainer: {
    flex: 1, // Let items share space equally
    alignItems: "center",
    gap: 5,
  },
  frameItem: {
    width: 1,
    height: "80%",
    backgroundColor: Color.colorNavajowhite,
    alignSelf: "center",
  },
  helpersFlexBox: {
    textAlign: "center",
    color: Color.colorGray,
  },
  findOrHireTypo: {
    fontFamily: FontFamily.fredokaLight,
    fontWeight: "300",
    fontSize: FontSize.fs_10,
    textAlign: "center",
    color: Color.colorGray,
  },
  verifiedHelpers: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontWeight: "600",
    fontSize: FontSize.fs_12,
  },
  allHelpersAre: {
    width: "100%", 
  },
  pressable: {
    width: "100%",
  },
  buttonStartNow: {
    paddingVertical: Padding.padding_14,
    paddingHorizontal: Padding.padding_15,
    width: "100%",
    borderRadius: Border.br_15,
    alignItems: "flex-start",
  },
  startNowFlexBox: {
    textAlign: "left",
    color: Color.colorWhite,
  },
  startNow: {
    fontSize: FontSize.fs_14,
    fontFamily: FontFamily.fredokaSemiBold,
    fontWeight: "600",
  },
  findOrHire: {
    fontFamily: FontFamily.fredokaLight,
    fontWeight: "300",
    fontSize: FontSize.fs_10,
  },
  frameParentFlexBox: {
    alignItems: "center",
  },
  verifiedWrapperFlexBox: {
    flexDirection: "row",
  }
});

export default FrameComponent;