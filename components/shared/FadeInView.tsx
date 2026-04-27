import React, { type ReactNode, useMemo } from 'react';
import { type ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { CALM_EASE, CALM_MODAL_IN } from './calmMoti';

type Entrance = 'bottom' | 'right' | 'fade';

type FadeInViewProps = {
  delay?: number;
  from?: Entrance;
  children: ReactNode;
  style?: ViewStyle;
};

const CALM_FADE = { type: 'timing' as const, duration: 200, easing: CALM_EASE };

function getMotiPresets(entrance: Entrance) {
  switch (entrance) {
    case 'right':
      return {
        from: { opacity: 0, translateX: 8, translateY: 0 },
        animate: { opacity: 1, translateX: 0, translateY: 0 },
      };
    case 'fade':
      return {
        from: { opacity: 0 },
        animate: { opacity: 1, translateY: 0, translateX: 0 },
      };
    case 'bottom':
    default:
      return {
        from: { opacity: 0, translateY: 8 },
        animate: { ...CALM_MODAL_IN, translateX: 0 },
      };
  }
}

export default function FadeInView({
  delay = 0,
  from: entrance = 'bottom',
  children,
  style,
}: FadeInViewProps) {
  const { from, animate } = useMemo(() => getMotiPresets(entrance), [entrance]);

  return (
    <MotiView
      from={from}
      animate={animate}
      transition={{ ...CALM_FADE, delay }}
      style={style}
    >
      {children}
    </MotiView>
  );
}
