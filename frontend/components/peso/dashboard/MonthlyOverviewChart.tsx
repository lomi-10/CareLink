// components/peso/dashboard/MonthlyOverviewChart.tsx
// "Monthly Overview" panel — 3 summary numbers + a hand-rolled SVG line chart
// of weekly placements (no chart library in this project; react-native-svg
// already is, so the line/area/points are drawn directly). Theme-aware.
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';

import { AnimateIn } from '@/components/peso/ui';
import { usePesoTheme, shadow, radius, font, type PesoColors } from '@/contexts/PesoThemeContext';
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
  const { c, dark } = usePesoTheme();
  const s = useMemo(() => makeStyles(c, dark), [c, dark]);

  const values = points.map((p) => p.placements);
  const max = Math.max(...values, 1);
  const innerW = CHART_W - PAD * 2;
  const innerH = CHART_H - PAD * 2;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? PAD + (i / (points.length - 1)) * innerW : PAD + innerW / 2;
    const y = PAD + innerH - (p.placements / max) * innerH;
    return { x, y };
  });
  const polylinePoints = coords.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const areaPoints = coords.length
    ? `${coords[0].x},${CHART_H - PAD} ${polylinePoints} ${coords[coords.length - 1].x},${CHART_H - PAD}`
    : '';

  return (
    <AnimateIn delay={200} style={s.panel}>
      <View style={s.headRow}>
        <Text style={s.panelTitle}>Monthly Overview</Text>
        <View style={s.periodChip}>
          <Text style={s.periodChipText}>This Month</Text>
        </View>
      </View>

      <View style={s.summaryRow}>
        <Summary value={placements} label="Placements" />
        <Summary value={applications} label="Applications" />
        <Summary value={interviews} label="Interviews" />
      </View>

      {points.length === 0 ? (
        <Text style={s.emptyText}>No placement activity in the last 6 weeks.</Text>
      ) : (
        <>
          <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
            <Defs>
              <LinearGradient id="moArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.accent} stopOpacity={0.28} />
                <Stop offset="1" stopColor={c.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Line x1={PAD} y1={CHART_H - PAD} x2={CHART_W - PAD} y2={CHART_H - PAD} stroke={c.line} strokeWidth={1} />
            {areaPoints ? <Polygon points={areaPoints} fill="url(#moArea)" /> : null}
            <Polyline points={polylinePoints} fill="none" stroke={c.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {coords.map((pt, i) => (
              <Circle key={i} cx={pt.x} cy={pt.y} r={i === coords.length - 1 ? 4.5 : 3.2} fill={c.accent} stroke={c.surface} strokeWidth={i === coords.length - 1 ? 2 : 0} />
            ))}
          </Svg>
          <View style={s.xLabelsRow}>
            {points.map((p) => (
              <Text key={p.week_label} style={s.xLabel}>{p.week_label}</Text>
            ))}
          </View>
        </>
      )}
    </AnimateIn>
  );
}

function Summary({ value, label }: { value: number; label: string }) {
  const { c, dark } = usePesoTheme();
  const s = useMemo(() => makeStyles(c, dark), [c, dark]);
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.summaryValue}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: PesoColors, dark: boolean) => StyleSheet.create({
  panel: {
    flex: 1, minWidth: 300, backgroundColor: c.surface, borderRadius: radius.lg,
    padding: 18, borderWidth: 1, borderColor: c.line, ...shadow('sm', dark),
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  panelTitle: { fontSize: 15, fontFamily: font.display, color: c.ink },
  periodChip: { backgroundColor: c.sunken, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: c.line },
  periodChipText: { fontSize: 11, fontFamily: font.semibold, color: c.muted },

  summaryRow: { flexDirection: 'row', marginBottom: 16 },
  summaryValue: { fontSize: 22, fontFamily: font.display, color: c.ink },
  summaryLabel: { fontSize: 11, color: c.muted, fontFamily: font.semibold },

  emptyText: { fontSize: 13, color: c.muted, textAlign: 'center', paddingVertical: 24, fontFamily: font.regular },
  xLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  xLabel: { fontSize: 9, color: c.subtle, fontFamily: font.regular },
});
