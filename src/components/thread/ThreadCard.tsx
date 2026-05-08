import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Thread } from '@/types/thread';
import { formatFeedTime } from '@/utils/date';
import { formatCount } from '@/utils/text';

interface ThreadCardProps {
  thread: Thread;
  onPress?: () => void;
  onLike?: () => void;
  onMenuPress?: () => void;
  isLiked?: boolean;
  likeDelta?: number;
}

function ThreadCardComponent({ thread, onPress, onMenuPress }: ThreadCardProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
        Shadows.sm,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.body}>
        {/* Left content */}
        <View style={styles.leftContent}>
          {/* Author + time */}
          <View style={styles.authorRow}>
            <Text
              style={[styles.authorName, { color: colors.primary }]}
              numberOfLines={1}
            >
              {thread.author.displayName}
            </Text>
            <Text
              style={[styles.time, { color: colors.textTertiary }]}
              numberOfLines={1}
            >
              {formatFeedTime(thread.createdAt)}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {thread.title}
          </Text>

          {/* Excerpt — first-post preview */}
          {thread.excerpt ? (
            <Text
              style={[styles.excerpt, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {thread.excerpt}
            </Text>
          ) : null}
        </View>

        {/* Right image */}
        {thread.imageUrl && (
          <Image
            source={{ uri: thread.imageUrl }}
            style={styles.threadImage}
            contentFit="cover"
            transition={200}
          />
        )}
      </View>

      {/* Footer — replies count + (subtle) menu for moderation */}
      <View style={styles.footer}>
        <View style={styles.stat}>
          <Ionicons name="chatbubbles" size={16} color={colors.textTertiary} />
          <Text style={[styles.statText, { color: colors.textTertiary }]}>
            {formatCount(thread.repliesCount)}
          </Text>
        </View>
        {onMenuPress && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onMenuPress();
            }}
            hitSlop={10}
            activeOpacity={0.6}
            accessibilityLabel="メニュー"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={16}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const ThreadCard = React.memo(ThreadCardComponent);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs + 2,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  leftContent: {
    flex: 1,
    gap: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  authorName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    flexShrink: 1,
  },
  time: {
    fontSize: FontSize.xs,
    flexShrink: 0,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  excerpt: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: 2,
  },
  threadImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  menuButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});
