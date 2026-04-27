import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useInfiniteQuery } from '@/hooks/useInfiniteQuery';
import { useTweetInteractions } from '@/hooks/useTweetInteractions';
import { useTweetImpressions } from '@/hooks/useTweetImpressions';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { getUserTweets } from '@/services/api/tweetService';
import { getUserThreads } from '@/services/api/threadService';
import { getCreatedOpenChats } from '@/services/api/chatService';
import { OpenChatCard } from '@/components/chat/OpenChatCard';
import { ChatRoom } from '@/types/chat';
import { getUserShorts, getUserLikedShorts, getShort, ShortLike } from '@/services/api/shortService';
import { getUserShortBookmarks } from '@/services/api/shortBookmarkService';
import { Tweet } from '@/types/tweet';
import { Thread } from '@/types/thread';
import { ShortVideo, ShortBookmark } from '@/types/short';
import { UserProfileHeader } from '@/components/user/UserProfileHeader';
import { AccountDrawer } from '@/components/user/AccountDrawer';
import { TweetCard } from '@/components/tweet/TweetCard';
import { ThreadCard } from '@/components/thread/ThreadCard';
import { ShortVideoThumbnail, COLUMN_COUNT, GAP } from '@/components/short/ShortVideoThumbnail';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { CommentBottomSheet } from '@/components/tweet/CommentBottomSheet';
import { useCategoryStore } from '@/stores/categoryStore';
import { getCategories, getUserCategories } from '@/services/api/categoryService';
import { Category } from '@/types/category';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';

const SEGMENTS = ['投稿', 'スレッド', 'オープンチャット'];
const VIDEO_SUB_TABS = ['投稿', 'いいね', '保存'] as const;

function VideoSubTabs({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={videoSubTabStyles.container}>
      {VIDEO_SUB_TABS.map((label, i) => {
        const active = i === selected;
        return (
          <TouchableOpacity
            key={label}
            style={[
              videoSubTabStyles.tab,
              active && { borderBottomColor: colors.primary },
            ]}
            onPress={() => onSelect(i)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                videoSubTabStyles.label,
                { color: active ? colors.primary : colors.textSecondary },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const videoSubTabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});

export default function MyProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [selectedTab, setSelectedTab] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const selectedCategoryIds = useCategoryStore((s) => s.selectedCategoryIds);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([getCategories(), getUserCategories()])
      .then(([defaults, userCats]) => setAllCategories([...defaults, ...userCats]))
      .catch(() => {});
  }, [user]);

  const joinedCategories = useMemo(
    () => allCategories.filter((c) => selectedCategoryIds.includes(c.id)),
    [allCategories, selectedCategoryIds],
  );

  // Tweets
  const tweets = useInfiniteQuery<Tweet>({
    queryFn: (lastDoc) => getUserTweets(user?.uid ?? '', lastDoc),
  });
  const { refreshing: tweetRefreshing, onRefresh: onTweetRefresh } = useRefreshControl(tweets.refresh);
  const interactions = useTweetInteractions();
  const impressions = useTweetImpressions();

  // Threads
  const threads = useInfiniteQuery<Thread>({
    queryFn: (lastDoc) => getUserThreads(user?.uid ?? '', lastDoc),
  });
  const { refreshing: threadRefreshing, onRefresh: onThreadRefresh } = useRefreshControl(threads.refresh);

  // Created open chats
  const [createdOpenChats, setCreatedOpenChats] = useState<ChatRoom[]>([]);
  const [openChatsLoading, setOpenChatsLoading] = useState(false);
  const fetchOpenChats = useCallback(async () => {
    if (!user) return;
    setOpenChatsLoading(true);
    try {
      const rooms = await getCreatedOpenChats(user.uid);
      setCreatedOpenChats(rooms);
    } finally {
      setOpenChatsLoading(false);
    }
  }, [user]);
  const { refreshing: openChatRefreshing, onRefresh: onOpenChatRefresh } = useRefreshControl(fetchOpenChats);

  // Shorts – sub-tabs: 投稿, いいね, 保存
  const [videoSubTab, setVideoSubTab] = useState(0);

  // My shorts (投稿)
  const shorts = useInfiniteQuery<ShortVideo>({
    queryFn: (lastDoc) => getUserShorts(user?.uid ?? '', lastDoc),
  });
  const { refreshing: shortRefreshing, onRefresh: onShortRefresh } = useRefreshControl(shorts.refresh);

  // Liked shorts (いいね) – fetch like docs then hydrate
  const likedShortDocs = useInfiniteQuery<ShortLike>({
    queryFn: (lastDoc) => getUserLikedShorts(user?.uid ?? '', lastDoc),
  });
  const [likedShorts, setLikedShorts] = useState<ShortVideo[]>([]);
  const [likedShortsLoading, setLikedShortsLoading] = useState(false);
  const { refreshing: likedRefreshing, onRefresh: onLikedRefresh } = useRefreshControl(likedShortDocs.refresh);

  // Saved shorts (保存) – fetch bookmark docs then hydrate
  const savedShortDocs = useInfiniteQuery<ShortBookmark>({
    queryFn: (lastDoc) => getUserShortBookmarks(user?.uid ?? '', lastDoc),
  });
  const [savedShorts, setSavedShorts] = useState<ShortVideo[]>([]);
  const [savedShortsLoading, setSavedShortsLoading] = useState(false);
  const { refreshing: savedRefreshing, onRefresh: onSavedRefresh } = useRefreshControl(savedShortDocs.refresh);

  const [commentTweetId, setCommentTweetId] = useState<string | null>(null);
  const [commentTweet, setCommentTweet] = useState<Tweet | null>(null);

  useEffect(() => {
    if (user) {
      tweets.fetchInitial();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch threads/shorts on first tab switch
  const [threadsFetched, setThreadsFetched] = useState(false);
  const [shortsFetched, setShortsFetched] = useState(false);
  const [likedFetched, setLikedFetched] = useState(false);
  const [savedFetched, setSavedFetched] = useState(false);
  const [openChatsFetched, setOpenChatsFetched] = useState(false);

  useEffect(() => {
    if (selectedTab === 1 && !threadsFetched && user) {
      threads.fetchInitial();
      setThreadsFetched(true);
    }
    if (selectedTab === 2 && !openChatsFetched && user) {
      fetchOpenChats();
      setOpenChatsFetched(true);
    }
  }, [selectedTab, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch liked/saved shorts when sub-tab switches
  useEffect(() => {
    if (selectedTab !== 2 || !user) return;
    if (videoSubTab === 1 && !likedFetched) {
      likedShortDocs.fetchInitial();
      setLikedFetched(true);
    }
    if (videoSubTab === 2 && !savedFetched) {
      savedShortDocs.fetchInitial();
      setSavedFetched(true);
    }
  }, [selectedTab, videoSubTab, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydrate liked shorts
  useEffect(() => {
    if (likedShortDocs.items.length === 0) return;
    setLikedShortsLoading(true);
    Promise.all(likedShortDocs.items.map((doc) => getShort(doc.shortId)))
      .then((results) => {
        setLikedShorts(results.filter((s): s is ShortVideo => s !== null));
      })
      .finally(() => setLikedShortsLoading(false));
  }, [likedShortDocs.items]);

  // Hydrate saved shorts
  useEffect(() => {
    if (savedShortDocs.items.length === 0) return;
    setSavedShortsLoading(true);
    Promise.all(savedShortDocs.items.map((doc) => getShort(doc.shortId)))
      .then((results) => {
        setSavedShorts(results.filter((s): s is ShortVideo => s !== null));
      })
      .finally(() => setSavedShortsLoading(false));
  }, [savedShortDocs.items]);

  useEffect(() => {
    if (tweets.items.length > 0) {
      interactions.checkTweets(tweets.items.map((t) => t.id));
    }
  }, [tweets.items]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderTweet = useCallback(
    ({ item }: { item: Tweet }) => (
      <TweetCard
        tweet={item}
        onPress={() => router.push(`/(tabs)/(home)/tweet/${item.id}`)}
        onLike={() => interactions.handleLike(item.id)}
        onBookmark={() => interactions.handleBookmark(item.id)}
        onReply={() => {
          setCommentTweet(item);
          setCommentTweetId(item.id);
        }}
        isLiked={interactions.likedIds.has(item.id)}
        isBookmarked={interactions.bookmarkedIds.has(item.id)}
        likeDelta={interactions.likeDelta(item.id)}
        bookmarkDelta={interactions.bookmarkDelta(item.id)}
      />
    ),
    [router, interactions],
  );

  const renderThread = useCallback(
    ({ item }: { item: Thread }) => (
      <ThreadCard
        thread={item}
        onPress={() => router.push(`/(tabs)/(home)/thread/${item.id}`)}
      />
    ),
    [router],
  );

  const renderShort = useCallback(
    ({ item }: { item: ShortVideo }) => (
      <ShortVideoThumbnail
        short={item}
        onPress={() => router.push(`/(tabs)/(shorts)`)}
      />
    ),
    [router],
  );

  const headerComponent = useMemo(
    () => (
      <>
        {user && (
          <UserProfileHeader
            user={user}
            isOwnProfile
            onEditProfile={() => router.push('/(tabs)/(account)/edit-profile')}
            onFollowers={() => router.push('/(tabs)/(account)/followers')}
            onFollowing={() => router.push('/(tabs)/(account)/following')}
          />
        )}
        <View style={[styles.categoriesSection, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.categoriesHeader}>
            <Ionicons name="albums-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.categoriesTitle, { color: colors.text }]}>
              所属しているカテゴリー
            </Text>
            {selectedCategoryIds.length > 0 && (
              <Text style={[styles.categoriesCount, { color: colors.textTertiary }]}>
                {joinedCategories.length}
              </Text>
            )}
          </View>
          {selectedCategoryIds.length === 0 ? (
            <View style={styles.categoriesWrap}>
              <View
                style={[
                  styles.categoryChip,
                  { backgroundColor: colors.primary + '14', borderColor: colors.primary + '40' },
                ]}
              >
                <Ionicons name="grid" size={14} color={colors.primary} />
                <Text style={[styles.categoryChipText, { color: colors.text }]} numberOfLines={1}>
                  すべてのカテゴリー
                </Text>
              </View>
            </View>
          ) : joinedCategories.length > 0 ? (
            <View style={styles.categoriesWrap}>
              {joinedCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, { backgroundColor: cat.color + '14', borderColor: cat.color + '40' }]}
                  onPress={() => router.push(`/(tabs)/(categories)/${cat.id}` as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                  <Text style={[styles.categoryChipText, { color: colors.text }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={[styles.categoriesEmpty, { color: colors.textTertiary }]}>
              まだカテゴリーに所属していません
            </Text>
          )}
        </View>
        <View style={styles.segmentWrapper}>
          <SegmentedControl
            segments={SEGMENTS}
            selectedIndex={selectedTab}
            onSelect={setSelectedTab}
          />
        </View>
      </>
    ),
    [user, selectedTab, router, joinedCategories, colors],
  );

  if (!user) {
    return <LoginPrompt description="プロフィールや投稿を見るにはログインが必要です" />;
  }

  if (tweets.isLoading && selectedTab === 0) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <IconButton
              name="chevron-back"
              onPress={() => router.replace('/(tabs)/(home)')}
            />
          ),
          headerRight: () => (
            <IconButton
              name="search-outline"
              onPress={() => router.push('/(tabs)/(account)/search')}
            />
          ),
        }}
      />

      {selectedTab === 0 && (
        <FlashList
          data={tweets.items}
          renderItem={renderTweet}
          keyExtractor={(item) => item.id}
          extraData={[interactions.likedIds, interactions.bookmarkedIds]}
          onViewableItemsChanged={impressions.onViewableItemsChanged}
          viewabilityConfig={impressions.viewabilityConfig}
          onEndReached={() => tweets.hasMore && tweets.fetchMore()}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={headerComponent}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="投稿がありません"
              description="最初の投稿をしてみましょう！"
              actionLabel="投稿する"
              onAction={() => router.push('/compose-tweet')}
            />
          }
          refreshControl={
            <RefreshControl refreshing={tweetRefreshing} onRefresh={onTweetRefresh} />
          }
        />
      )}

      {selectedTab === 1 && (
        <FlashList
          data={threads.items}
          renderItem={renderThread}
          keyExtractor={(item) => item.id}
          onEndReached={() => threads.hasMore && threads.fetchMore()}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={headerComponent}
          ListEmptyComponent={
            threads.isLoading ? (
              <LoadingIndicator />
            ) : (
              <EmptyState
                icon="chatbubbles-outline"
                title="スレッドがありません"
                description="まだスレッドを作成していません"
              />
            )
          }
          refreshControl={
            <RefreshControl refreshing={threadRefreshing} onRefresh={onThreadRefresh} />
          }
        />
      )}

      {selectedTab === 2 && (
        <FlatList
          data={createdOpenChats}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs }}>
              <OpenChatCard
                room={item}
                onPress={() => router.push(`/(tabs)/(openchat)/${item.id}` as any)}
              />
            </View>
          )}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={headerComponent}
          ListEmptyComponent={
            openChatsLoading ? (
              <LoadingIndicator />
            ) : (
              <EmptyState
                icon="people-outline"
                title="オープンチャットがありません"
                description="まだオープンチャットを作成していません"
              />
            )
          }
          refreshControl={
            <RefreshControl refreshing={openChatRefreshing} onRefresh={onOpenChatRefresh} />
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

      <AccountDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
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
  categoriesSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingVertical: Spacing.md,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  categoriesTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    flex: 1,
  },
  categoriesCount: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    maxWidth: 160,
  },
  categoryChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  categoriesEmpty: {
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.md,
  },
});
