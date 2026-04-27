import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { DocumentSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { useTweetInteractions } from '@/hooks/useTweetInteractions';
import { useTweetImpressions } from '@/hooks/useTweetImpressions';
import { getTweets, subscribeToTweets } from '@/services/api/tweetService';
import { getThreads, subscribeToThreads } from '@/services/api/threadService';
import { getCategory } from '@/services/api/categoryService';
import { Tweet } from '@/types/tweet';
import { Thread } from '@/types/thread';
import { Category } from '@/types/category';
import { PaginatedResult } from '@/types/common';
import { TweetCard } from '@/components/tweet/TweetCard';
import { ThreadCard } from '@/components/thread/ThreadCard';
import { CommentBottomSheet } from '@/components/tweet/CommentBottomSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';

const SEGMENTS = ['投稿', 'スレッド'];

function useRealtimeFeed<T extends { id: string }>(
  subscribeFn: (callback: (items: T[], lastDoc: DocumentSnapshot | null) => void) => () => void,
  loadMoreFn: (lastDoc?: DocumentSnapshot) => Promise<PaginatedResult<T>>,
  deps: any[],
) {
  const [realtimeItems, setRealtimeItems] = useState<T[]>([]);
  const [paginatedItems, setPaginatedItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const realtimeLastDocRef = useRef<DocumentSnapshot | null>(null);
  const paginatedLastDocRef = useRef<DocumentSnapshot | undefined>(undefined);
  const subscribeFnRef = useRef(subscribeFn);
  subscribeFnRef.current = subscribeFn;
  const loadMoreFnRef = useRef(loadMoreFn);
  loadMoreFnRef.current = loadMoreFn;

  useEffect(() => {
    setLoading(true);
    setPaginatedItems([]);
    paginatedLastDocRef.current = undefined;
    setHasMore(true);

    const unsubscribe = subscribeFnRef.current((newItems, lastDoc) => {
      setRealtimeItems(newItems);
      realtimeLastDocRef.current = lastDoc;
      setLoading(false);
    });

    return unsubscribe;
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => {
    if (paginatedItems.length === 0) return realtimeItems;
    const ids = new Set(realtimeItems.map((t) => t.id));
    return [...realtimeItems, ...paginatedItems.filter((t) => !ids.has(t.id))];
  }, [realtimeItems, paginatedItems]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const cursor = paginatedLastDocRef.current ?? realtimeLastDocRef.current ?? undefined;
      const result = await loadMoreFnRef.current(cursor);
      setPaginatedItems((prev) => [...prev, ...result.items]);
      paginatedLastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  const refresh = useCallback(() => {
    setPaginatedItems([]);
    paginatedLastDocRef.current = undefined;
    setHasMore(true);
  }, []);

  return { items, loading, loadingMore, hasMore, fetchMore, refresh };
}

export default function CategoryDetailScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const { user } = useAuth();

  const [category, setCategory] = useState<Category | null>(null);
  const [selectedSegment, setSelectedSegment] = useState(0);

  const catFilter = categoryId ? [categoryId] : undefined;

  useEffect(() => {
    if (categoryId) {
      getCategory(categoryId).then(setCategory).catch(() => {});
    }
  }, [categoryId]);

  const tweetsQuery = useRealtimeFeed<Tweet>(
    (cb) => subscribeToTweets(cb, catFilter),
    (lastDoc) => getTweets(lastDoc, catFilter),
    [categoryId],
  );

  const threadsQuery = useRealtimeFeed<Thread>(
    (cb) => subscribeToThreads(cb, catFilter),
    (lastDoc) => getThreads(lastDoc, catFilter),
    [categoryId],
  );

  const interactions = useTweetInteractions();
  const impressions = useTweetImpressions();

  useEffect(() => {
    if (tweetsQuery.items.length > 0) {
      interactions.checkTweets(tweetsQuery.items.map((t) => t.id));
    }
  }, [tweetsQuery.items]); // eslint-disable-line react-hooks/exhaustive-deps

  const [commentTweetId, setCommentTweetId] = useState<string | null>(null);
  const [commentTweet, setCommentTweet] = useState<Tweet | null>(null);

  const handleOpenComments = useCallback((tweet: Tweet) => {
    setCommentTweet(tweet);
    setCommentTweetId(tweet.id);
  }, []);

  const renderTweetItem = useCallback(
    ({ item }: { item: Tweet }) => (
      <TweetCard
        tweet={item}
        onPress={() => router.push(`/(tabs)/(categories)/${categoryId}/tweet/${item.id}` as any)}
        onLike={() => interactions.handleLike(item.id)}
        onBookmark={() => interactions.handleBookmark(item.id)}
        onReply={() => handleOpenComments(item)}
        isLiked={interactions.likedIds.has(item.id)}
        isBookmarked={interactions.bookmarkedIds.has(item.id)}
        likeDelta={interactions.likeDelta(item.id)}
        bookmarkDelta={interactions.bookmarkDelta(item.id)}
      />
    ),
    [router, categoryId, interactions, handleOpenComments],
  );

  const renderThreadItem = useCallback(
    ({ item }: { item: Thread }) => (
      <ThreadCard
        thread={item}
        onPress={() => router.push(`/(tabs)/(categories)/${categoryId}/thread/${item.id}` as any)}
      />
    ),
    [router, categoryId],
  );

  const InlineLoading = (
    <View style={styles.inlineLoading}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: category?.name ?? 'Category',
        }}
      />

      {/* Category header */}
      {category && (
        <View style={styles.categoryHeader}>
          <View style={[styles.iconBadge, { backgroundColor: category.color + '14' }]}>
            <Ionicons name={category.icon as any} size={28} color={category.color} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
            {category.description ? (
              <Text style={[styles.categoryDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                {category.description}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      <View style={styles.segmentWrapper}>
        <SegmentedControl
          segments={SEGMENTS}
          selectedIndex={selectedSegment}
          onSelect={setSelectedSegment}
        />
      </View>

      <View style={styles.content}>
        {selectedSegment === 0 && (
          tweetsQuery.loading ? (
            InlineLoading
          ) : (
            <FlashList
              data={tweetsQuery.items}
              renderItem={renderTweetItem}
              keyExtractor={(item) => item.id}
              extraData={[interactions.likedIds, interactions.bookmarkedIds]}
              onViewableItemsChanged={impressions.onViewableItemsChanged}
              viewabilityConfig={impressions.viewabilityConfig}
              onEndReached={() => tweetsQuery.hasMore && tweetsQuery.fetchMore()}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl refreshing={false} onRefresh={tweetsQuery.refresh} />
              }
              ListEmptyComponent={
                <EmptyState
                  icon="chatbubble-outline"
                  title="投稿がまだありません"
                  description="このカテゴリーで最初の投稿をしましょう！"
                />
              }
            />
          )
        )}
        {selectedSegment === 1 && (
          threadsQuery.loading ? (
            InlineLoading
          ) : (
            <FlashList
              data={threadsQuery.items}
              renderItem={renderThreadItem}
              keyExtractor={(item) => item.id}
              onEndReached={() => threadsQuery.hasMore && threadsQuery.fetchMore()}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl refreshing={false} onRefresh={threadsQuery.refresh} />
              }
              ListEmptyComponent={
                <EmptyState
                  icon="chatbubbles-outline"
                  title="スレッドがまだありません"
                  description="このカテゴリーでディスカッションを始めましょう！"
                />
              }
            />
          )
        )}
      </View>

      {selectedSegment === 0 && (
        <FloatingActionButton
          icon="create-outline"
          onPress={() => router.push('/compose-tweet' as any)}
        />
      )}
      {selectedSegment === 1 && (
        <FloatingActionButton
          icon="create-outline"
          onPress={() => router.push('/create-thread' as any)}
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
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  categoryName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  categoryDesc: {
    fontSize: FontSize.sm,
  },
  segmentWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  inlineLoading: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
});
