import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Category } from '@/types/category';
import { formatCount } from '@/utils/text';

interface CategoryCardProps {
  category: Category;
  onPress?: () => void;
  isSelected?: boolean;
}

export function CategoryCard({ category, onPress, isSelected }: CategoryCardProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isSelected ? colors.primary + '12' : colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
        },
        Shadows.sm,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon badge or image */}
      {category.imageUrl ? (
        <Image
          source={{ uri: category.imageUrl }}
          style={styles.imageBadge}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: category.color + '14' },
          ]}
        >
          <Ionicons
            name={category.icon as any}
            size={26}
            color={category.color}
          />
        </View>
      )}

      {/* Name */}
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {category.name}
      </Text>

      {/* Description */}
      {category.description ? (
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {category.description}
        </Text>
      ) : null}

      {/* Member count */}
      <View style={styles.memberRow}>
        <Ionicons name="people-outline" size={13} color={colors.textTertiary} />
        <Text style={[styles.memberCount, { color: colors.textTertiary }]}>
          {formatCount(category.membersCount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs + 2,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  imageBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  description: {
    fontSize: FontSize.xs,
    lineHeight: 16,
    color: '#6C757D',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  memberCount: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
