import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

interface HashtagBadgeListProps {
  hashtags: string[];
  onRemove: (tag: string) => void;
}

export function HashtagBadgeList({ hashtags, onRemove }: HashtagBadgeListProps) {
  const colors = useThemeColors();

  if (hashtags.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {hashtags.map((tag) => (
        <View
          key={tag}
          style={[styles.badge, { backgroundColor: colors.primary + '18' }]}
        >
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            #{tag}
          </Text>
          <TouchableOpacity
            onPress={() => onRemove(tag)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close-circle" size={16} color={colors.primary + '80'} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 44,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
