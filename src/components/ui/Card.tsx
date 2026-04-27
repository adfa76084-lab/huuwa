import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  padded?: boolean;
  style?: ViewStyle;
}

export function Card({ children, padded = true, style }: CardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  padded: {
    padding: Spacing.lg,
  },
});
