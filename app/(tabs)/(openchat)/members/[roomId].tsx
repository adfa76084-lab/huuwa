import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing, FontSize } from '@/constants/theme';
import { ChatRoom } from '@/types/chat';
import { UserProfile } from '@/types/user';
import { getChatRoom, kickMember } from '@/services/api/chatService';
import { UserListItem } from '@/components/user/UserListItem';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';

export default function MembersScreen() {
  const colors = useThemeColors();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRoom = async () => {
    if (!roomId) return;
    const chatRoom = await getChatRoom(roomId);
    setRoom(chatRoom);
    setLoading(false);
  };

  useEffect(() => {
    loadRoom();
  }, [roomId]);

  const handleKick = (uid: string, displayName: string) => {
    Alert.alert(
      'メンバーを削除',
      `${displayName}をこのチャットから削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (!roomId) return;
            await kickMember(roomId, uid);
            await loadRoom();
          },
        },
      ]
    );
  };

  if (loading || !room) {
    return <LoadingIndicator fullScreen />;
  }

  const isAdmin = room.createdBy === user?.uid;
  const members: UserProfile[] = room.members
    .map((uid) => room.memberProfiles[uid])
    .filter(Boolean);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={members}
        renderItem={({ item }) => {
          const isOwner = item.uid === room.createdBy;
          const isSelf = item.uid === user?.uid;
          return (
            <UserListItem
              user={item}
              rightElement={
                <View style={styles.rightRow}>
                  {isOwner && <Tag label="管理者" selected />}
                  {isAdmin && !isSelf && !isOwner && (
                    <Button
                      title="削除"
                      onPress={() => handleKick(item.uid, item.displayName)}
                      variant="outline"
                      size="sm"
                    />
                  )}
                </View>
              }
            />
          );
        }}
        keyExtractor={(item) => item.uid}
        ListEmptyComponent={
          <EmptyState icon="people-outline" title="メンバーがいません" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
