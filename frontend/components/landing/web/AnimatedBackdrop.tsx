// components/landing/web/AnimatedBackdrop.tsx
//
// Three warm glows drifting behind the page, plus a faint grid.
//
// THE RESTRAINT IS THE POINT
//
// A landing page for a hiring platform is read, not watched. The motion here is
// slow enough (28-40s per cycle) that nobody consciously sees it move — it
// reads as depth rather than animation. Anything faster competes with the text
// for attention and makes the page feel like a screensaver.
//
// Sits behind everything at pointerEvents="none", so it can never intercept a
// click meant for the content above it.
import React, { useEffect } from 'react';
import { StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  ReduceMotion,
} from 'react-native-reanimated';
import { useLandingTheme } from './landingTheme';

function Glow({
  size, color, from, to, duration, delay,
}: {
  size: number;
  color: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  duration: number;
  delay: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.ease),
        // Honour the OS "reduce motion" setting. A drifting background is
        // exactly the kind of ambient movement that triggers discomfort for
        // people who have asked their system to stop it.
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true, // reverse, so it eases back rather than snapping to the start
    );
  }, [t, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [from.x, to.x]) },
      { translateY: interpolate(t.value, [0, 1], [from.y, to.y]) },
    ],
    opacity: interpolate(t.value, [0, 0.5, 1], [0.55, 1, 0.55]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          // The blur is what turns three circles into atmosphere. Without it
          // they read as three flat discs sliding around.
          ...(Platform.OS === 'web'
            ? ({ filter: `blur(${Math.round(size / 3)}px)` } as object)
            : null),
          top: 0,
          left: 0,
        },
        style,
        // A delay per glow keeps them from breathing in unison, which is what
        // makes ambient motion look mechanical.
        { animationDelay: `${delay}ms` } as object,
      ]}
    />
  );
}

export function AnimatedBackdrop() {
  const { c } = useLandingTheme();
  const { width, height } = useWindowDimensions();
  const short = Math.min(width || 1200, 1400);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, overflow: 'hidden' }]}>
      <Glow
        size={short * 0.62}
        color={c.glowA}
        from={{ x: -short * 0.1, y: -short * 0.12 }}
        to={{ x: short * 0.28, y: short * 0.1 }}
        duration={34000}
        delay={0}
      />
      <Glow
        size={short * 0.5}
        color={c.glowB}
        from={{ x: short * 0.62, y: height * 0.28 }}
        to={{ x: short * 0.34, y: height * 0.52 }}
        duration={40000}
        delay={1200}
      />
      <Glow
        size={short * 0.42}
        color={c.glowA}
        from={{ x: short * 0.18, y: height * 0.72 }}
        to={{ x: short * 0.56, y: height * 0.5 }}
        duration={28000}
        delay={2400}
      />

      {/* A faint grid gives the drifting glows something to move against, so
          the depth is legible instead of just being a soft colour wash. */}
      {Platform.OS === 'web' && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundImage:
                `linear-gradient(${c.cardBorder} 1px, transparent 1px),` +
                `linear-gradient(90deg, ${c.cardBorder} 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
              opacity: c.mode === 'dark' ? 0.5 : 0.7,
              // Fades the grid out toward the bottom so it never fights the
              // content further down the page.
              maskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)',
            } as object,
          ]}
        />
      )}
    </View>
  );
}
