// components/peso/ui/ScreenHeader.tsx
// The consistent page header for every PESO screen: a softly-gradient band with
// two faint decorative blobs (so it's never a flat colour block), the title +
// subtitle, and an optional actions slot. Animated in on mount.

import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { usePesoTheme, radius, space, font } from '@/contexts/PesoThemeContext';

export function ScreenHeader({ eyebrow, title, subtitle, right, dense }: {
  eyebrow?: string; title: string; subtitle?: string; right?: React.ReactNode; dense?: boolean;
}) {
  const { c } = usePesoTheme();
  const blob = (style: ViewStyle) => (
    <View pointerEvents="none" style={[{ position: 'absolute', borderRadius: 999, backgroundColor: c.blob }, style]} />
  );
  return (
    <View style={{ overflow: 'hidden' }}>
      <LinearGradient colors={c.heroGrad as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: space.xl, paddingTop: dense ? space.lg : space.xl, paddingBottom: dense ? space.md : space.lg, borderBottomWidth: 1, borderBottomColor: c.line }}>
        {/* decorative soft shapes */}
        {blob({ width: 220, height: 220, top: -120, right: -40 })}
        {blob({ width: 120, height: 120, bottom: -70, right: 160, backgroundColor: c.accentSoft })}

        <MotiView from={{ opacity: 0, translateY: -8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 320 }}
          style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <View style={{ flexShrink: 1 }}>
            {!!eyebrow && <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: c.accentInk, marginBottom: 4 }}>{eyebrow}</Text>}
            <Text style={{ fontFamily: font.display, fontSize: 26, color: c.ink, letterSpacing: -0.5 }}>{title}</Text>
            {!!subtitle && <Text style={{ fontFamily: font.regular, fontSize: 13, color: c.muted, marginTop: 3, maxWidth: 640, lineHeight: 18 }}>{subtitle}</Text>}
          </View>
          {right && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{right}</View>}
        </MotiView>
      </LinearGradient>
    </View>
  );
}

/** A row that staggers its children in (use for stat tiles). */
export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{children}</View>;
}

export const layout = {
  page: (bg: string): ViewStyle => ({ flex: 1, backgroundColor: bg }),
  splitRow: { flex: 1, flexDirection: 'row', minHeight: 0 } as ViewStyle,
  leftPane: { flex: 1, minWidth: 0, minHeight: 0 } as ViewStyle,
  rightPane: (line: string, surface: string): ViewStyle => ({ width: 520, minHeight: 0, borderLeftWidth: 1, borderLeftColor: line, backgroundColor: surface }),
  flex1: { flex: 1, minHeight: 0 } as ViewStyle,
  pad: { padding: space.xl } as ViewStyle,
};
