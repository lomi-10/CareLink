import React from "react";
import { Image, type ImageStyle, type StyleProp, View, type ViewStyle } from "react-native";

const LOGO = require("../../assets/images/carelink_logo.png");

export type CareLinkLogoMarkProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

/** CareLink circular emblem — use in sidebars, headers, and auth screens. */
export function CareLinkLogoMark({ size = 44, style, containerStyle }: CareLinkLogoMarkProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          backgroundColor: "#fff",
        },
        containerStyle,
      ]}
    >
      <Image
        source={LOGO}
        accessibilityLabel="CareLink"
        style={[{ width: size, height: size }, style]}
        resizeMode="cover"
      />
    </View>
  );
}
