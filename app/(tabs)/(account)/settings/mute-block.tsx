import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import {
  getUsersByUids,
  unblockUser,
  unmuteUser,
} from '@/services/api/userService';
import { User } from '@/types/user';
import { Avatar } from '@/components/ui/Avatar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';

const SEGMENTS = ['ブロック', 'ミュート'];

export default function MuteBlockScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [selectedTab, setSelectedTab] = useState(0);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [mutedUsers, setMutedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [blocked, muted] = await Promise.all([
        getUsersByUids(user.blockedUids ?? []),
        getUsersByUids(user.mutedUids ?? []),
      ]);
      setBlockedUsers(blocked);
      setMutedUsers(muted);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnblock = async (targetUid: string) => {
    if (!user) return;
    try {
      await unblockUser(user.uid, targetUid);
      setBlockedUsers((prev) => prev.filter((u) => u.uid !== targetUid));
      updateUser({
        blockedUids: (user.blockedUids ?? []).filter((id) => id !== targetUid),
      });
    } catch {
      Alert.alert('エラー', 'ブロック解除に失敗しました');
    }
  };

  const handleUnmute = async (targetUid: string) => {
    if (!user) return;
    try {
      await unmuteUser(user.uid, targetUid);
      setMutedUsers((prev) => prev.filter((u) => u.uid !== targetUid));
      updateUser({
        mutedUids: (user.mutedUids ?? []).filter((id) => id !== targetUid),
      });
    } catch {
      Alert.alert('エラー', 'ミュート解除に失敗しました');
    }
  };

  const currentList = selectedTab === 0 ? blockedUsers : mutedUsers;
  const actionLabel = selectedTab === 0 ? 'ブロック解除' : 'ミュート解除';
  const actionHandler = selectedTab === 0 ? handleUnblock : handleUnmute;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.segmentWrapper}>
        <SegmentedControl
          segments={SEGMENTS}
          selectedIndex={selectedTab}
          onSelect={setSelectedTab}
        />
      </View>

      {loading ? (
        <LoadingIndicator />
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                style={styles.userInfo}
                onPress={() => router.push(`/(tabs)/(account)/profile/${item.uid}`)}
                activeOpacity={0.7}
              >
                <Avatar uri={item.avatarUrl} size={44} />
                <View style={styles.info}>
                  <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                    @{item.username}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={() => actionHandler(item.uid)}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {actionLabel}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={selectedTab === 0 ? 'ban-outline' : 'volume-mute-outline'}
              title={selectedTab === 0 ? 'ブロックしているアカウントはありません' : 'ミュートしているアカウントはありません'}
              description={
                selectedTab === 0
                  ? 'ブロックしたアカウントはここに表示されます'
                  : 'ミュートしたアカウントはここに表示されます'
              }
            />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  info: {
    flex: 1,
  },
  displayName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  username: {
    fontSize: FontSize.sm,
    marginTop: 1,
  },
  actionBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
