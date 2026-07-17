// components/branding/AnimatedLogo.tsx
// The CareLink emblem, alive — reusable on login, landing hero, anywhere.
//
// IMPORTANT: the logo itself is still just carelink_logo.png. Nothing here is a
// new asset. The life comes from motion *around* a static image: a slow orbiting
// ring, a counter-rotating arc, a breathing glow, and a gentle float. That's the
// whole trick behind every "wow, their logo is animated" splash screen — you do
// not need Lottie or an SVG rebuild to get it.
//
// Uses the RN Animated API (not Reanimated) so web and native behave identically.
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

const LOGO = require('../../assets/images/carelink_logo.png');

export type AnimatedLogoProps = {
  /** Diameter of the emblem itself. Rings/glow scale from this. */
  size?: number;
  /** Orbiting ring + arc around the mark. */
  rings?: boolean;
  /** Soft breathing halo behind the mark. */
  glow?: boolean;
  /** Gentle up/down drift. */
  float?: boolean;
  /** The mark itself breathes — a slow zoom in/out, like a heartbeat. */
  beat?: boolean;
  /** Ring/glow colour — default is CareLink gold. */
  accent?: string;
  /** Scale/fade the mark in on mount. */
  entrance?: boolean;
  /** Outer box = size * boxScale. Lower it to tighten the halo in inline rows. */
  boxScale?: number;
  /**
   * Drop-in slot for a real logo animation (the hug → house → emblem sequence).
   * Render whatever plays the mark — a Lottie view, a Rive view, an SVG — and it
   * replaces the static PNG while keeping every wrapper (glow/rings/float/entrance)
   * and every call site unchanged. Wire it in ONE place: see renderMark below.
   */
  renderMark?: (size: number) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedLogo({
  size = 120,
  rings = true,
  glow = true,
  float = true,
  beat = true,
  accent = '#D9A441',
  entrance = true,
  boxScale = 2.1,
  renderMark,
  style,
}: AnimatedLogoProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const spinBack = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const thump = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(entrance ? 0 : 1)).current;

  useEffect(() => {
    const anims: Animated.CompositeAnimation[] = [];

    if (rings) {
      const loop = (v: Animated.Value, duration: number) =>
        Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
      anims.push(loop(spin, 14000), loop(spinBack, 9000));
    }
    if (glow) {
      anims.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ]),
        ),
      );
    }
    if (float) {
      anims.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(drift, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(drift, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ),
      );
    }
    if (beat) {
      // Slightly quicker than the halo so the two never lock in step — that
      // desync is what stops it reading as a mechanical loop.
      anims.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(thump, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(thump, { toValue: 0, duration: 1150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ]),
        ),
      );
    }
    if (entrance) {
      anims.push(Animated.spring(enter, { toValue: 1, friction: 6, tension: 46, useNativeDriver: true }));
    }

    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [rings, glow, float, beat, entrance, spin, spinBack, pulse, drift, thump, enter]);

  const box = size * boxScale;
  const rot = (v: Animated.Value, from = '0deg', to = '360deg') =>
    v.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <Animated.View
      style={[
        { width: box, height: box, alignItems: 'center', justifyContent: 'center' },
        float && { transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [6, -6] }) }] },
        style,
      ]}
      pointerEvents="none"
    >
      {glow && (
        <Animated.View
          style={[
            circle(size * 1.5),
            {
              backgroundColor: accent,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
              ...Platform.select({
                web: { filter: `blur(${Math.round(size * 0.35)}px)` } as any,
                default: { shadowColor: accent, shadowOpacity: 0.9, shadowRadius: size * 0.3, shadowOffset: { width: 0, height: 0 } },
              }),
            },
          ]}
        />
      )}

      {rings && (
        <>
          {/* faint full orbit */}
          <Animated.View
            style={[
              circle(size * 1.62),
              { borderWidth: 1, borderColor: hexA(accent, 0.18), transform: [{ rotate: rot(spin) }] },
            ]}
          />
          {/* two-sided arc, slow clockwise */}
          <Animated.View
            style={[
              circle(size * 1.42),
              {
                borderWidth: 2,
                borderColor: 'transparent',
                borderTopColor: accent,
                borderRightColor: hexA(accent, 0.55),
                transform: [{ rotate: rot(spin) }],
              },
            ]}
          />
          {/* single arc counter-rotating for depth */}
          <Animated.View
            style={[
              circle(size * 1.22),
              {
                borderWidth: 1.5,
                borderColor: 'transparent',
                borderBottomColor: hexA(accent, 0.7),
                transform: [{ rotate: rot(spinBack, '360deg', '0deg') }],
              },
            ]}
          />
        </>
      )}

      {/* Outer = entrance spring, inner = heartbeat. Nested because Animated can't
          multiply two values into one scale — stacking the views composes them. */}
      <Animated.View
        style={{
          opacity: enter,
          transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) }],
        }}
      >
        <Animated.View
          style={
            beat
              ? { transform: [{ scale: thump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] }) }] }
              : undefined
          }
        >
          <View style={[styles.well, { width: size, height: size, borderRadius: size / 2 }]}>
            {renderMark ? (
              renderMark(size)
            ) : (
              <Image
                source={LOGO}
                accessibilityLabel="CareLink"
                style={{ width: size, height: size }}
                resizeMode="cover"
              />
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const circle = (d: number): ViewStyle => ({
  position: 'absolute',
  width: d,
  height: d,
  borderRadius: d / 2,
});

/** #RRGGBB + alpha → rgba(), so callers can pass a plain brand hex. */
function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const styles = StyleSheet.create({
  well: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 14px 38px rgba(0,0,0,0.22)' } as any,
      default: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
    }),
  },
});
