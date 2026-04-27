import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { Mention } from '@/types/mention';

interface MentionBadgeListProps {
  mentions: Mention[];
  onRemove: (uid: string) => void;
}

export function MentionBadgeList({ mentions, onRemove }: MentionBadgeListProps) {
  const colors = useThemeColors();

  if (mentions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {mentions.map((mention) => (
        <View
          key={mention.uid}
          style={[styles.badge, { backgroundColor: '#3498DB' + '18' }]}
        >
          <Text style={[styles.badgeText, { color: '#3498DB' }]}>
            @{mention.username}
          </Text>
          <TouchableOpacity
            onPress={() => onRemove(mention.uid)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close-circle" size={16} color={'#3498DB80'} />
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
