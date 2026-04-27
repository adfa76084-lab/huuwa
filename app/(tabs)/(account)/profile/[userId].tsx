import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, RefreshControl, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTweetImpressions } from '@/hooks/useTweetImpressions';
import { useAuthStore } from '@/stores/authStore';
import {
  getUserProfile,
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
} from '@/services/api/userService';
import { IconButton } from '@/components/ui/IconButton';
import { getUserTweets } from '@/services/api/tweetService';
import { getUserThreads } from '@/services/api/threadService';
import { getUserShorts } from '@/services/api/shortService';
import { isFollowing, toggleFollow, hasPendingFollowRequest } from '@/services/api/followService';
import { User } from '@/types/user';
import { Tweet } from '@/types/tweet';
import { Thread } from '@/types/thread';
import { ShortVideo } from '@/types/short';
import { UserProfileHeader } from '@/components/user/UserProfileHeader';
import { TweetCard } from '@/components/tweet/TweetCard';
import { ThreadCard } from '@/components/thread/ThreadCard';
import { ShortVideoThumbnail, COLUMN_COUNT, GAP } from '@/components/short/ShortVideoThumbnail';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing } from '@/constants/theme';

const SEGMENTS = ['投稿', 'スレッド', '動画'];

export default function UserProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const impressions = useTweetImpressions();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const isBlocked = useMemo(
    () => !!currentUser?.blockedUids?.includes(userId ?? ''),
    [currentUser?.blockedUids, userId],
  );
  const isMuted = useMemo(
    () => !!currentUser?.mutedUids?.includes(userId ?? ''),
    [currentUser?.mutedUids, userId],
  );

  const handleMoreMenu = useCallback(() => {
    if (!currentUser || !userId || currentUser.uid === userId) return;
    Alert.alert(
      'オプション',
      undefined,
      [
        {
          text: isMuted ? 'ミュート解除' : 'ミュート',
          onPress: async () => {
            try {
              if (isMuted) {
                await unmuteUser(currentUser.uid, userId);
                updateUser({
                  mutedUids: (currentUser.mutedUids ?? []).filter((id) => id !== userId),
                });
              } else {
                await muteUser(currentUser.uid, userId);
                updateUser({
                  mutedUids: [...(currentUser.mutedUids ?? []), userId],
                });
              }
            } catch {
              Alert.alert('エラー', '操作に失敗しました');
            }
          },
        },
        {
          text: isBlocked ? 'ブロック解除' : 'ブロック',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isBlocked) {
                await unblockUser(currentUser.uid, userId);
                updateUser({
                  blockedUids: (currentUser.blockedUids ?? []).filter((id) => id !== userId),
                });
              } else {
                await blockUser(currentUser.uid, userId);
                updateUser({
                  blockedUids: [...(currentUser.blockedUids ?? []), userId],
                });
              }
            } catch {
              Alert.alert('エラー', '操作に失敗しました');
            }
          },
        },
        { text: 'キャンセル', style: 'cancel' },
      ],
    );
  }, [currentUser, userId, isMuted, isBlocked, updateUser]);

  const [profile, setProfile] = useState<User | null>(null);
  const [following, setFollowing] = useState(false);
  const [followRequested, setFollowRequested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);

  // Tweets
  const [tweets, setTweets] = useState<Tweet[]>([]);
  // Threads
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsFetched, setThreadsFetched] = useState(false);
  // Shorts
  const [shorts, setShorts] = useState<ShortVideo[]>([]);
  const [shortsLoading, setShortsLoading] = useState(false);
  const [shortsFetched, setShortsFetched] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const [profileData, tweetsData] = await Promise.all([
        getUserProfile(userId),
        getUserTweets(userId),
      ]);
      setProfile(profileData);
      setTweets(tweetsData.items);
      if (currentUser) {
        const [followStatus, requested] = await Promise.all([
          isFollowing(currentUser.uid, userId),
          hasPendingFollowRequest(currentUser.uid, userId),
        ]);
        setFollowing(followStatus);
        setFollowRequested(requested);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch threads on first tab switch
  useEffect(() => {
    if (selectedTab === 1 && !threadsFetched && userId) {
      setThreadsLoading(true);
      getUserThreads(userId)
        .then((res) => setThreads(res.items))
        .catch(() => {})
        .finally(() => {
          setThreadsLoading(false);
          setThreadsFetched(true);
        });
    }
    if (selectedTab === 2 && !shortsFetched && userId) {
      setShortsLoading(true);
      getUserShorts(userId)
        .then((res) => setShorts(res.items))
        .catch(() => {})
        .finally(() => {
          setShortsLoading(false);
          setShortsFetched(true);
        });
    }
  }, [selectedTab, userId, threadsFetched, shortsFetched]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (!userId) {
      setRefreshing(false);
      return;
    }
    try {
      if (selectedTab === 0) {
        await fetchData();
      } else if (selectedTab === 1) {
        const res = await getUserThreads(userId);
        setThreads(res.items);
      } else {
        const res = await getUserShorts(userId);
        setShorts(res.items);
      }
    } catch {
      // silently fail
    }
    setRefreshing(false);
  };

  const handleToggleFollow = async () => {
    if (!currentUser || !userId || !profile) return;
    try {
      const result = await toggleFollow(currentUser.uid, userId, profile.isPrivate ?? false);
      if (result.status === 'followed') {
        setFollowing(true);
        setFollowRequested(false);
      } else if (result.status === 'unfollowed') {
        setFollowing(false);
        setFollowRequested(false);
      } else if (result.status === 'requested') {
        setFollowRequested(true);
      } else if (result.status === 'cancelled') {
        setFollowRequested(false);
      }
    } catch {
      // silently fail
    }
  };

  const renderTweet = useCallback(
    ({ item }: { item: Tweet }) => (
      <TweetCard
        tweet={item}
        onPress={() => router.push(`/(tabs)/(home)/tweet/${item.id}`)}
      />
    ),
    [router],
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
        {profile && (
          <UserProfileHeader
            user={profile}
            isOwnProfile={currentUser?.uid === userId}
            isFollowing={following}
            followRequested={followRequested}
            onFollow={handleToggleFollow}
          />
        )}
        <View style={styles.segmentWrapper}>
          <SegmentedControl
            segments={SEGMENTS}
            selectedIndex={selectedTab}
            onSelect={setSelectedTab}
          />
        </View>
      </>
    ),
    [profile, currentUser, userId, following, selectedTab, handleToggleFollow],
  );

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  if (profile?.disabled) {
    return (
      <View style={[styles.container, styles.disabledContainer, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="person-remove-outline"
          title="このアカウントは無効化されています"
          description="このユーザーは現在アカウントを無効化しています"
        />
      </View>
    );
  }

  const isPrivateLocked =
    profile?.isPrivate &&
    currentUser?.uid !== userId &&
    !following;

  if (isPrivateLocked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {profile && (
          <UserProfileHeader
            user={profile}
            isOwnProfile={false}
            isFollowing={following}
            followRequested={followRequested}
            onFollow={handleToggleFollow}
          />
        )}
        <View style={styles.privateMessage}>
          <EmptyState
            icon="lock-closed-outline"
            title="このアカウントは非公開です"
            description="フォローが承認されるとポストが表示されます"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {currentUser?.uid !== userId && (
        <Stack.Screen
          options={{
            headerRight: () => (
              <IconButton name="ellipsis-horizontal" onPress={handleMoreMenu} />
            ),
          }}
        />
      )}
      {selectedTab === 0 && (
        <FlashList
          data={tweets}
          renderItem={renderTweet}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={impressions.onViewableItemsChanged}
          viewabilityConfig={impressions.viewabilityConfig}
          ListHeaderComponent={headerComponent}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="投稿がありません"
              description="まだ投稿がありません"
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {selectedTab === 1 && (
        <FlashList
          data={threads}
          renderItem={renderThread}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={headerComponent}
          ListEmptyComponent={
            threadsLoading ? (
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {selectedTab === 2 && (
        <FlatList
          data={shorts}
          renderItem={renderShort}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          columnWrapperStyle={{ gap: GAP }}
          ListHeaderComponent={headerComponent}
          ListEmptyComponent={
            shortsLoading ? (
              <LoadingIndicator />
            ) : (
              <EmptyState
                icon="videocam-outline"
                title="動画がありません"
                description="まだ動画を投稿していません"
              />
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
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
  disabledContainer: {
    justifyContent: 'center',
  },
  privateMessage: {
    flex: 1,
    justifyContent: 'center',
  },
});
