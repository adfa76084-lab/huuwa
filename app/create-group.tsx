import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { TextInput } from '@/components/ui/TextInput';
import { UserListItem } from '@/components/user/UserListItem';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { getMutualFollows } from '@/services/api/followService';
import { createChatRoom } from '@/services/api/chatService';
import { User, UserProfile } from '@/types/user';

export default function CreateGroupScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [mutualUsers, setMutualUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMutualFollows(user.uid)
      .then(setMutualUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const toggleUser = (target: User) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.uid === target.uid);
      if (exists) return prev.filter((u) => u.uid !== target.uid);
      return [...prev, target];
    });
  };

  const handleCreate = useCallback(async () => {
    if (!user || !userProfile || selectedUsers.length === 0) return;
    if (!groupName.trim()) {
      Alert.alert('エラー', 'グループ名を入力してください');
      return;
    }

    setCreating(true);
    try {
      const memberProfiles: Record<string, UserProfile> = {
        [user.uid]: userProfile,
      };
      for (const u of selectedUsers) {
        memberProfiles[u.uid] = {
          uid: u.uid,
          displayName: u.displayName,
          username: u.username,
          avatarUrl: u.avatarUrl,
        };
      }

      const room = await createChatRoom(
        user.uid,
        {
          type: 'group',
          name: groupName.trim(),
          memberUids: selectedUsers.map((u) => u.uid),
        },
        memberProfiles,
      );
      router.back();
      router.push(`/(tabs)/(chat)/${room.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'グループの作成に失敗しました';
      Alert.alert('エラー', message);
    } finally {
      setCreating(false);
    }
  }, [user, userProfile, selectedUsers, groupName, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ModalHeader
        title="グループ作成"
        onClose={() => router.back()}
        onAction={handleCreate}
        actionLabel="作成"
        actionLoading={creating}
        actionDisabled={selectedUsers.length === 0 || !groupName.trim()}
      />

      <View style={styles.content}>
        <TextInput
          label="グループ名"
          placeholder="グループ名を入力..."
          value={groupName}
          onChangeText={setGroupName}
        />

        {selectedUsers.length > 0 && (
          <ScrollView
            horizontal
            style={styles.selectedContainer}
            showsHorizontalScrollIndicator={false}
          >
            {selectedUsers.map((u) => (
              <TouchableOpacity
                key={u.uid}
                style={[styles.selectedChip, { backgroundColor: colors.primary + '20' }]}
                onPress={() => toggleUser(u)}
              >
                <Text style={[styles.chipText, { color: colors.primary }]}>
                  {u.displayName}
                </Text>
                <Ionicons name="close-circle" size={16} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          メンバーを選択（相互フォロー）
        </Text>

        <View style={styles.listContainer}>
          {loading ? (
            <LoadingIndicator />
          ) : (
            <FlashList
              data={mutualUsers}
              renderItem={({ item }) => (
                <UserListItem
                  user={{
                    uid: item.uid,
                    displayName: item.displayName,
                    username: item.username,
                    avatarUrl: item.avatarUrl,
                  }}
                  onPress={() => toggleUser(item)}
                  rightElement={
                    selectedUsers.find((u) => u.uid === item.uid) ? (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={24} color={colors.textTertiary} />
                    )
                  }
                />
              )}
              keyExtractor={(item) => item.uid}
              ListEmptyComponent={
                <EmptyState
                  icon="people-outline"
                  title="相互フォローのユーザーがいません"
                  description="グループを作成するには相互フォローのユーザーが必要です"
                />
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  selectedContainer: {
    maxHeight: 44,
    marginBottom: Spacing.md,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  listContainer: {
    flex: 1,
  },
});
