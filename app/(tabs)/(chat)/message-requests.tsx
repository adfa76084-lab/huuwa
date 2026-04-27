import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import {
  getMessageRequests,
  acceptMessageRequest,
  declineMessageRequest,
} from '@/services/api/chatService';
import { ChatRoom } from '@/types/chat';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { FontSize, Spacing } from '@/constants/theme';
import { truncate } from '@/utils/text';

export default function MessageRequestsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [requests, setRequests] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMessageRequests(user.uid);
      setRequests(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const handleAccept = useCallback(
    async (roomId: string) => {
      setProcessingId(roomId);
      try {
        await acceptMessageRequest(roomId);
        setRequests((prev) => prev.filter((r) => r.id !== roomId));
        router.push(`/(tabs)/(chat)/${roomId}`);
      } catch {
        Alert.alert('エラー', '承認に失敗しました');
      } finally {
        setProcessingId(null);
      }
    },
    [router]
  );

  const handleDecline = useCallback(
    async (roomId: string) => {
      Alert.alert(
        'メッセージリクエストを削除',
        'このリクエストを削除してもよろしいですか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: async () => {
              setProcessingId(roomId);
              try {
                await declineMessageRequest(roomId);
                setRequests((prev) => prev.filter((r) => r.id !== roomId));
              } catch {
                Alert.alert('エラー', '削除に失敗しました');
              } finally {
                setProcessingId(null);
              }
            },
          },
        ]
      );
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatRoom }) => {
      const senderUid = item.requestSenderUid;
      const senderProfile = senderUid ? item.memberProfiles[senderUid] : null;
      const isProcessing = processingId === item.id;

      return (
        <View
          style={[
            styles.requestItem,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <Avatar uri={senderProfile?.avatarUrl ?? null} size={50} />
          <View style={styles.requestInfo}>
            <Text style={[styles.requestName, { color: colors.text }]} numberOfLines={1}>
              {senderProfile?.displayName ?? 'Unknown'}
            </Text>
            {item.lastMessage ? (
              <Text style={[styles.requestPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                {truncate(item.lastMessage, 40)}
              </Text>
            ) : (
              <Text style={[styles.requestPreview, { color: colors.textTertiary }]}>
                メッセージはまだありません
              </Text>
            )}
            <View style={styles.requestActions}>
              <Button
                title="削除"
                variant="outline"
                size="sm"
                onPress={() => handleDecline(item.id)}
                disabled={isProcessing}
                style={styles.actionButton}
              />
              <Button
                title="承認"
                variant="primary"
                size="sm"
                onPress={() => handleAccept(item.id)}
                loading={isProcessing}
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      );
    },
    [colors, processingId, handleAccept, handleDecline]
  );

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={requests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="mail-outline"
            title="リクエストはありません"
            description="新しいメッセージリクエストはここに表示されます"
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
  requestItem: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  requestPreview: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
