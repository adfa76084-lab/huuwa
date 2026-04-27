import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { DocumentSnapshot } from 'firebase/firestore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { useTweetInteractions } from '@/hooks/useTweetInteractions';
import { useTweetImpressions } from '@/hooks/useTweetImpressions';
import { TweetCard } from '@/components/tweet/TweetCard';
import { CommentBottomSheet } from '@/components/tweet/CommentBottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { Tweet } from '@/types/tweet';
import { Hashtag } from '@/types/hashtag';
import {
  subscribeToHashtagFeed,
  getHashtagFeed,
  subscribeToHashtag,
} from '@/services/api/hashtagService';

export default function HashtagScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const decodedTag = decodeURIComponent(tag ?? '');
  const colors = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();

  // Hashtag doc (real-time postCount)
  const [hashtagDoc, setHashtagDoc] = useState<Hashtag | null>(null);

  // Real-time feed
  const [realtimeItems, setRealtimeItems] = useState<Tweet[]>([]);
  const [paginatedItems, setPaginatedItems] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const realtimeLastDocRef = useRef<DocumentSnapshot | null>(null);
  const paginatedLastDocRef = useRef<DocumentSnapshot | undefined>(undefined);

  // Subscribe to hashtag document for real-time postCount
  useEffect(() => {
    if (!decodedTag) return;
    const unsub = subscribeToHashtag(decodedTag, setHashtagDoc);
    return unsub;
  }, [decodedTag]);

  // Subscribe to real-time feed
  useEffect(() => {
    if (!decodedTag) return;
    setLoading(true);
    setPaginatedItems([]);
    paginatedLastDocRef.current = undefined;
    setHasMore(true);

    const unsub = subscribeToHashtagFeed(decodedTag, (items, lastDoc) => {
      setRealtimeItems(items);
      realtimeLastDocRef.current = lastDoc;
      setLoading(false);
    });

    return unsub;
  }, [decodedTag]);

  // Merge real-time + paginated
  const items = useMemo(() => {
    if (paginatedItems.length === 0) return realtimeItems;
    const ids = new Set(realtimeItems.map((t) => t.id));
    return [...realtimeItems, ...paginatedItems.filter((t) => !ids.has(t.id))];
  }, [realtimeItems, paginatedItems]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loadingMore || !decodedTag) return;
    setLoadingMore(true);
    try {
      const cursor = paginatedLastDocRef.current ?? realtimeLastDocRef.current ?? undefined;
      const result = await getHashtagFeed(decodedTag, cursor);
      setPaginatedItems((prev) => [...prev, ...result.items]);
      paginatedLastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, decodedTag]);

  const refresh = useCallback(() => {
    setPaginatedItems([]);
    paginatedLastDocRef.current = undefined;
    setHasMore(true);
  }, []);

  // Like/Bookmark interactions
  const interactions = useTweetInteractions();
  const impressions = useTweetImpressions();

  useEffect(() => {
    if (items.length > 0) {
      interactions.checkTweets(items.map((t) => t.id));
    }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  // Comment bottom sheet
  const [commentTweetId, setCommentTweetId] = useState<string | null>(null);
  const [commentTweet, setCommentTweet] = useState<Tweet | null>(null);

  const handleOpenComments = useCallback((tweet: Tweet) => {
    setCommentTweet(tweet);
    setCommentTweetId(tweet.id);
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentTweetId(null);
    setCommentTweet(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Tweet }) => (
      <TweetCard
        tweet={item}
        onPress={() => router.push(`/(tabs)/(home)/tweet/${item.id}`)}
        onLike={() => interactions.handleLike(item.id)}
        onBookmark={() => interactions.handleBookmark(item.id)}
        onReply={() => handleOpenComments(item)}
        isLiked={interactions.likedIds.has(item.id)}
        isBookmarked={interactions.bookmarkedIds.has(item.id)}
        likeDelta={interactions.likeDelta(item.id)}
        bookmarkDelta={interactions.bookmarkDelta(item.id)}
      />
    ),
    [router, interactions, handleOpenComments],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: `#${decodedTag}`,
        }}
      />

      {/* Header: tag name + post count */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTag, { color: colors.primary }]}>
          #{decodedTag}
        </Text>
        <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
          {hashtagDoc?.postCount ?? 0}件の投稿
        </Text>
      </View>

      {/* Feed */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          extraData={[interactions.likedIds, interactions.bookmarkedIds]}
          onViewableItemsChanged={impressions.onViewableItemsChanged}
          viewabilityConfig={impressions.viewabilityConfig}
          onEndReached={() => hasMore && fetchMore()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="pricetag-outline"
              title="投稿がありません"
              description={`#${decodedTag} のタグが付いた投稿はまだありません`}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      <CommentBottomSheet
        visible={commentTweetId !== null}
        tweetId={commentTweetId}
        tweet={commentTweet}
        onClose={handleCloseComments}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  headerTag: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  headerCount: {
    fontSize: FontSize.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
