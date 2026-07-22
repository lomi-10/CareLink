// components/branding/BrandLoader.tsx
// The one loading experience for CareLink — splash, route loads, blocking waits.
//
// Background + orbiting logo + wordmark + progress bar. Used by:
//   • AnimatedSplash        (app launch)
//   • LoadingSpinner        (the 13 screens that show a blocking loader)
//
// NOTE ON FONTS: this renders during app launch, *before* Fredoka has loaded, so
// it deliberately uses the system font with letter-spacing rather than a brand
// font that would silently fall back mid-animation.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { AnimatedLogo } from './AnimatedLogo';

const BG = require('../../assets/images/loading-bg.png');

const GOLD = '#D9A441';
const GOLD_LIGHT = '#F0C462';
const ORANGE = '#E86019';

export type BrandLoaderProps = {
  /** Copy under the bar. */
  message?: string;
  /** Hide the CareLink wordmark + tagline (for compact/inline use). */
  showWordmark?: boolean;
  /** Hide the progress bar. */
  showBar?: boolean;
  /**
   * Flip true when the work is done — the bar runs out to 100% and stops.
   * Until then it sweeps smoothly toward 90% and waits there, which is honest
   * about not knowing the duration instead of inventing a percentage.
   */
  complete?: boolean;
  /** How long the sweep to 90% takes. Match it to the expected wait. */
  sweepMs?: number;
  logoSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function BrandLoader({
  message = 'Loading…',
  showWordmark = true,
  showBar = true,
  complete = false,
  sweepMs = 2600,
  logoSize = 104,
  style,
}: BrandLoaderProps) {
  return (
    <View style={[styles.root, style]}>
      <Image source={BG} style={styles.bg} resizeMode="cover" />

      <View style={styles.center}>
        {/* Rings ON — this is the "loading" state, so the orbit reads as activity. */}
        <AnimatedLogo size={logoSize} rings glow beat float={false} boxScale={1.75} entrance />

        {showWordmark && (
          <>
            <Text style={styles.wordmark}>
              <Text style={styles.wordCare}>Care</Text>
              <Text style={styles.wordLink}>Link</Text>
            </Text>
            <Text style={styles.tagline}>Trusted Household Help, Verified by PESO</Text>
          </>
        )}

        {showBar && <ProgressBar complete={complete} sweepMs={sweepMs} />}
        {!!message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
}

/**
 * Gold fill bar.
 *
 * ONE continuous animation, started on mount and never restarted. The first
 * version stepped a React state value on a setInterval and re-fired a 320ms
 * Animated.timing on every tick — each tick interrupting the last, which stutters.
 * Worse, the caller gated the interval on `!ready`, and fonts are bundled so
 * `ready` was true almost immediately: the bar never moved at all, sat at its
 * initial value, then snapped to 100%. Driving the whole sweep from one timing
 * removes both problems.
 */
function ProgressBar({ complete, sweepMs }: { complete: boolean; sweepMs: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  // Start moving the instant we mount — no initial offset, no pause.
  useEffect(() => {
    const sweep = Animated.timing(anim, {
      toValue: 0.9,
      duration: sweepMs,
      // Decelerating: quick off the line, easing out as it approaches 90%. Reads
      // as "working hard, nearly there" rather than a mechanical linear crawl.
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // animating width % — native driver can't do layout
    });
    sweep.start();
    return () => sweep.stop();
  }, [anim, sweepMs]);

  // Run out to 100% once the work is genuinely done. Duration scales with the
  // distance left, so an early finish doesn't jump and a late one doesn't crawl.
  useEffect(() => {
    if (!complete) return;
    anim.stopAnimation((current: number) => {
      const remaining = 1 - current;
      Animated.timing(anim, {
        toValue: 1,
        duration: Math.max(180, remaining * 900),
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }).start();
    });
  }, [complete, anim]);

  // Highlight travelling along the filled part — keeps it alive when the fill
  // has settled at 90%.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { width }]}>
        <Animated.View
          style={[
            styles.shimmer,
            { opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] }) },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2E1F12', alignItems: 'center', justifyContent: 'center' },
  bg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  center: { alignItems: 'center', paddingHorizontal: 32, maxWidth: 480 },

  wordmark: { fontSize: 30, fontWeight: '800', letterSpacing: 0.5, marginTop: 10 },
  wordCare: { color: '#FFFFFF' },
  wordLink: { color: ORANGE },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,240,225,0.72)',
    marginTop: 8,
    letterSpacing: 0.4,
    textAlign: 'center',
  },

  track: {
    width: 260,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.38)',
    overflow: 'hidden',
    marginTop: 26,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: GOLD,
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GOLD_LIGHT,
  },
  message: {
    fontSize: 13,
    color: 'rgba(255,240,225,0.66)',
    marginTop: 14,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
