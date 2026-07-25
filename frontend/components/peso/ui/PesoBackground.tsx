// components/peso/ui/PesoBackground.tsx
// A soft, branded backdrop that sits behind every PESO screen so the canvas is
// never a flat colour block. Two low-opacity accent glows, a faint concentric-ring
// motif (echoing the round CareLink logo) and a whisper-fine dot grid. Purely
// decorative + non-interactive; theme-aware so it warms/cools with light/dark.

import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { usePesoTheme } from '@/contexts/PesoThemeContext';

export function PesoBackground() {
  const { c, dark } = usePesoTheme();
  const glow = dark ? 0.5 : 0.7;   // glows a touch stronger on the dark ground
  const ring = dark ? 0.05 : 0.045;
  const dot = dark ? 0.05 : 0.04;

  // A sparse dot grid — computed once.
  const dots = useMemo(() => {
    const arr: { x: number; y: number }[] = [];
    for (let y = 40; y < 900; y += 46) for (let x = 40; x < 1500; x += 46) arr.push({ x, y });
    return arr;
  }, []);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="g1" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.accent} stopOpacity={glow} />
            <Stop offset="1" stopColor={c.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="g2" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.accent2} stopOpacity={glow * 0.75} />
            <Stop offset="1" stopColor={c.accent2} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* dot grid */}
        {dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={1.4} fill={c.ink} opacity={dot} />
        ))}

        {/* soft accent glows */}
        <Circle cx="88%" cy="-40" r={260} fill="url(#g1)" opacity={0.5} />
        <Circle cx="4%" cy="94%" r={230} fill="url(#g2)" opacity={0.45} />

        {/* concentric-ring motif (echoes the logo) — top-right */}
        <Circle cx="82%" cy="70" r={150} stroke={c.accent} strokeWidth={1.2} opacity={ring} fill="none" />
        <Circle cx="82%" cy="70" r={104} stroke={c.accent} strokeWidth={1.2} opacity={ring} fill="none" />
        <Circle cx="82%" cy="70" r={60} stroke={c.accent} strokeWidth={1.2} opacity={ring} fill="none" />
      </Svg>
    </View>
  );
}
