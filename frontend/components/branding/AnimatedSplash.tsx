// components/branding/AnimatedSplash.tsx
// The first four seconds of CareLink.
//
// This isn't decoration — RootLayout used to `return null` while fonts loaded,
// so the app showed the stock white Expo splash, then a blank screen, then
// snapped into the UI. This fills that dead time with the brand.
//
// Deliberately uses NO custom font: it renders *while* Fredoka is still loading,
// so it leans on letter-spacing + weight instead (which is what premium splash
// screens do anyway). Uses the RN Animated API rather than Reanimated so the
// exact same animation runs on web and native.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LOGO = require('../../assets/images/carelink_logo.png');

// Warm CareLink brand — deep brown well with a gold light source.
const BG_GRADIENT = ['#A9713A', '#6B4420', '#2E1F12'] as const;
const GOLD = '#D9A441';
const GOLD_SOFT = '#E4B657';

type Props = {
  /** Flip true when the app is ready (fonts loaded); the splash exits after its minimum beat. */
  ready?: boolean;
  /** Never flash — hold at least this long even if the app is instantly ready. */
  minDurationMs?: number;
  onFinish?: () => void;
};

export function AnimatedSplash({ ready = true, minDurationMs = 2400, onFinish }: Props) {
  // Looping motion
  const spinSlow = useRef(new Animated.Value(0)).current;
  const spinFast = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const beat = useRef(new Animated.Value(0)).current;
  // Entrance
  const logoIn = useRef(new Animated.Value(0)).current;
  const textIn = useRef(new Animated.Value(0)).current;
  const ringsIn = useRef(new Animated.Value(0)).current;
  // Exit
  const fadeOut = useRef(new Animated.Value(1)).current;

  const startedAt = useRef(Date.now());
  const finished = useRef(false);

  useEffect(() => {
    const loop = (v: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
      );

    const spins = [loop(spinSlow, 9000), loop(spinFast, 5200)];
    spins.forEach((a) => a.start());

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    breathe.start();

    // The mark's heartbeat — deliberately off-tempo from the halo (1150ms vs 1500ms)
    // so the two never sync up and it stops reading as a mechanical loop.
    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 0, duration: 1150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    heartbeat.start();

    // Rings bloom outward, logo springs in, then the wordmark rises.
    Animated.sequence([
      Animated.timing(ringsIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(logoIn, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.timing(textIn, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    return () => { spins.forEach((a) => a.stop()); breathe.stop(); heartbeat.stop(); };
  }, [spinSlow, spinFast, pulse, beat, logoIn, textIn, ringsIn]);

  // Exit only once BOTH the app is ready and the minimum beat has elapsed.
  useEffect(() => {
    if (!ready || finished.current) return;
    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, minDurationMs - elapsed);
    const t = setTimeout(() => {
      finished.current = true;
      Animated.timing(fadeOut, {
        toValue: 0, duration: 480, easing: Easing.in(Easing.quad), useNativeDriver: true,
      }).start(() => onFinish?.());
    }, wait);
    return () => clearTimeout(t);
  }, [ready, minDurationMs, fadeOut, onFinish]);

  const rotate = (v: Animated.Value, from = '0deg', to = '360deg') =>
    v.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  const ringScale = ringsIn.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeOut }]} pointerEvents="none">
      <LinearGradient colors={BG_GRADIENT} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.root}>
        <View style={styles.center}>
          {/* Pulsing glow well behind the mark */}
          <Animated.View
            style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
          />

          {/* Ring 1 — full faint circle, slow */}
          <Animated.View
            style={[
              styles.ring, styles.ringOuter,
              { opacity: ringsIn, transform: [{ scale: ringScale }, { rotate: rotate(spinSlow) }] },
            ]}
          />
          {/* Ring 2 — a two-sided arc sweeping clockwise */}
          <Animated.View
            style={[
              styles.ring, styles.ringArcA,
              { opacity: ringsIn, transform: [{ scale: ringScale }, { rotate: rotate(spinFast) }] },
            ]}
          />
          {/* Ring 3 — single-sided arc counter-rotating for depth */}
          <Animated.View
            style={[
              styles.ring, styles.ringArcB,
              { opacity: ringsIn, transform: [{ scale: ringScale }, { rotate: rotate(spinSlow, '360deg', '0deg') }] },
            ]}
          />

          {/* The mark — springs in, then keeps beating. Outer view owns the entrance
              scale, inner owns the heartbeat, since Animated can't multiply two
              values into a single scale. */}
          <Animated.View
            style={{
              transform: [
                { scale: logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
              opacity: logoIn,
            }}
          >
            <Animated.View
              style={{
                transform: [{ scale: beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
              }}
            >
              <View style={styles.logoWell}>
                <Image source={LOGO} style={styles.logo} resizeMode="cover" accessibilityLabel="CareLink" />
              </View>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Wordmark */}
        <Animated.View
          style={{
            opacity: textIn,
            transform: [{ translateY: textIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}
        >
          <Text style={styles.wordmark}>CARELINK</Text>
          <Text style={styles.tagline}>Trusted Household Help, Verified by PESO</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const RING = (size: number) => ({
  position: 'absolute' as const,
  width: size,
  height: size,
  borderRadius: size / 2,
});

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', width: 300, height: 300 },

  glow: {
    ...RING(210),
    backgroundColor: GOLD,
    ...Platform.select({
      web: { filter: 'blur(48px)' } as any,
      default: { shadowColor: GOLD, shadowOpacity: 0.9, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } },
    }),
  },

  ring: { borderColor: 'transparent' },
  ringOuter: {
    ...RING(268),
    borderWidth: 1,
    borderColor: 'rgba(217,164,65,0.18)',
  },
  // Colouring only some borders turns a circle into a rotating arc — no SVG needed.
  ringArcA: {
    ...RING(236),
    borderWidth: 2.5,
    borderTopColor: GOLD,
    borderRightColor: GOLD_SOFT,
  },
  ringArcB: {
    ...RING(196),
    borderWidth: 1.5,
    borderBottomColor: 'rgba(228,182,87,0.75)',
  },

  logoWell: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#fff',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 18px 50px rgba(0,0,0,0.35)' } as any,
      default: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
    }),
  },
  logo: { width: 132, height: 132 },

  wordmark: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FBF1E4',
    letterSpacing: 10,
    textAlign: 'center',
    marginTop: 46,
    // shift right by half the trailing letter-space so it reads optically centred
    paddingLeft: 10,
  },
  tagline: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(251,241,228,0.62)',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 12,
    paddingLeft: 2,
  },
});
