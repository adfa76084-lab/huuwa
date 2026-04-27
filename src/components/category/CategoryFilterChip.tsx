import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { Category } from '@/types/category';

interface CategoryFilterChipProps {
  category: Category;
  onClear: () => void;
}

export function CategoryFilterChip({ category, onClear }: CategoryFilterChipProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.primary + '14' }]}>
      <Ionicons name={category.icon as any} size={14} color={colors.primary} />
      <Text style={[styles.label, { color: colors.primary }]} numberOfLines={1}>
        {category.name}
      </Text>
      <TouchableOpacity
        onPress={onClear}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close-circle" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
});
