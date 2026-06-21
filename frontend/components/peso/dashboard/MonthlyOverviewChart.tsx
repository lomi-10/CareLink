// components/peso/dashboard/MonthlyOverviewChart.tsx
// "Monthly Overview" panel — 3 summary numbers + a hand-rolled SVG line chart
// of weekly placements (no chart library in this project; react-native-svg
// already is, so the line/points are drawn directly).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { theme } from '@/constants/theme';
import type { MonthlyOverviewPoint } from '@/lib/pesoDashboardApi';

const CHART_W = 280;
const CHART_H = 110;
const PAD = 10;

type Props = {
  points: MonthlyOverviewPoint[];
  placements: number;
  applications: number;
  interviews: number;
};

export function MonthlyOverviewChart({ points, placements, applications, interviews }: Props) {
  const values = points.map((p) => p.placements);
  const max = Math.max(...values, 1);
  const innerW = CHART_W - PAD * 2;
  const innerH = CHART_H - PAD * 2;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? PAD + (i / (points.length - 1)) * innerW : PAD + innerW / 2;
    const y = PAD + innerH - (p.placements / max) * innerH;
    return { x, y };
  });
  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <View style={s.panel}>
      <View style={s.headRow}>
        <Text style={s.panelTitle}>Monthly Overview</Text>
        <View style={s.periodChip}>
          <Text style={s.periodChipText}>This Month</Text>
        </View>
      </View>

      <View style={s.summaryRow}>
        <Summary value={placements} label="Placements" sub="Successful Placements" />
        <Summary value={applications} label="Applications" sub="Total Applications" />
        <Summary value={interviews} label="Interviews" sub="Total Interviews" />
      </View>

      {points.length === 0 ? (
        <Text style={s.emptyText}>No placement activity in the last 6 weeks.</Text>
      ) : (
        <>
          <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
            <Line x1={PAD} y1={CHART_H - PAD} x2={CHART_W - PAD} y2={CHART_H - PAD} stroke={theme.color.line} strokeWidth={1} />
            <Polyline points={polylinePoints} fill="none" stroke={theme.color.peso} strokeWidth={2.5} />
            {coords.map((c, i) => (
              <Circle key={i} cx={c.x} cy={c.y} r={3.5} fill={theme.color.peso} />
            ))}
          </Svg>
          <View style={s.xLabelsRow}>
            {points.map((p) => (
              <Text key={p.week_label} style={s.xLabel}>{p.week_label}</Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function Summary({ value, label, sub }: { value: number; label: string; sub: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.summaryValue}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    flex: 1, minWidth: 300, backgroundColor: theme.color.surfaceElevated, borderRadius: theme.radius.lg,
    padding: 18, borderWidth: 1, borderColor: theme.color.line, ...theme.shadow.card,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  panelTitle: { fontSize: 15, fontWeight: '800', color: theme.color.ink },
  periodChip: { backgroundColor: theme.color.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.color.line },
  periodChipText: { fontSize: 11, fontWeight: '700', color: theme.color.muted },

  summaryRow: { flexDirection: 'row', marginBottom: 16 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: theme.color.ink },
  summaryLabel: { fontSize: 11, color: theme.color.muted, fontWeight: '600' },

  emptyText: { fontSize: 13, color: theme.color.muted, textAlign: 'center', paddingVertical: 24 },
  xLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  xLabel: { fontSize: 9, color: theme.color.subtle },
});
