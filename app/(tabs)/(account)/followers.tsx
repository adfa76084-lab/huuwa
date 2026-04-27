import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { getFollowers } from '@/services/api/followService';
import { getUserProfile } from '@/services/api/userService';
import { UserProfile } from '@/types/user';
import { UserListItem } from '@/components/user/UserListItem';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FollowersScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFollowers = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getFollowers(user.uid);
      const profilePromises = result.items.map(async (follow) => {
        const profile = await getUserProfile(follow.followerUid);
        if (profile) {
          return {
            uid: profile.uid,
            displayName: profile.displayName,
            username: profile.username,
            avatarUrl: profile.avatarUrl,
          } as UserProfile;
        }
        return null;
      });
      const profiles = await Promise.all(profilePromises);
      setFollowers(profiles.filter((p): p is UserProfile => p !== null));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFollowers();
    setRefreshing(false);
  };

  const renderItem = useCallback(
    ({ item }: { item: UserProfile }) => (
      <UserListItem
        user={item}
        onPress={() => router.push(`/(tabs)/(account)/profile/${item.uid}`)}
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
        data={followers}
        renderItem={renderItem}
        keyExtractor={(item) => item.uid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="まだフォロワーがいません"
            description="フォローされるとここに表示されます。"
          />
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
