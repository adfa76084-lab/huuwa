import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { DocumentSnapshot } from 'firebase/firestore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { useTweetInteractions } from '@/hooks/useTweetInteractions';
import { useTweetImpressions } from '@/hooks/useTweetImpressions';
import {
  getTweets,
  getFollowingTweets,
} from '@/services/api/tweetService';
import { getFollowing } from '@/services/api/followService';
import { Tweet } from '@/types/tweet';
import { PaginatedResult } from '@/types/common';
import { TweetCard } from '@/components/tweet/TweetCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { CommentBottomSheet } from '@/components/tweet/CommentBottomSheet';
import { HomeDrawer } from '@/components/user/HomeDrawer';
import { TrendingHashtags } from '@/components/hashtag/TrendingHashtags';
import { useCategoryStore } from '@/stores/categoryStore';
import { useFeedStore } from '@/stores/feedStore';
import { getCategories, getUserCategories } from '@/services/api/categoryService';
import { Category } from '@/types/category';
import { rankFeed } from '@/utils/feedRanking';
import { FeedNativeAd } from '@/components/ads/FeedNativeAd';
import { FEED_AD_INTERVAL } from '@/constants/ads';
import { Spacing, FontSize } from '@/constants/theme';

const SEGMENTS = ['おすすめ', 'フォロー中'];

type FeedItem = { kind: 'tweet'; tweet: Tweet } | { kind: 'ad'; key: string };

function interleaveAds(tweets: Tweet[]): FeedItem[] {
  const result: FeedItem[] = [];
  tweets.forEach((t, idx) => {
    result.push({ kind: 'tweet', tweet: t });
    if ((idx + 1) % FEED_AD_INTERVAL === 0 && idx + 1 < tweets.length) {
      result.push({ kind: 'ad', key: `ad-${idx}` });
    }
  });
  return result;
}

/**
 * One-shot tweets feed: fetched on mount + on explicit refresh.
 * Items don't reorder when likes/bookmarks change (no realtime listener).
 */
function useTweetsFeed(categoryIds: string[] | undefined, deps: any[]) {
  const [items, setItems] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<DocumentSnapshot | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result: PaginatedResult<Tweet> = await getTweets(undefined, categoryIds);
      setItems(result.items);
      lastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [categoryIds]);

  useEffect(() => {
    load();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result: PaginatedResult<Tweet> = await getTweets(undefined, categoryIds);
      setItems(result.items);
      lastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
    } catch {
      // silently fail
    } finally {
      setRefreshing(false);
    }
  }, [categoryIds]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const result: PaginatedResult<Tweet> = await getTweets(lastDocRef.current, categoryIds);
      setItems((prev) => [...prev, ...result.items]);
      lastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, categoryIds]);

  return { items, loading, refreshing, loadingMore, hasMore, refresh, fetchMore };
}

/** Following feed (tweets authored by followed users) */
function useFollowingFeed(uid: string | undefined) {
  const [items, setItems] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!uid) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const followingResult = await getFollowing(uid);
      const followingUids = followingResult.items.map((f) => f.followingUid);
      const tweets = await getFollowingTweets(followingUids);
      setItems(tweets);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { items, loading, refreshing, refresh };
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();

  const [selectedSegment, setSelectedSegment] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const selectedCategoryIds = useCategoryStore((s) => s.selectedCategoryIds);

  // All categories for the chips row
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  useEffect(() => {
    Promise.all([getCategories(), getUserCategories()])
      .then(([defaults, userCats]) => setAllCategories([...defaults, ...userCats]))
      .catch(() => {});
  }, []);
  const joinedCategories = useMemo(
    () => allCategories.filter((c) => selectedCategoryIds.includes(c.id)),
    [allCategories, selectedCategoryIds],
  );

  const catFilter = selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined;

  // Bump on focus only to refresh local re-ranking inputs (recently-viewed
  // tweets, etc). Network refetch is intentionally NOT tied to this — feed
  // items only change on explicit pull-to-refresh or app restart (mount).
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusKey((k) => k + 1);
    }, []),
  );

  const recommendedQuery = useTweetsFeed(catFilter, [selectedCategoryIds]);
  const followingQuery = useFollowingFeed(user?.uid);

  // Comment bottom sheet
  const [commentTweetId, setCommentTweetId] = useState<string | null>(null);
  const [commentTweet, setCommentTweet] = useState<Tweet | null>(null);
  const handleOpenComments = useCallback((tweet: Tweet) => {
    if (!user) {
      Alert.alert('ログインが必要です', 'コメントを見るにはログインが必要です', [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'ログイン', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    setCommentTweet(tweet);
    setCommentTweetId(tweet.id);
  }, [user, router]);
  const handleCloseComments = useCallback(() => {
    setCommentTweetId(null);
    setCommentTweet(null);
  }, []);

  const interactions = useTweetInteractions();
  const impressions = useTweetImpressions();

  const markTweetViewed = useFeedStore((s) => s.markTweetViewed);
  const hiddenTweetIds = useFeedStore((s) => s.hiddenTweetIds);
  const viewedTweetsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    viewedTweetsRef.current = new Set(useFeedStore.getState().recentlyViewedTweetIds);
  }, [focusKey]);

  const hiddenSet = useMemo(() => new Set(hiddenTweetIds), [hiddenTweetIds]);
  const blockedAuthorSet = useMemo(
    () => new Set([...(user?.blockedUids ?? []), ...(user?.mutedUids ?? [])]),
    [user?.blockedUids, user?.mutedUids],
  );

  const rankedRecommended = useMemo(() => {
    const filtered = recommendedQuery.items.filter(
      (t) => !hiddenSet.has(t.id) && !blockedAuthorSet.has(t.authorUid),
    );
    return rankFeed(filtered as any, {
      recentlyViewedIds: viewedTweetsRef.current,
      selectedCategoryIds,
    }) as Tweet[];
  }, [recommendedQuery.items, focusKey, selectedCategoryIds, hiddenSet, blockedAuthorSet]);

  const filteredFollowing = useMemo(() => {
    return followingQuery.items.filter(
      (t) => !hiddenSet.has(t.id) && !blockedAuthorSet.has(t.authorUid),
    );
  }, [followingQuery.items, hiddenSet, blockedAuthorSet]);

  useEffect(() => {
    const toCheck =
      selectedSegment === 0 ? rankedRecommended : filteredFollowing;
    if (toCheck.length > 0) {
      interactions.checkTweets(toCheck.map((t) => t.id));
    }
  }, [rankedRecommended, filteredFollowing, selectedSegment]); // eslint-disable-line react-hooks/exhaustive-deps

  const recommendedWithAds = useMemo(
    () => interleaveAds(rankedRecommended),
    [rankedRecommended],
  );
  const followingWithAds = useMemo(
    () => interleaveAds(filteredFollowing),
    [filteredFollowing],
  );

  const renderTweetItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if (item.kind === 'ad') return <FeedNativeAd />;
      const t = item.tweet;
      return (
        <TweetCard
          tweet={t}
          onPress={() => {
            markTweetViewed(t.id);
            router.push(`/(tabs)/(home)/tweet/${t.id}`);
          }}
          onLike={() => interactions.handleLike(t.id)}
          onBookmark={() => interactions.handleBookmark(t.id)}
          onReply={() => handleOpenComments(t)}
          isLiked={interactions.likedIds.has(t.id)}
          isBookmarked={interactions.bookmarkedIds.has(t.id)}
          likeDelta={interactions.likeDelta(t.id)}
          bookmarkDelta={interactions.bookmarkDelta(t.id)}
        />
      );
    },
    [router, interactions, handleOpenComments, markTweetViewed],
  );

  const handleCompose = () => {
    if (!user) {
      Alert.alert('ログインが必要です', '投稿するにはログインしてください', [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'ログイン', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    router.push('/compose-tweet' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => setDrawerVisible(true)}
            activeOpacity={0.6}
            hitSlop={10}
          >
            <Avatar uri={user?.avatarUrl ?? null} size={34} />
          </TouchableOpacity>
        </View>

        {/* Joined categories box */}
        {(joinedCategories.length > 0 || selectedCategoryIds.length === 0) && (
          <View style={[styles.catBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.catBoxHeader}>
              <Ionicons name="albums-outline" size={15} color={colors.textSecondary} />
              <Text style={[styles.catBoxTitle, { color: colors.text }]}>
                所属しているカテゴリー
              </Text>
              {selectedCategoryIds.length > 0 && (
                <Text style={[styles.catBoxCount, { color: colors.textTertiary }]}>
                  {joinedCategories.length}
                </Text>
              )}
            </View>
            <View style={styles.catWrap}>
              {selectedCategoryIds.length === 0 ? (
                <View style={[styles.catChip, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '40' }]}>
                  <Ionicons name="grid" size={13} color={colors.primary} />
                  <Text style={[styles.catChipText, { color: colors.text }]} numberOfLines={1}>
                    すべてのカテゴリー
                  </Text>
                </View>
              ) : (
                joinedCategories.map((cat) => (
                  <View
                    key={cat.id}
                    style={[styles.catChip, { backgroundColor: cat.color + '14', borderColor: cat.color + '40' }]}
                  >
                    <Ionicons name={cat.icon as any} size={13} color={cat.color} />
                    <Text style={[styles.catChipText, { color: colors.text }]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </View>
                ))
              )}
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
      </SafeAreaView>

      {selectedSegment === 0 ? (
        <FlashList
          data={recommendedWithAds}
          renderItem={renderTweetItem}
          keyExtractor={(item) => (item.kind === 'ad' ? item.key : item.tweet.id)}
          extraData={[interactions.likedIds, interactions.bookmarkedIds]}
          onViewableItemsChanged={impressions.onViewableItemsChanged}
          viewabilityConfig={impressions.viewabilityConfig}
          onEndReached={() => recommendedQuery.hasMore && recommendedQuery.fetchMore()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={recommendedQuery.refreshing} onRefresh={recommendedQuery.refresh} />
          }
          ListHeaderComponent={<TrendingHashtags />}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-outline"
              title="投稿がまだありません"
              description="最初の投稿をしてみましょう"
            />
          }
        />
      ) : !user ? (
        <View style={styles.promptWrapper}>
          <EmptyState
            icon="log-in-outline"
            title="ログインしてフォローしましょう"
            description="フォロー中の人の投稿をここで見られます"
            actionLabel="ログイン"
            onAction={() => router.push('/(auth)/login')}
          />
        </View>
      ) : (
        <FlashList
          data={followingWithAds}
          renderItem={renderTweetItem}
          keyExtractor={(item) => (item.kind === 'ad' ? item.key : item.tweet.id)}
          extraData={[interactions.likedIds, interactions.bookmarkedIds]}
          onViewableItemsChanged={impressions.onViewableItemsChanged}
          viewabilityConfig={impressions.viewabilityConfig}
          refreshControl={
            <RefreshControl
              refreshing={followingQuery.refreshing}
              onRefresh={followingQuery.refresh}
            />
          }
          ListEmptyComponent={
            followingQuery.loading ? null : (
              <EmptyState
                icon="people-outline"
                title="フォロー中の投稿がありません"
                description="気になる人をフォローすると、ここにその人の投稿が表示されます"
              />
            )
          }
        />
      )}

      <FloatingActionButton icon="create-outline" onPress={handleCompose} />

      <CommentBottomSheet
        visible={commentTweetId !== null}
        tweetId={commentTweetId}
        tweet={commentTweet}
        onClose={handleCloseComments}
      />

      <HomeDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catBox: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  catBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  catBoxTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    flex: 1,
  },
  catBoxCount: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 160,
  },
  catChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  segmentWrapper: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  promptWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
});
