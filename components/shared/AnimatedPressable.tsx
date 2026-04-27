import React from 'react';
import { Platform, Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

type AnimatedPressableProps = PressableProps & {
  className?: string;
  /** Ignored — kept so older call sites that passed `variant` do not break. */
  variant?: string;
};

/**
 * Pressable with a light spring scale on press (native + web).
 * Passes `className` through on web for NativeWind when provided.
 */
export default function AnimatedPressable({
  style,
  children,
  className,
  variant: _variant,
  onPressIn,
  onPressOut,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ReanimatedPressable
      {...rest}
      {...(Platform.OS === 'web' && className ? { className } : {})}
      style={[animatedStyle, style]}
      onPressIn={(e) => {
        scale.value = withSpring(0.96);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1);
        onPressOut?.(e);
      }}
    >
      {children}
    </ReanimatedPressable>
  );
}
