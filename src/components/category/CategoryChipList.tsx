import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { Category } from '@/types/category';

interface CategoryChipListProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showAll?: boolean;
}

export function CategoryChipList({
  categories,
  selectedId,
  onSelect,
  showAll = true,
}: CategoryChipListProps) {
  const colors = useThemeColors();

  const renderChip = (id: string | null, label: string, icon?: string, color?: string) => {
    const isActive = selectedId === id;
    return (
      <TouchableOpacity
        key={id ?? 'all'}
        style={[
          styles.chip,
          {
            backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
          },
        ]}
        onPress={() => onSelect(id)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.chipText,
            { color: isActive ? '#FFFFFF' : colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {showAll && renderChip(null, 'All')}
      {categories.map((cat) => renderChip(cat.id, cat.name, cat.icon, cat.color))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
