import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

interface TagProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Tag({ label, selected = false, onPress }: TagProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.tag,
        selected
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <Text
        style={[
          styles.text,
          { color: selected ? '#FFFFFF' : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
});
