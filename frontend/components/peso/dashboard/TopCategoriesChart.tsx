// components/peso/dashboard/TopCategoriesChart.tsx
// "Top Job Categories" donut chart — % share of open/filled job posts.
// Hand-rolled with react-native-svg (stacked Circle segments), same approach
// as the CircularProgress ring used elsewhere in the app.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { useRouter } from 'expo-router';

import { theme } from '@/constants/theme';
import type { TopCategoryShare } from '@/lib/pesoDashboardApi';

const COLORS = ['#2563EB', '#34C759', '#FF9500', '#9333EA', '#DC2626'];
const SIZE = 130;
const STROKE = 18;

export function TopCategoriesChart({ categories, router }: { categories: TopCategoryShare[]; router: ReturnType<typeof useRouter> }) {
  const r = (SIZE - STROKE) / 2;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const circumference = 2 * Math.PI * r;

  let cumulativePct = 0;
  const segments = categories.map((cat, i) => {
    const segLen = (cat.pct / 100) * circumference;
    const dashOffset = -(cumulativePct / 100) * circumference;
    cumulativePct += cat.pct;
    return { ...cat, color: COLORS[i % COLORS.length], segLen, dashOffset };
  });

  return (
    <View style={s.panel}>
      <Text style={s.panelTitle}>Top Job Categories</Text>

      {categories.length === 0 ? (
        <Text style={s.emptyText}>No open job posts to categorize yet.</Text>
      ) : (
        <View style={s.body}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle cx={cx} cy={cy} r={r} stroke={theme.color.line} strokeWidth={STROKE} fill="none" />
            {segments.map((seg) => (
              <Circle
                key={seg.category_name}
                cx={cx} cy={cy} r={r}
                stroke={seg.color}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${seg.segLen} ${circumference - seg.segLen}`}
                strokeDashoffset={seg.dashOffset}
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

      <TouchableOpacity onPress={() => router.push('/(peso)/reports' as never)} activeOpacity={0.7}>
        <Text style={s.viewAll}>View full report →</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    flex: 1, minWidth: 260, backgroundColor: theme.color.surfaceElevated, borderRadius: theme.radius.lg,
    padding: 18, borderWidth: 1, borderColor: theme.color.line, ...theme.shadow.card,
  },
  panelTitle: { fontSize: 15, fontWeight: '800', color: theme.color.ink, marginBottom: 14 },
  emptyText: { fontSize: 13, color: theme.color.muted, textAlign: 'center', paddingVertical: 24 },
  body: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 12, color: theme.color.ink, fontWeight: '600' },
  legendPct: { fontSize: 12, fontWeight: '700', color: theme.color.muted },
  viewAll: { fontSize: 12, fontWeight: '700', color: theme.color.peso },
});
