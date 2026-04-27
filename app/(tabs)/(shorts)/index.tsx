import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ViewToken,
  Share,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { getShorts, likeShort } from '@/services/api/shortService';
import { toggleShortBookmark } from '@/services/api/shortBookmarkService';
import { ShortVideo } from '@/types/short';
import { ShortVideoCard, PreloadState } from '@/components/short/ShortVideoCard';
import { ShortCommentSheet } from '@/components/short/ShortCommentSheet';
import { useShortStore } from '@/stores/shortStore';
import { DocumentSnapshot } from 'firebase/firestore';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ShortsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [containerHeight, setContainerHeight] = useState(0);
  const [shorts, setShorts] = useState<ShortVideo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<DocumentSnapshot | undefined>(undefined);
  const hasFetchedRef = useRef(false);
  const [isFocused, setIsFocused] = useState(true);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerHeight(e.nativeEvent.layout.height);
  }, []);

  // Comment sheet
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [selectedShort, setSelectedShort] = useState<ShortVideo | null>(null);

  // Track tab focus for pausing when switching tabs
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  // Initial fetch
  const fetchShorts = useCallback(async () => {
    try {
      const result = await getShorts();
      setShorts(result.items);
      lastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
      // Sync to store
      useShortStore.getState().setShorts(result.items);
      useShortStore.getState().setLastDoc(result.lastDoc);
      useShortStore.getState().setHasMore(result.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      fetchShorts();
      hasFetchedRef.current = true;
    }
  }, [fetchShorts]);

  // Infinite scroll
  const fetchMore = useCallback(async () => {
    if (!hasMore) return;
    try {
      const result = await getShorts(lastDocRef.current);
      setShorts((prev) => [...prev, ...result.items]);
      lastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
      useShortStore.getState().appendShorts(result.items);
      useShortStore.getState().setLastDoc(result.lastDoc);
      useShortStore.getState().setHasMore(result.hasMore);
    } catch {
      // silently fail
    }
  }, [hasMore]);

  // Like
  const handleLike = useCallback(
    async (shortId: string) => {
      if (!user) return;
      try {
        const isNowLiked = await likeShort(user.uid, shortId);
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (isNowLiked) next.add(shortId);
          else next.delete(shortId);
          return next;
        });
        setShorts((prev) =>
          prev.map((s) =>
            s.id === shortId
              ? { ...s, likesCount: s.likesCount + (isNowLiked ? 1 : -1) }
              : s,
          ),
        );
      } catch {
        // silently fail
      }
    },
    [user],
  );

  // Bookmark
  const handleBookmark = useCallback(
    async (shortId: string) => {
      if (!user) return;
      try {
        const isNowBookmarked = await toggleShortBookmark(user.uid, shortId);
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          if (isNowBookmarked) next.add(shortId);
          else next.delete(shortId);
          return next;
        });
      } catch {
        // silently fail
      }
    },
    [user],
  );

  // Comment
  const handleComment = useCallback((short: ShortVideo) => {
    setSelectedShort(short);
    setCommentSheetVisible(true);
  }, []);

  // Profile
  const handleProfile = useCallback(
    (authorUid: string) => {
      router.push(`/(tabs)/(home)/profile/${authorUid}` as any);
    },
    [router],
  );

  // Share
  const handleShare = useCallback(async (short: ShortVideo) => {
    try {
      await Share.share({
        message:
          short.caption || `@${short.author.username} のショート動画をチェック！`,
      });
    } catch {
      // silently fail
    }
  }, []);

  // Comment count update
  const handleCommentCountChange = useCallback(
    (delta: number) => {
      if (!selectedShort) return;
      setShorts((prev) =>
        prev.map((s) =>
          s.id === selectedShort.id
            ? { ...s, commentsCount: Math.max(0, s.commentsCount + delta) }
            : s,
        ),
      );
      setSelectedShort((prev) =>
        prev
          ? { ...prev, commentsCount: Math.max(0, prev.commentsCount + delta) }
          : prev,
      );
    },
    [selectedShort],
  );

  // Viewability tracking
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  // Compute preload state for each item
  const getPreloadState = useCallback(
    (index: number): PreloadState => {
      if (!isFocused) return 'idle';
      if (index === activeIndex) return 'active';
      if (Math.abs(index - activeIndex) <= 1) return 'preload';
      return 'idle';
    },
    [activeIndex, isFocused],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ShortVideo; index: number }) => (
      <ShortVideoCard
        short={item}
        preloadState={getPreloadState(index)}
        itemHeight={containerHeight}
        onLike={() => handleLike(item.id)}
        onComment={() => handleComment(item)}
        onBookmark={() => handleBookmark(item.id)}
        onProfile={() => handleProfile(item.authorUid)}
        onShare={() => handleShare(item)}
        isLiked={likedIds.has(item.id)}
        isBookmarked={bookmarkedIds.has(item.id)}
      />
    ),
    [getPreloadState, containerHeight, handleLike, likedIds, handleBookmark, bookmarkedIds, handleComment, handleProfile, handleShare],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: containerHeight,
      offset: containerHeight * index,
      index,
    }),
    [containerHeight],
  );

  if (loading || containerHeight === 0) {
    return (
      <View style={styles.container} onLayout={onContainerLayout}>
        <LoadingIndicator fullScreen />
      </View>
    );
  }

  if (shorts.length === 0) {
    return (
      <View style={styles.container} onLayout={onContainerLayout}>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="videocam-outline"
            title="ショートがありません"
            description="最初のショート動画を投稿しよう！"
          />
        </View>
        <TouchableOpacity
          style={[styles.createButton, { top: insets.top + 12 }]}
          onPress={() => router.push('/create-short')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <FlatList
        data={shorts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={containerHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        onEndReached={fetchMore}
        onEndReachedThreshold={2}
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
      />

      {/* Create button */}
      <TouchableOpacity
        style={[styles.createButton, { top: insets.top + 12 }]}
        onPress={() => router.push('/create-short')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Comment sheet */}
      <ShortCommentSheet
        visible={commentSheetVisible}
        shortId={selectedShort?.id ?? null}
        commentsCount={selectedShort?.commentsCount ?? 0}
        onClose={() => setCommentSheetVisible(false)}
        onCommentCountChange={handleCommentCountChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
