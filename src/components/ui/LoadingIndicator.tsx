import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface LoadingIndicatorProps {
  fullScreen?: boolean;
}

export function LoadingIndicator({ fullScreen = false }: LoadingIndicatorProps) {
  const colors = useThemeColors();

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.inline}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    padding: 20,
    alignItems: 'center',
  },
});
