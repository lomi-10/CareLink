// components/peso/reports/Charts.tsx — lightweight SVG/View charts for the PESO
// Reports & Analytics dashboard. No external charting lib.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Polyline, Line } from 'react-native-svg';
import { theme } from '@/constants/theme';

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
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={theme.color.line} strokeWidth={stroke} fill="none" />
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
export function LineMini({ points, color = theme.color.peso, height = 120 }: { points: number[]; color?: string; height?: number }) {
  const W = 260, H = height, PAD = 16;
  const max = Math.max(1, ...points);
  const min = Math.min(0, ...points);
  const span = max - min || 1;
  const step = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: PAD + i * step,
    y: H - PAD - ((p - min) / span) * (H - PAD * 2),
  }));
  const poly = coords.map((c) => `${c.x},${c.y}`).join(' ');
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={theme.color.line} strokeWidth={1} />
      <Polyline points={poly} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => <Circle key={i} cx={c.x} cy={c.y} r={3} fill={color} />)}
    </Svg>
  );
}

// ── Horizontal bars ─────────────────────────────────────────────────────────
export function HBars({ items, color = theme.color.peso }: { items: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <View style={{ gap: 10 }}>
      {items.map((it) => (
        <View key={it.label} style={s.barRow}>
          <Text style={s.barLabel} numberOfLines={1}>{it.label}</Text>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${(it.value / max) * 100}%`, backgroundColor: color }]} />
          </View>
          <Text style={s.barValue}>{it.value} ({Math.round((it.value / total) * 100)}%)</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  donutValue: { fontSize: 22, fontWeight: '800', color: theme.color.ink },
  donutLabel: { fontSize: 11, color: theme.color.muted, fontWeight: '600', marginTop: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12.5, color: theme.color.ink, fontWeight: '600', flexShrink: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 120, fontSize: 12, color: theme.color.muted, fontWeight: '600' },
  barTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: theme.color.line, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7 },
  barValue: { width: 64, fontSize: 11.5, color: theme.color.muted, fontWeight: '700', textAlign: 'right' },
});
