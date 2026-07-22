// components/branding/AnimatedSplash.tsx
// The first few seconds of CareLink.
//
// This isn't decoration — RootLayout used to `return null` while fonts loaded,
// so the app showed the OS splash, then a blank screen, then snapped into the
// UI. This fills that dead window with the brand.
//
// Shares BrandLoader with every other loading state, so launch and in-app waits
// look like the same product rather than two different apps.
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Animated, Easing } from 'react-native';
import { BrandLoader } from './BrandLoader';

type Props = {
  /** Flip true when the app is ready (fonts loaded); exits after its minimum beat. */
  ready?: boolean;
  /** Never flash — hold at least this long even if the app is instantly ready. */
  minDurationMs?: number;
  onFinish?: () => void;
};

export function AnimatedSplash({ ready = true, minDurationMs = 2600, onFinish }: Props) {
  const fadeOut = useRef(new Animated.Value(1)).current;
  const startedAt = useRef(Date.now());
  const finished = useRef(false);

  // The bar owns its own motion (one continuous sweep from mount). All this needs
  // to say is "the wait is over" — which is only true once the app is ready AND
  // the minimum beat has passed, so the bar can't complete while we're still
  // holding the screen. Fonts are bundled and load almost instantly, so without
  // the minimum the whole splash would be a blink.
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!ready || finished.current) return;
    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, minDurationMs - elapsed);

    const finish = setTimeout(() => setDone(true), wait);
    // Let the bar visibly run out to 100% before fading — cutting away mid-fill
    // is what makes a splash feel like it was interrupted.
    const exit = setTimeout(() => {
      finished.current = true;
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 480,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => onFinish?.());
    }, wait + 420);

    return () => { clearTimeout(finish); clearTimeout(exit); };
  }, [ready, minDurationMs, fadeOut, onFinish]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeOut }]} pointerEvents="none">
      <BrandLoader
        complete={done}
        sweepMs={minDurationMs}
        message={done ? 'Ready' : 'Loading…'}
        logoSize={120}
      />
    </Animated.View>
  );
}
