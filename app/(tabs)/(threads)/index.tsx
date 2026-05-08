import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { DocumentSnapshot } from 'firebase/firestore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { useThreadLikes } from '@/hooks/useThreadLikes';
import { getThreads } from '@/services/api/threadService';
import { Thread } from '@/types/thread';
import { PaginatedResult } from '@/types/common';
import { ThreadCard } from '@/components/thread/ThreadCard';
import { ThreadMenu, ThreadMenuTarget } from '@/components/thread/ThreadMenu';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchBar } from '@/components/ui/SearchBar';
import { useCategoryStore } from '@/stores/categoryStore';
import { useFeedStore } from '@/stores/feedStore';
import { rankFeed } from '@/utils/feedRanking';
import { FeedNativeAd } from '@/components/ads/FeedNativeAd';
import { FEED_AD_INTERVAL } from '@/constants/ads';
import { Spacing, FontSize } from '@/constants/theme';

type ThreadFeedItem = { kind: 'thread'; thread: Thread } | { kind: 'ad'; key: string };

function interleaveThreadAds(threads: Thread[]): ThreadFeedItem[] {
  const result: ThreadFeedItem[] = [];
  threads.forEach((t, idx) => {
    result.push({ kind: 'thread', thread: t });
    if ((idx + 1) % FEED_AD_INTERVAL === 0 && idx + 1 < threads.length) {
      result.push({ kind: 'ad', key: `ad-${idx}` });
    }
  });
  return result;
}

function useThreadsFeed(categoryIds: string[] | undefined, deps: any[]) {
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<DocumentSnapshot | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result: PaginatedResult<Thread> = await getThreads(undefined, categoryIds);
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
      const result: PaginatedResult<Thread> = await getThreads(undefined, categoryIds);
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
      const result: PaginatedResult<Thread> = await getThreads(lastDocRef.current, categoryIds);
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

export default function ThreadsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const selectedCategoryIds = useCategoryStore((s) => s.selectedCategoryIds);
  const [search, setSearch] = useState('');

  // Threads only refetch on mount or explicit pull-to-refresh — not on tab focus.
  const catFilter = selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined;
  const query = useThreadsFeed(catFilter, [selectedCategoryIds]);

  const threadLikes = useThreadLikes();
  const [menuTarget, setMenuTarget] = useState<ThreadMenuTarget | null>(null);
  const hiddenThreadIds = useFeedStore((s) => s.hiddenThreadIds);
  const optimisticThreads = useFeedStore((s) => s.optimisticThreads);
  const clearOptimisticThreads = useFeedStore((s) => s.clearOptimisticThreads);
  const blockedAuthorSet = useMemo(
    () => new Set([...(user?.blockedUids ?? []), ...(user?.mutedUids ?? [])]),
    [user?.blockedUids, user?.mutedUids],
  );
  const hiddenSet = useMemo(() => new Set(hiddenThreadIds), [hiddenThreadIds]);

  useEffect(() => {
    if (query.items.length > 0) {
      threadLikes.checkThreads(query.items.map((t) => t.id));
    }
  }, [query.items]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranked = useMemo(() => {
    const filtered = query.items.filter(
      (t) => !hiddenSet.has(t.id) && !blockedAuthorSet.has(t.authorUid),
    );
    const rankedItems = rankFeed(filtered as any, {
      selectedCategoryIds,
    }) as Thread[];
    // Optimistic threads stay at the very top until the next refresh.
    const visibleOptimistic = optimisticThreads.filter(
      (t) =>
        !blockedAuthorSet.has(t.authorUid) &&
        (selectedCategoryIds.length === 0 ||
          (t.categoryId !== null && selectedCategoryIds.includes(t.categoryId))),
    );
    return [...visibleOptimistic, ...rankedItems];
  }, [
    query.items,
    selectedCategoryIds,
    hiddenSet,
    blockedAuthorSet,
    optimisticThreads,
  ]);

  const handleRefresh = useCallback(async () => {
    await query.refresh();
    clearOptimisticThreads();
  }, [query, clearOptimisticThreads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.author.displayName.toLowerCase().includes(q),
    );
  }, [ranked, search]);

  const filteredWithAds = useMemo(() => interleaveThreadAds(filtered), [filtered]);

  // Scroll the list to the top whenever a new optimistic thread appears,
  // so the user sees their just-created thread even if scrolled down.
  const listRef = useRef<FlashList<ThreadFeedItem>>(null);
  const lastOptimisticIdRef = useRef<string | undefined>(optimisticThreads[0]?.id);
  useEffect(() => {
    const topId = optimisticThreads[0]?.id;
    if (topId && topId !== lastOptimisticIdRef.current) {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
    lastOptimisticIdRef.current = topId;
  }, [optimisticThreads]);

  const renderItem = useCallback(
    ({ item }: { item: ThreadFeedItem }) => {
      if (item.kind === 'ad') return <FeedNativeAd />;
      const t = item.thread;
      return (
        <ThreadCard
          thread={t}
          onPress={() => router.push(`/(tabs)/(threads)/thread/${t.id}` as any)}
          onLike={() => threadLikes.handleLike(t.id)}
          onMenuPress={() =>
            setMenuTarget({
              kind: 'thread',
              id: t.id,
              authorUid: t.authorUid,
              authorUsername: t.author.username,
            })
          }
          isLiked={threadLikes.likedIds.has(t.id)}
          likeDelta={threadLikes.likeDelta(t.id)}
        />
      );
    },
    [router, threadLikes],
  );

  const handleCreate = () => {
    if (!user) {
      Alert.alert('ログインが必要です', 'スレッドを作成するにはログインしてください', [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'ログイン', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    router.push('/create-thread' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchWrapper}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="スレッドを検索..."
        />
      </View>

      {query.loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={filteredWithAds}
          renderItem={renderItem}
          keyExtractor={(item) => (item.kind === 'ad' ? item.key : item.thread.id)}
          onEndReached={() => query.hasMore && query.fetchMore()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={query.refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="スレッドがありません"
              description="最初のスレッドを作成してみましょう"
            />
          }
        />
      )}

      <FloatingActionButton icon="create-outline" onPress={handleCreate} />

      {menuTarget && (
        <ThreadMenu
          target={menuTarget}
          visible={true}
          onClose={() => setMenuTarget(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrapper: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  loading: { flex: 1, justifyContent: 'center' },
});
