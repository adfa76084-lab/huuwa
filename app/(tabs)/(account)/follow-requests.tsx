import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import {
  getIncomingFollowRequests,
  approveFollowRequest,
  rejectFollowRequest,
} from '@/services/api/followService';
import { getUserProfile } from '@/services/api/userService';
import { FollowRequest, User } from '@/types/user';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface RequestWithProfile {
  request: FollowRequest;
  profile: User | null;
}

export default function FollowRequestsScreen() {
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getIncomingFollowRequests(user.uid);
      const withProfiles = await Promise.all(
        result.items.map(async (req) => ({
          request: req,
          profile: await getUserProfile(req.fromUid).catch(() => null),
        })),
      );
      setItems(withProfiles);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (fromUid: string) => {
    if (!user) return;
    try {
      await approveFollowRequest(fromUid, user.uid);
      setItems((prev) => prev.filter((i) => i.request.fromUid !== fromUid));
    } catch {
      Alert.alert('エラー', '承認に失敗しました');
    }
  };

  const handleReject = async (fromUid: string) => {
    if (!user) return;
    try {
      await rejectFollowRequest(fromUid, user.uid);
      setItems((prev) => prev.filter((i) => i.request.fromUid !== fromUid));
    } catch {
      Alert.alert('エラー', '拒否に失敗しました');
    }
  };

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: colors.background }]}
      data={items}
      keyExtractor={(item) => item.request.id}
      renderItem={({ item }) => (
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <Avatar uri={item.profile?.avatarUrl ?? null} size={44} />
          <View style={styles.info}>
            <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
              {item.profile?.displayName ?? 'ユーザー'}
            </Text>
            <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
              @{item.profile?.username ?? ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleApprove(item.request.fromUid)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => handleReject(item.request.fromUid)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <EmptyState
          icon="person-add-outline"
          title="フォローリクエストはありません"
          description="新しいリクエストが来るとここに表示されます"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
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
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
