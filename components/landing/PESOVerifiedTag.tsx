// components/landing/PESOVerifiedTag.tsx
import { Color, FontFamily, FontSize, Padding } from "@/constants/GlobalStyles";
import Secure_icon from "@/assets/landing/Secure_icon.svg"; // Import SVG as component!
import * as React from "react";
import { StyleSheet, Text, View } from "react-native"; // Remove Image import!

const PESOVerifiedTag = () => {
  return (
    <View style={styles.tagContainer}>
      <Secure_icon 
        style={styles.secureIcon} 
        width={16} // Use width/height props directly on the SVG component!
        height={16} 
      />
      <Text style={styles.tagText}>PESO-VERIFIED</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tagContainer: {
    backgroundColor: Color.colorBurlywood,
    borderRadius: 50,
    paddingHorizontal: 5,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    zIndex: 2,
    flexDirection: 'row', // Add row direction to put icon + text side by side!
    alignItems: 'center', // Center them vertically!
  },
  secureIcon: {
    marginRight: Padding.padding_4,
    zIndex: 0,
  },
  tagText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontWeight: "600",
    fontSize: FontSize.fs_12,
    color: '#3C250D',
    textAlign: "center",
  },
});

export default PESOVerifiedTag;