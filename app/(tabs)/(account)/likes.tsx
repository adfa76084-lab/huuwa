import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useTweetInteractions } from '@/hooks/useTweetInteractions';
import { useThreadLikes } from '@/hooks/useThreadLikes';
import { useTweetImpressions } from '@/hooks/useTweetImpressions';
import { getUserLikes } from '@/services/api/likeService';
import { getUserThreadLikes } from '@/services/api/threadLikeService';
import { getTweet } from '@/services/api/tweetService';
import { getThread } from '@/services/api/threadService';
import { Tweet } from '@/types/tweet';
import { Thread } from '@/types/thread';
import { TweetCard } from '@/components/tweet/TweetCard';
import { ThreadCard } from '@/components/thread/ThreadCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { CommentBottomSheet } from '@/components/tweet/CommentBottomSheet';
import { Spacing } from '@/constants/theme';

const SEGMENTS = ['投稿', 'スレッド'];

export default function LikesScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [selectedTab, setSelectedTab] = useState(0);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const interactions = useTweetInteractions();
  const threadLikes = useThreadLikes();
  const impressions = useTweetImpressions();
  const [commentTweetId, setCommentTweetId] = useState<string | null>(null);
  const [commentTweet, setCommentTweet] = useState<Tweet | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [tweetLikesResult, threadLikesResult] = await Promise.all([
        getUserLikes(user.uid),
        getUserThreadLikes(user.uid),
      ]);
      const [tweetsData, threadsData] = await Promise.all([
        Promise.all(tweetLikesResult.items.map((l) => getTweet(l.tweetId))),
        Promise.all(threadLikesResult.items.map((l) => getThread(l.threadId))),
      ]);
      setTweets(tweetsData.filter((t): t is Tweet => t !== null));
      setThreads(threadsData.filter((t): t is Thread => t !== null));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (tweets.length > 0) {
      interactions.checkTweets(tweets.map((t) => t.id));
    }
  }, [tweets]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (threads.length > 0) {
      threadLikes.checkThreads(threads.map((t) => t.id));
    }
  }, [threads]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const handleTweetLikeToggle = useCallback(
    async (tweetId: string) => {
      setTweets((prev) => prev.filter((t) => t.id !== tweetId));
      await interactions.handleLike(tweetId);
    },
    [interactions],
  );

  const handleThreadLikeToggle = useCallback(
    async (threadId: string) => {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      await threadLikes.handleLike(threadId);
    },
    [threadLikes],
  );

  const renderTweet = useCallback(
    ({ item }: { item: Tweet }) => (
      <TweetCard
        tweet={item}
        onPress={() => router.push(`/(tabs)/(home)/tweet/${item.id}`)}
        onLike={() => handleTweetLikeToggle(item.id)}
        onBookmark={() => interactions.handleBookmark(item.id)}
        onReply={() => {
          setCommentTweet(item);
          setCommentTweetId(item.id);
        }}
        isLiked={true}
        isBookmarked={interactions.bookmarkedIds.has(item.id)}
        likeDelta={interactions.likeDelta(item.id)}
        bookmarkDelta={interactions.bookmarkDelta(item.id)}
      />
    ),
    [router, interactions, handleTweetLikeToggle],
  );

  const renderThread = useCallback(
    ({ item }: { item: Thread }) => (
      <ThreadCard
        thread={item}
        onPress={() => router.push(`/(tabs)/(home)/thread/${item.id}`)}
        onLike={() => handleThreadLikeToggle(item.id)}
        isLiked={true}
        likeDelta={threadLikes.likeDelta(item.id)}
      />
    ),
    [router, handleThreadLikeToggle],
  );

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.segmentWrapper}>
        <SegmentedControl
          segments={SEGMENTS}
          selectedIndex={selectedTab}
          onSelect={setSelectedTab}
        />
      </View>

      {selectedTab === 0 ? (
        <FlashList
          data={tweets}
          renderItem={renderTweet}
          keyExtractor={(item) => item.id}
          extraData={[interactions.likedIds, interactions.bookmarkedIds]}
          onViewableItemsChanged={impressions.onViewableItemsChanged}
          viewabilityConfig={impressions.viewabilityConfig}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="いいねした投稿がありません"
              description="いいねした投稿がここに表示されます。"
            />
          }
        />
      ) : (
        <FlashList
          data={threads}
          renderItem={renderThread}
          keyExtractor={(item) => item.id}
          extraData={[threadLikes.likedIds]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="いいねしたスレッドがありません"
              description="いいねしたスレッドがここに表示されます。"
            />
          }
        />
      )}

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
  segmentWrapper: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
