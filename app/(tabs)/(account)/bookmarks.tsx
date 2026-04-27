import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useTweetInteractions } from '@/hooks/useTweetInteractions';
import { useTweetImpressions } from '@/hooks/useTweetImpressions';
import { getUserBookmarks } from '@/services/api/bookmarkService';
import { getTweet } from '@/services/api/tweetService';
import { Tweet } from '@/types/tweet';
import { TweetCard } from '@/components/tweet/TweetCard';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { CommentBottomSheet } from '@/components/tweet/CommentBottomSheet';

export default function BookmarksScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const interactions = useTweetInteractions();
  const impressions = useTweetImpressions();
  const [commentTweetId, setCommentTweetId] = useState<string | null>(null);
  const [commentTweet, setCommentTweet] = useState<Tweet | null>(null);

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getUserBookmarks(user.uid);
      const tweetPromises = result.items.map((b) => getTweet(b.tweetId));
      const tweetResults = await Promise.all(tweetPromises);
      const validTweets = tweetResults.filter((t): t is Tweet => t !== null);
      setTweets(validTweets);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Check like state for loaded tweets
  useEffect(() => {
    if (tweets.length > 0) {
      interactions.checkTweets(tweets.map((t) => t.id));
    }
  }, [tweets]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookmarks();
    setRefreshing(false);
  };

  const handleBookmarkToggle = useCallback(
    async (tweetId: string) => {
      // Remove from list immediately (optimistic)
      setTweets((prev) => prev.filter((t) => t.id !== tweetId));
      await interactions.handleBookmark(tweetId);
    },
    [interactions],
  );

  const renderItem = useCallback(
    ({ item }: { item: Tweet }) => (
      <TweetCard
        tweet={item}
        onPress={() => router.push(`/(tabs)/(home)/tweet/${item.id}`)}
        onLike={() => interactions.handleLike(item.id)}
        onBookmark={() => handleBookmarkToggle(item.id)}
        onReply={() => {
          setCommentTweet(item);
          setCommentTweetId(item.id);
        }}
        isLiked={interactions.likedIds.has(item.id)}
        isBookmarked={true}
        likeDelta={interactions.likeDelta(item.id)}
        bookmarkDelta={interactions.bookmarkDelta(item.id)}
      />
    ),
    [router, interactions, handleBookmarkToggle],
  );

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={tweets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        extraData={[interactions.likedIds, interactions.bookmarkedIds]}
        onViewableItemsChanged={impressions.onViewableItemsChanged}
        viewabilityConfig={impressions.viewabilityConfig}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="bookmark-outline"
            title="ブックマークがありません"
            description="投稿を保存して後で見つけやすくしましょう。"
          />
        }
      />

      <CommentBottomSheet
        visible={commentTweetId !== null}
        tweetId={commentTweetId}
        tweet={commentTweet}
        onClose={() => {
          setCommentTweetId(null);
          setCommentTweet(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
