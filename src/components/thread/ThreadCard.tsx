import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Thread } from '@/types/thread';
import { Avatar } from '@/components/ui/Avatar';
import { formatFeedTime } from '@/utils/date';
import { formatCount } from '@/utils/text';

interface ThreadCardProps {
  thread: Thread;
  onPress?: () => void;
  onLike?: () => void;
  isLiked?: boolean;
  likeDelta?: number;
}

export function ThreadCard({ thread, onPress, onLike, isLiked = false, likeDelta = 0 }: ThreadCardProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        Shadows.sm,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.body}>
        {/* Left content */}
        <View style={styles.leftContent}>
          {/* Author row */}
          <View style={styles.authorRow}>
            <Text
              style={[styles.authorName, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {thread.author.displayName}
            </Text>
            <Text style={[styles.time, { color: colors.textTertiary }]}>
              {formatFeedTime(thread.createdAt)}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {thread.title}
          </Text>

          {/* Footer with stats */}
          <View style={styles.footer}>
            <View style={styles.stat}>
              <Ionicons
                name="chatbubbles"
                size={14}
                color={colors.textTertiary}
              />
              <Text style={[styles.statText, { color: colors.textTertiary }]}>
                {formatCount(thread.repliesCount)}
              </Text>
            </View>
            {onLike && (
              <TouchableOpacity
                style={styles.stat}
                onPress={onLike}
                activeOpacity={0.6}
                hitSlop={8}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={14}
                  color={isLiked ? colors.error : colors.textTertiary}
                />
                <Text
                  style={[
                    styles.statText,
                    { color: isLiked ? colors.error : colors.textTertiary },
                  ]}
                >
                  {formatCount(Math.max(0, (thread.likesCount ?? 0) + likeDelta))}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
    </TouchableOpacity>
  );
}

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
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.sm + 2,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  threadImage: {
    width: 90,
    height: 90,
    borderRadius: BorderRadius.md,
  },
});
