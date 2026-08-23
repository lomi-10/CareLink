// components/peso/ui/primitives.tsx
// The shared building blocks for every PESO screen. Theme-aware (light/dark via
// usePesoTheme), animated (entrance + hover + press), and consistent so the portal
// reads as one product. Build screens out of THESE, not raw Views, and the polish
// comes for free.

import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePesoTheme, shadow, radius, space, font } from '@/contexts/PesoThemeContext';

const tap = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };

// ── AnimateIn — fade + rise on mount, for staggering any block in ────────────
export function AnimateIn({ children, delay = 0, from = 'up', style }: { children: React.ReactNode; delay?: number; from?: 'up' | 'left'; style?: StyleProp<ViewStyle> }) {
  const off = from === 'left' ? { translateX: -10 } : { translateY: 10 };
  return (
    <MotiView from={{ opacity: 0, ...off }} animate={{ opacity: 1, translateX: 0, translateY: 0 }} transition={{ type: 'timing', duration: 320, delay }} style={style}>
      {children}
    </MotiView>
  );
}

// ── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'ghost' | 'danger' | 'soft';
export function PButton({
  label, icon, iconRight, onPress, variant = 'primary', size = 'md', disabled, loading, full, style,
}: {
  label: string; icon?: keyof typeof Ionicons.glyphMap; iconRight?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; disabled?: boolean; loading?: boolean; full?: boolean; style?: ViewStyle;
}) {
  const { c, dark } = usePesoTheme();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const pad = size === 'sm' ? { py: 8, px: 13, fs: 13 } : size === 'lg' ? { py: 14, px: 22, fs: 15.5 } : { py: 11, px: 18, fs: 14 };
  const fg = variant === 'primary' || variant === 'danger' ? c.onAccent
    : variant === 'soft' ? c.accentInk : c.ink;
  const iconColor = variant === 'primary' ? c.onAccent : variant === 'danger' ? '#fff' : variant === 'soft' ? c.accentInk : c.muted;

  const base: ViewStyle = {
    borderRadius: radius.md, paddingVertical: pad.py, paddingHorizontal: pad.px,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    alignSelf: full ? 'stretch' : 'flex-start', overflow: 'hidden',
  };
  const bg =
    variant === 'ghost' ? { backgroundColor: c.surface, borderWidth: 1, borderColor: hovered ? c.accent : c.lineStrong }
    : variant === 'soft' ? { backgroundColor: c.accentSoft }
    : variant === 'danger' ? { backgroundColor: c.bad }
    : {}; // primary uses gradient below

  const content = (
    <>
      {loading ? <ActivityIndicator size="small" color={iconColor} /> : (
        <>
          {icon && <Ionicons name={icon} size={pad.fs + 2} color={iconColor} />}
          <Text style={{ fontFamily: font.semibold, fontSize: pad.fs, color: fg }}>{label}</Text>
          {iconRight && <Ionicons name={iconRight} size={pad.fs + 1} color={iconColor} />}
        </>
      )}
    </>
  );

  return (
    <Pressable
      onPress={onPress} disabled={disabled || loading}
      onPressIn={() => { setPressed(true); tap(); }} onPressOut={() => setPressed(false)}
      onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
      style={[{ alignSelf: full ? 'stretch' : 'flex-start' }, disabled && { opacity: 0.5 }]}
    >
      <MotiView
        animate={{ scale: pressed ? 0.965 : 1, translateY: hovered && !pressed ? -1.5 : 0 }}
        transition={{ type: 'timing', duration: 130 }}
        style={[base, bg, variant === 'primary' && hovered ? shadow('md', dark) : undefined, style]}
      >
        {variant === 'primary' && (
          <LinearGradient colors={c.accentGrad as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        )}
        {content}
      </MotiView>
    </Pressable>
  );
}

// ── Pill / status badge ──────────────────────────────────────────────────────
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'accent' | 'neutral';
export function Pill({ label, tone = 'neutral', dot = true, icon }: { label: string; tone?: Tone; dot?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const { c } = usePesoTheme();
  const map: Record<Tone, { fg: string; bg: string }> = {
    ok: { fg: c.ok, bg: c.okSoft }, warn: { fg: c.warn, bg: c.warnSoft },
    bad: { fg: c.bad, bg: c.badSoft }, info: { fg: c.info, bg: c.infoSoft },
    accent: { fg: c.accentInk, bg: c.accentSoft }, neutral: { fg: c.muted, bg: c.sunken },
  };
  const m = map[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: m.bg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3.5 }}>
      {icon ? <Ionicons name={icon} size={11} color={m.fg} /> : dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.fg }} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 11, color: m.fg }}>{label}</Text>
    </View>
  );
}

// ── Card (optionally selectable, animated entrance) ─────────────────────────
export function Card({ children, style, onPress, selected, delay = 0, elevation = 'sm', animate = true }: {
  children: React.ReactNode; style?: ViewStyle; onPress?: () => void; selected?: boolean; delay?: number;
  elevation?: 'none' | 'sm' | 'md'; animate?: boolean;
}) {
  const { c, dark } = usePesoTheme();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const body: ViewStyle = {
    backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: selected ? c.accent : hovered && onPress ? c.lineStrong : c.line,
    padding: space.lg,
    ...(elevation !== 'none' ? shadow(hovered && onPress ? 'md' : elevation === 'md' ? 'md' : 'sm', dark) : {}),
  };
  const inner = (
    <MotiView
      from={animate ? { opacity: 0, translateY: 8 } : undefined}
      animate={{ opacity: 1, translateY: pressed ? 1 : 0, scale: pressed ? 0.995 : 1 }}
      transition={{ type: 'timing', duration: 260, delay }}
      style={[body, selected && shadow('md', dark), style]}
    >
      {children}
    </MotiView>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}
      onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}>
      {inner}
    </Pressable>
  );
}

// ── Section header (eyebrow + title) ────────────────────────────────────────
export function SectionHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  const { c } = usePesoTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: space.md }}>
      <View>
        {!!eyebrow && <Text style={{ fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: c.accentInk, marginBottom: 3 }}>{eyebrow}</Text>}
        <Text style={{ fontFamily: font.display, fontSize: 18, color: c.ink }}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

// ── Fact row (label / value) ────────────────────────────────────────────────
export function FactRow({ label, value, tone, last }: { label: string; value: string; tone?: 'bad' | 'ok'; last?: boolean }) {
  const { c } = usePesoTheme();
  const vc = tone === 'bad' ? c.bad : tone === 'ok' ? c.ok : c.ink;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}>
      <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: c.muted }}>{label}</Text>
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: vc, flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ── Stat tile ───────────────────────────────────────────────────────────────
export function StatTile({ label, value, tone = 'neutral', sub, delay = 0 }: {
  label: string; value: number | string; tone?: Tone; sub?: string; delay?: number;
}) {
  const { c, dark } = usePesoTheme();
  const dotC = { ok: c.ok, warn: c.warn, bad: c.bad, info: c.info, accent: c.accent, neutral: c.ink }[tone];
  const valC = tone === 'neutral' ? c.ink : dotC;
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 320, delay }}
      style={[{ flex: 1, minWidth: 150, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, paddingVertical: 15, paddingHorizontal: 16 }, shadow('sm', dark)]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dotC }} />
        <Text style={{ fontFamily: font.semibold, fontSize: 11.5, color: c.muted }}>{label}</Text>
      </View>
      <Text style={{ fontFamily: font.display, fontSize: 27, color: valC, marginTop: 6, fontVariant: ['tabular-nums'] }}>{value}</Text>
      {!!sub && <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 2 }}>{sub}</Text>}
    </MotiView>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'file-tray-outline', title, sub }: { icon?: keyof typeof Ionicons.glyphMap; title: string; sub?: string }) {
  const { c } = usePesoTheme();
  return (
    <MotiView from={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 300 }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 }}>
      <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={28} color={c.accent} />
      </View>
      <Text style={{ fontFamily: font.display, fontSize: 16, color: c.ink }}>{title}</Text>
      {!!sub && <Text style={{ fontFamily: font.regular, fontSize: 13, color: c.muted, textAlign: 'center', maxWidth: 300, lineHeight: 19 }}>{sub}</Text>}
    </MotiView>
  );
}

// ── List row (table-style, selectable, hover, accent rail) ──────────────────
export function ListRow({ children, onPress, selected, tone, delay = 0 }: {
  children: React.ReactNode; onPress?: () => void; selected?: boolean; tone?: 'bad'; delay?: number;
}) {
  const { c } = usePesoTheme();
  const [hovered, setHovered] = useState(false);
  // Only rows that DO something get the affordance of one.
  //
  // This used to wrap every row in a Pressable and light it up on hover even
  // when no onPress was passed. On the Interviews screen — which had no detail
  // pane at all — that produced a card that highlighted under the cursor and
  // then did nothing when clicked. PESO reported it as a bug, correctly: a
  // hover state is a promise.
  const interactive = !!onPress;
  const body = (
    <MotiView
      from={{ opacity: 0, translateX: -6 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'timing', duration: 240, delay }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: selected ? c.accentSoft : hovered && interactive ? c.raise : c.surface,
        borderRadius: radius.md, borderWidth: 1,
        borderColor: selected ? c.accent : tone === 'bad' ? c.bad : c.line,
        paddingVertical: 12, paddingHorizontal: 14, overflow: 'hidden',
      }}
    >
      {selected && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: c.accent }} />}
      {children}
    </MotiView>
  );
  if (!interactive) return body;
  return (
    <Pressable onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}>
      {body}
    </Pressable>
  );
}

// ── Icon button (round, for toolbars) ───────────────────────────────────────
export function IconButton({ icon, onPress, tone = 'neutral', badge }: { icon: keyof typeof Ionicons.glyphMap; onPress?: () => void; tone?: 'neutral' | 'accent'; badge?: number }) {
  const { c } = usePesoTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}>
      <MotiView animate={{ scale: hovered ? 1.06 : 1 }} transition={{ type: 'timing', duration: 130 }}
        style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: hovered ? c.accentSoft : c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={19} color={tone === 'accent' ? c.accent : c.muted} />
        {badge != null && badge > 0 && (
          <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: c.bad, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.canvas }}>
            <Text style={{ color: '#fff', fontSize: 10, fontFamily: font.semibold }}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </MotiView>
    </Pressable>
  );
}
