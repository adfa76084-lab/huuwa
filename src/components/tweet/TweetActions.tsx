import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing } from '@/constants/theme';
import { formatCount } from '@/utils/text';

function usePopAnimation(active: boolean) {
  const scale = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (active) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.4,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [active, scale]);

  return scale;
}

interface TweetActionsProps {
  likesCount: number;
  repliesCount: number;
  bookmarksCount: number;
  viewsCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onLike?: () => void;
  onReply?: () => void;
  onBookmark?: () => void;
}

export function TweetActions({
  likesCount,
  repliesCount,
  bookmarksCount,
  viewsCount,
  isLiked = false,
  isBookmarked = false,
  onLike,
  onReply,
  onBookmark,
}: TweetActionsProps) {
  const colors = useThemeColors();
  const likeScale = usePopAnimation(isLiked);
  const bookmarkScale = usePopAnimation(isBookmarked);

  return (
    <View style={styles.container}>
      {/* Reply */}
      <TouchableOpacity
        style={styles.action}
        onPress={onReply}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={18}
          color={colors.textTertiary}
        />
        <Text style={[styles.count, { color: colors.textTertiary }]}>
          {repliesCount > 0 ? formatCount(repliesCount) : '返信'}

        </Text>
      </TouchableOpacity>

      {/* Like */}
      <TouchableOpacity
        style={styles.action}
        onPress={onLike}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Animated.View style={{ transform: [{ scale: likeScale }] }}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={isLiked ? colors.like : colors.textTertiary}
          />
        </Animated.View>
        {likesCount > 0 && (
          <Text
            style={[
              styles.count,
              { color: isLiked ? colors.like : colors.textTertiary },
            ]}
          >
            {formatCount(likesCount)}
          </Text>
        )}
      </TouchableOpacity>

      {/* Bookmark */}
      <TouchableOpacity
        style={styles.action}
        onPress={onBookmark}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isBookmarked ? colors.primary : colors.textTertiary}
          />
        </Animated.View>
        {bookmarksCount > 0 && (
          <Text
            style={[
              styles.count,
              { color: isBookmarked ? colors.primary : colors.textTertiary },
            ]}
          >
            {formatCount(bookmarksCount)}
          </Text>
        )}
      </TouchableOpacity>

      {/* Views */}
      <View style={styles.viewsContainer}>
        <Ionicons name="eye-outline" size={16} color={colors.textTertiary} />
        <Text style={[styles.count, { color: colors.textTertiary }]}>
          {formatCount(viewsCount ?? 0)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm + 2,
    gap: Spacing.xxl + 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  count: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
