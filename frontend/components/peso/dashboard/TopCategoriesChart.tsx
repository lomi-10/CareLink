// components/peso/dashboard/TopCategoriesChart.tsx
// "Top Job Categories" donut chart — % share of open/filled job posts.
// Hand-rolled with react-native-svg (stacked Circle segments). Theme-aware, with
// an orange-led palette so it reads as CareLink.
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { useRouter } from 'expo-router';

import { AnimateIn } from '@/components/peso/ui';
import { usePesoTheme, shadow, radius, font, type PesoColors } from '@/contexts/PesoThemeContext';
import type { TopCategoryShare } from '@/lib/pesoDashboardApi';

const SIZE = 130;
const STROKE = 18;

export function TopCategoriesChart({ categories, router }: { categories: TopCategoryShare[]; router: ReturnType<typeof useRouter> }) {
  const { c, dark } = usePesoTheme();
  const s = useMemo(() => makeStyles(c, dark), [c, dark]);
  const palette = useMemo(() => [c.accent, c.ok, c.info, '#8B6FE0', c.bad], [c]);

  const r = (SIZE - STROKE) / 2;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const circumference = 2 * Math.PI * r;

  let cumulativePct = 0;
  const segments = categories.map((cat, i) => {
    const segLen = (cat.pct / 100) * circumference;
    const dashOffset = -(cumulativePct / 100) * circumference;
    cumulativePct += cat.pct;
    return { ...cat, color: palette[i % palette.length], segLen, dashOffset };
  });

  return (
    <AnimateIn delay={260} style={s.panel}>
      <Text style={s.panelTitle}>Top Job Categories</Text>

      {categories.length === 0 ? (
        <Text style={s.emptyText}>No open job posts to categorize yet.</Text>
      ) : (
        <View style={s.body}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle cx={cx} cy={cy} r={r} stroke={c.sunken} strokeWidth={STROKE} fill="none" />
            {segments.map((seg) => (
              <Circle
                key={seg.category_name}
                cx={cx} cy={cy} r={r}
                stroke={seg.color}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${seg.segLen} ${circumference - seg.segLen}`}
                strokeDashoffset={seg.dashOffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${cx}, ${cy}`}
              />
            ))}
          </Svg>
          <View style={{ flex: 1, marginLeft: 16 }}>
            {segments.map((seg) => (
              <View key={seg.category_name} style={s.legendRow}>
                <View style={[s.legendDot, { backgroundColor: seg.color }]} />
                <Text style={s.legendLabel} numberOfLines={1}>{seg.category_name}</Text>
                <Text style={s.legendPct}>{seg.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable onPress={() => router.push('/(peso)/reports' as never)}>
        {({ hovered }: any) => <Text style={[s.viewAll, hovered && { color: c.accentInk }]}>View full report →</Text>}
      </Pressable>
    </AnimateIn>
  );
}

const makeStyles = (c: PesoColors, dark: boolean) => StyleSheet.create({
  panel: {
    flex: 1, minWidth: 260, backgroundColor: c.surface, borderRadius: radius.lg,
    padding: 18, borderWidth: 1, borderColor: c.line, ...shadow('sm', dark),
  },
  panelTitle: { fontSize: 15, fontFamily: font.display, color: c.ink, marginBottom: 14 },
  emptyText: { fontSize: 13, color: c.muted, textAlign: 'center', paddingVertical: 24, fontFamily: font.regular },
  body: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 12, color: c.ink, fontFamily: font.regular },
  legendPct: { fontSize: 12, fontFamily: font.semibold, color: c.muted },
  viewAll: { fontSize: 12, fontFamily: font.semibold, color: c.accent },
});
