import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { UserListItem } from '@/components/user/UserListItem';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { getInvitableUsers, joinOpenChat } from '@/services/api/chatService';
import { User } from '@/types/user';

export default function InviteScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user, userProfile } = useAuth();
  const [invitableUsers, setInvitableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!user || !roomId) return;
    getInvitableUsers(user.uid, roomId)
      .then(setInvitableUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, roomId]);

  const toggleUser = (target: User) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.uid === target.uid);
      if (exists) return prev.filter((u) => u.uid !== target.uid);
      return [...prev, target];
    });
  };

  const handleInvite = useCallback(async () => {
    if (!user || !userProfile || !roomId || selectedUsers.length === 0) return;

    setInviting(true);
    try {
      await Promise.all(
        selectedUsers.map((u) =>
          joinOpenChat(roomId, u.uid, {
            uid: u.uid,
            displayName: u.displayName,
            username: u.username,
            avatarUrl: u.avatarUrl,
          })
        )
      );
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : '招待に失敗しました';
      Alert.alert('エラー', message);
    } finally {
      setInviting(false);
    }
  }, [user, userProfile, roomId, selectedUsers, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ModalHeader
        title="メンバーを招待"
        onClose={() => router.back()}
        onAction={handleInvite}
        actionLabel="招待"
        actionLoading={inviting}
        actionDisabled={selectedUsers.length === 0}
      />

      <View style={styles.content}>
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
          招待可能なユーザー
        </Text>

        <View style={styles.listContainer}>
          {loading ? (
            <LoadingIndicator />
          ) : (
            <FlashList
              data={invitableUsers}
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
                  title="招待可能なユーザーがいません"
                  description="相互フォローまたはメッセージのやり取りがあるユーザーのみ招待できます"
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
