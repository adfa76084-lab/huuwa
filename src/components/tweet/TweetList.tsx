import React, { useCallback, useRef } from 'react';
import { View, RefreshControl, StyleSheet, ViewToken } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Tweet } from '@/types/tweet';
import { TweetCard } from './TweetCard';
import { LoadingIndicator, EmptyState } from '@/components/ui';
import { toggleLike } from '@/services/api/likeService';
import { toggleBookmark } from '@/services/api/bookmarkService';
import { recordTweetImpression } from '@/services/api/tweetService';
import { Spacing } from '@/constants/theme';

interface TweetListProps {
  tweets: Tweet[];
  likedIds?: Set<string>;
  bookmarkedIds?: Set<string>;
  likeDelta?: (tweetId: string) => number;
  bookmarkDelta?: (tweetId: string) => number;
  isLoading?: boolean;
  isRefreshing?: boolean;
  isLoadingMore?: boolean;
  isError?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onTweetPress?: (tweet: Tweet) => void;
  onProfilePress?: (tweet: Tweet) => void;
  basePath?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
}

export function TweetList({
  tweets,
  likedIds = new Set(),
  bookmarkedIds = new Set(),
  likeDelta,
  bookmarkDelta,
  isLoading = false,
  isRefreshing = false,
  isLoadingMore = false,
  isError = false,
  error,
  onRefresh,
  onEndReached,
  onTweetPress,
  onProfilePress,
  basePath = '/(tabs)/(global)',
  emptyTitle = 'まだ投稿がありません',
  emptyMessage,
  ListHeaderComponent,
  ListEmptyComponent,
}: TweetListProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();

  const handleTweetPress = useCallback(
    (tweet: Tweet) => {
      if (onTweetPress) {
        onTweetPress(tweet);
      } else {
        router.push(`${basePath}/tweet/${tweet.id}` as any);
      }
    },
    [onTweetPress, basePath, router]
  );

  const handleProfilePress = useCallback(
    (tweet: Tweet) => {
      if (onProfilePress) {
        onProfilePress(tweet);
      } else {
        router.push(`${basePath}/profile/${tweet.authorUid}` as any);
      }
    },
    [onProfilePress, basePath, router]
  );

  const handleLike = useCallback(
    (tweet: Tweet) => {
      if (user?.uid) {
        toggleLike(user.uid, tweet.id);
      }
    },
    [user?.uid]
  );

  const handleBookmark = useCallback(
    (tweet: Tweet) => {
      if (user?.uid) {
        toggleBookmark(user.uid, tweet.id);
      }
    },
    [user?.uid]
  );

  const renderItem = useCallback(
    ({ item }: { item: Tweet }) => (
      <TweetCard
        tweet={item}
        onPress={() => handleTweetPress(item)}
        onProfilePress={() => handleProfilePress(item)}
        onLike={() => handleLike(item)}
        onReply={() => handleTweetPress(item)}
        onBookmark={() => handleBookmark(item)}
        isLiked={likedIds.has(item.id)}
        isBookmarked={bookmarkedIds.has(item.id)}
        likeDelta={likeDelta?.(item.id) ?? 0}
        bookmarkDelta={bookmarkDelta?.(item.id) ?? 0}
      />
    ),
    [handleTweetPress, handleProfilePress, handleLike, handleBookmark, likedIds, bookmarkedIds, likeDelta, bookmarkDelta]
  );

  // Record impressions when tweets become visible
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!user?.uid) return;
      for (const vi of viewableItems) {
        if (vi.isViewable && vi.item) {
          recordTweetImpression(user.uid, (vi.item as Tweet).id);
        }
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000,
  }).current;

  const defaultEmptyComponent = isLoading ? (
    <LoadingIndicator fullScreen />
  ) : isError ? (
    <EmptyState
      icon="alert-circle-outline"
      title="エラーが発生しました"
      description={error ?? '投稿を読み込めませんでした'}
    />
  ) : (
    <EmptyState
      icon="document-text-outline"
      title={emptyTitle}
      description={emptyMessage}
    />
  );

  return (
    <FlashList
      data={tweets}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        ) : undefined
      }
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent ?? defaultEmptyComponent}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footer}>
            <LoadingIndicator />
          </View>
        ) : null
      }
      contentContainerStyle={{ backgroundColor: colors.background }}
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: Spacing.md,
  },
});
