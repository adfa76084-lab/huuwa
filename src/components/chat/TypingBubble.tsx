import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Avatar } from '@/components/ui/Avatar';
import { Spacing, BorderRadius } from '@/constants/theme';

interface TypingBubbleProps {
  avatarUrl: string | null;
}

const DOT_SIZE = 8;
const DOT_GAP = 5;
const ANIM_DURATION = 400;

export function TypingBubble({ avatarUrl }: TypingBubbleProps) {
  const colors = useThemeColors();

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: ANIM_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: ANIM_DURATION,
            useNativeDriver: true,
          }),
        ]),
      );

    const anim = Animated.parallel([
      createDotAnim(dot1, 0),
      createDotAnim(dot2, ANIM_DURATION * 0.33),
      createDotAnim(dot3, ANIM_DURATION * 0.66),
    ]);

    anim.start();
    return () => anim.stop();
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.textTertiary,
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <Avatar uri={avatarUrl} size={36} />
      <View style={[styles.bubble, { backgroundColor: colors.surfaceVariant }]}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DOT_GAP,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.sm,
  },
});
