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
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchBar } from '@/components/ui/SearchBar';
import { useCategoryStore } from '@/stores/categoryStore';
import { useFeedStore } from '@/stores/feedStore';
import { rankFeed } from '@/utils/feedRanking';
import { Spacing, FontSize } from '@/constants/theme';
import { showInterstitial } from '@/services/ads/interstitialManager';

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
  const hiddenThreadIds = useFeedStore((s) => s.hiddenThreadIds);
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
    return rankFeed(filtered as any, {
      selectedCategoryIds,
    }) as Thread[];
  }, [query.items, selectedCategoryIds, hiddenSet, blockedAuthorSet]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.author.displayName.toLowerCase().includes(q),
    );
  }, [ranked, search]);

  const renderItem = useCallback(
    ({ item }: { item: Thread }) => (
      <ThreadCard
        thread={item}
        onPress={() => router.push(`/(tabs)/(home)/thread/${item.id}`)}
        onLike={() => threadLikes.handleLike(item.id)}
        isLiked={threadLikes.likedIds.has(item.id)}
        likeDelta={threadLikes.likeDelta(item.id)}
      />
    ),
    [router, threadLikes],
  );

  const handleCreate = async () => {
    if (!user) {
      Alert.alert('ログインが必要です', 'スレッドを作成するにはログインしてください', [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'ログイン', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    await showInterstitial();
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
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          onEndReached={() => query.hasMore && query.fetchMore()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} />
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
