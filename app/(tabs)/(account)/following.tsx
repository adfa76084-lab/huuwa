import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { getFollowing } from '@/services/api/followService';
import { getUserProfile } from '@/services/api/userService';
import { UserProfile } from '@/types/user';
import { UserListItem } from '@/components/user/UserListItem';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FollowingScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFollowing = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getFollowing(user.uid);
      const profilePromises = result.items.map(async (follow) => {
        const profile = await getUserProfile(follow.followingUid);
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
      setFollowing(profiles.filter((p): p is UserProfile => p !== null));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFollowing();
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
        data={following}
        renderItem={renderItem}
        keyExtractor={(item) => item.uid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="フォロー中のユーザーがいません"
            description="フォローする人を見つけましょう！"
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
