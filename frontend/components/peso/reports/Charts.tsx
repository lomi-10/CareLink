// components/peso/reports/Charts.tsx — lightweight SVG/View charts for the PESO
// Reports & Analytics dashboard. No external charting lib. Theme-aware (light/dark).
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Polyline, Line } from 'react-native-svg';
import { usePesoTheme, font, type PesoColors } from '@/contexts/PesoThemeContext';

export type Segment = { label: string; value: number; color: string };

// ── Donut (stacked arc segments) ────────────────────────────────────────────
export function Donut({
  segments, size = 130, stroke = 18, centerValue, centerLabel,
}: {
  segments: Segment[];
  size?: number;
  stroke?: number;
  centerValue?: string;
  centerLabel?: string;
}) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((sum, x) => sum + x.value, 0) || 1;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={c.sunken} strokeWidth={stroke} fill="none" />
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * circ;
          const el = (
            <Circle
              key={i}
              cx={cx} cy={cy} r={r}
              stroke={seg.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              rotation={-90}
              origin={`${cx}, ${cy}`}
            />
          );
          offset += dash;
          return el;
        })}
      </Svg>
      {(centerValue || centerLabel) ? (
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {centerValue ? <Text style={s.donutValue}>{centerValue}</Text> : null}
            {centerLabel ? <Text style={s.donutLabel}>{centerLabel}</Text> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function Legend({ segments, suffix }: { segments: Segment[]; suffix?: (s: Segment) => string }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={{ gap: 8 }}>
      {segments.map((seg) => (
        <View key={seg.label} style={s.legendRow}>
          <View style={[s.dot, { backgroundColor: seg.color }]} />
          <Text style={s.legendLabel} numberOfLines={1}>{suffix ? suffix(seg) : `${seg.value} ${seg.label}`}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Mini line chart ─────────────────────────────────────────────────────────
export function LineMini({ points, color, height = 120 }: { points: number[]; color?: string; height?: number }) {
  const { c } = usePesoTheme();
  const col = color ?? c.accent;
  const W = 260, H = height, PAD = 16;
  const max = Math.max(1, ...points);
  const min = Math.min(0, ...points);
  const span = max - min || 1;
  const step = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: PAD + i * step,
    y: H - PAD - ((p - min) / span) * (H - PAD * 2),
  }));
  const poly = coords.map((pt) => `${pt.x},${pt.y}`).join(' ');
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={c.line} strokeWidth={1} />
      <Polyline points={poly} fill="none" stroke={col} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((pt, i) => <Circle key={i} cx={pt.x} cy={pt.y} r={i === coords.length - 1 ? 4.5 : 3} fill={col} stroke={c.surface} strokeWidth={i === coords.length - 1 ? 2 : 0} />)}
    </Svg>
  );
}

// ── Horizontal bars ─────────────────────────────────────────────────────────
export function HBars({ items, color }: { items: { label: string; value: number }[]; color?: string }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const col = color ?? c.accent;
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1;
  return (
    <View style={{ gap: 10 }}>
      {items.map((it) => (
        <View key={it.label} style={s.barRow}>
          <Text style={s.barLabel} numberOfLines={1}>{it.label}</Text>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${(it.value / max) * 100}%`, backgroundColor: col }]} />
          </View>
          <Text style={s.barValue}>{it.value} ({Math.round((it.value / total) * 100)}%)</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  donutValue: { fontSize: 22, fontFamily: font.display, color: c.ink },
  donutLabel: { fontSize: 11, color: c.muted, fontFamily: font.semibold, marginTop: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12.5, color: c.ink, fontFamily: font.regular, flexShrink: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 120, fontSize: 12, color: c.muted, fontFamily: font.semibold },
  barTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: c.sunken, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7 },
  barValue: { width: 64, fontSize: 11.5, color: c.muted, fontFamily: font.semibold, textAlign: 'right' },
});
