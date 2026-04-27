import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTweetImpressions } from '@/hooks/useTweetImpressions';
import { useAuthStore } from '@/stores/authStore';
import { getUserProfile } from '@/services/api/userService';
import { getUserTweets } from '@/services/api/tweetService';
import { isFollowing, toggleFollow } from '@/services/api/followService';
import { User } from '@/types/user';
import { Tweet } from '@/types/tweet';
import { UserProfileHeader } from '@/components/user/UserProfileHeader';
import { TweetCard } from '@/components/tweet/TweetCard';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';

export default function UserProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const impressions = useTweetImpressions();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<User | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
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
        const followStatus = await isFollowing(currentUser.uid, userId);
        setFollowing(followStatus);
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleToggleFollow = async () => {
    if (!currentUser || !userId) return;
    try {
      const result = await toggleFollow(currentUser.uid, userId);
      setFollowing(result);
    } catch {
      // silently fail
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Tweet }) => (
      <TweetCard
        tweet={item}
        onPress={() => router.push(`/(tabs)/(home)/tweet/${item.id}`)}
      />
    ),
    [router],
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
        onViewableItemsChanged={impressions.onViewableItemsChanged}
        viewabilityConfig={impressions.viewabilityConfig}
        ListHeaderComponent={
          profile ? (
            <UserProfileHeader
              user={profile}
              isOwnProfile={currentUser?.uid === userId}
              isFollowing={following}
              onFollow={handleToggleFollow}
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="投稿がまだありません"
            description="このユーザーはまだ投稿していません。"
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
