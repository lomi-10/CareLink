// components/landing/web/LandingSplash.tsx
//
// A brief branded screen while the landing page's fonts and hero image settle.
//
// WHY IT IS SHORT AND WHY IT CANNOT STICK
//
// A splash that outstays the load is worse than none — it delays a visitor who
// was ready. This one covers the moment the page would otherwise show unstyled
// text and a blank hero, then leaves. It is capped by a timer as well as by the
// ready flag, so a font that never resolves cannot strand someone on a logo:
// showing an imperfect page beats showing no page.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, Easing, ReduceMotion, runOnJS,
} from 'react-native-reanimated';

import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { FontFamily } from '@/constants/GlobalStyles';
import { useLandingTheme } from './landingTheme';

/** Hard ceiling. Nobody waits on our animation longer than this. */
const MAX_MS = 1400;

export function LandingSplash({ onDone }: { onDone: () => void }) {
  const { c } = useLandingTheme();
  const fade = useSharedValue(0);
  const pulse = useSharedValue(0);
  const out = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false,
    );

    const t = setTimeout(() => {
      out.value = withTiming(1, { duration: 320, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
    }, MAX_MS);
    return () => clearTimeout(t);
  }, [fade, pulse, out, onDone]);

  const wrap = useAnimatedStyle(() => ({ opacity: 1 - out.value }));
  const mark = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: 0.92 + fade.value * 0.08 }],
  }));
  const ring = useAnimatedStyle(() => ({
    opacity: 0.10 + pulse.value * 0.22,
    transform: [{ scale: 1 + pulse.value * 0.22 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, s.wrap, { backgroundColor: c.bg, zIndex: 999 }, wrap]}
    >
      <View style={s.center}>
        <Animated.View style={[s.ring, { borderColor: c.accent }, ring]} />
        <Animated.View style={[s.markWrap, mark]}>
          <CareLinkLogoMark size={62} />
          <Text style={[s.word, { color: c.text }]}>
            Care<Text style={{ color: c.accent }}>Link</Text>
          </Text>
          <Text style={[s.tag, { color: c.textSubtle }]}>Kasambahay hiring, done properly</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1 },
  markWrap: { alignItems: 'center', gap: 10 },
  word: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 27, letterSpacing: -0.3 },
  tag: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, letterSpacing: 0.3 },
});
