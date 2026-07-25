// components/peso/ui/PesoBackground.tsx
// The branded backdrop behind every PESO screen so the canvas is never plain.
// Light mode uses the uploaded warm botanical artwork (assets/admin/peso-admin-bg)
// softened by an overlay so content stays readable; dark mode keeps a warm brown
// ground with two orange accent glows (the artwork is a light cream design that
// doesn't suit the dark theme). Purely decorative + non-interactive.

import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { usePesoTheme } from '@/contexts/PesoThemeContext';

const BG_ART = require('../../../assets/admin/peso-admin-bg.png');
const FILL = { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 };

export function PesoBackground() {
  const { c, dark } = usePesoTheme();

  if (!dark) {
    return (
      <View pointerEvents="none" style={[FILL, { overflow: 'hidden' }]}>
        <Image source={BG_ART} style={FILL} contentFit="cover" transition={200} />
        {/* soften the artwork so cards/text stay crisp on top */}
        <LinearGradient colors={['rgba(251,246,238,0.42)', 'rgba(251,246,238,0.64)']} style={FILL} />
      </View>
    );
  }

  // Dark: warm ground + two orange glows.
  return (
    <View pointerEvents="none" style={[FILL, { overflow: 'hidden' }]}>
      <Svg width="100%" height="100%" style={FILL} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="pg1" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.accent} stopOpacity={0.5} />
            <Stop offset="1" stopColor={c.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="pg2" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.accent2} stopOpacity={0.36} />
            <Stop offset="1" stopColor={c.accent2} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="88%" cy="-30" r={260} fill="url(#pg1)" />
        <Circle cx="3%" cy="96%" r={230} fill="url(#pg2)" />
        <Circle cx="82%" cy="72" r={150} stroke={c.accent} strokeWidth={1.2} opacity={0.06} fill="none" />
        <Circle cx="82%" cy="72" r={104} stroke={c.accent} strokeWidth={1.2} opacity={0.06} fill="none" />
        <Circle cx="82%" cy="72" r={60} stroke={c.accent} strokeWidth={1.2} opacity={0.06} fill="none" />
      </Svg>
    </View>
  );
}
