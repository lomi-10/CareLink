// components/landing/RadialGradient.tsx
import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import Svg, { Defs, RadialGradient as SvgRadialGradient, Rect, Stop } from "react-native-svg";

export type RadialGradientProps = {
  colors?: string[];
  locations?: number[];
  cx?: string;
  cy?: string;
  rx?: string;
  ry?: string;
  style?: StyleProp<ViewStyle>;
};

const RadialGradient = ({
  colors = [],
  locations = [],
  cx = "50%",
  cy = "50%",
  rx = "50%",
  ry = "50%",
  style,
}: RadialGradientProps) => {
  // Use a simple, non-random ID for testing
  const gradientId = "mainRadialGradient"; 

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <Svg height="100%" width="100%">
        <Defs>
          <SvgRadialGradient
            id={gradientId}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            gradientUnits="objectBoundingBox"
          >
            {colors.map((color, i) => (
              <Stop
                key={i}
                offset={locations[i] || i}
                stopColor={color.split(',').length > 3 ? color.replace(/[^,]+(?=\))/, '1') : color} // Strip alpha if needed
                stopOpacity={color.includes('rgba') ? color.split(',')[3].replace(')', '') : 1}
              />
            ))}
          </SvgRadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
};

export default RadialGradient;