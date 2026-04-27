import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Unsubscribe } from 'firebase/firestore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Spacing, FontSize } from '@/constants/theme';
import {
  markNotificationRead,
  markAllNotificationsRead,
  isNotificationEnabled,
} from '@/services/api/notificationService';
import { subscribeToQuery, where, orderBy, limit } from '@/services/firebase/firestore';
import { Collections } from '@/constants/firestore';
import { AppNotification } from '@/types/notification';
import { NotificationItem } from '@/components/notification/NotificationItem';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { notifications, setNotifications, setUnreadCount, markRead } = useNotificationStore();
  const [loading, setLoading] = useState(true);

  // Real-time notifications listener
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe: Unsubscribe = subscribeToQuery<AppNotification>(
      Collections.NOTIFICATIONS,
      [where('recipientUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(100)],
      (items) => {
        const filtered = items.filter((n) =>
          isNotificationEnabled(n.type, user.notificationPrefs),
        );
        setNotifications(filtered);
        const unreadCount = filtered.filter((n) => !n.read).length;
        setUnreadCount(unreadCount);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user, setNotifications, setUnreadCount]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
  }, [user]);

  const handleNotificationPress = useCallback(
    async (notification: AppNotification) => {
      // Mark as read
      if (!notification.read) {
        markRead(notification.id);
        markNotificationRead(notification.id).catch(() => {});
      }

      switch (notification.type) {
        case 'like':
        case 'reply':
        case 'mention':
          router.push(`/(tabs)/(home)/tweet/${notification.targetId}`);
          break;
        case 'thread_reply':
          router.push(`/(tabs)/(home)/thread/${notification.targetId}`);
          break;
        case 'follow':
          router.push(`/(tabs)/(home)/profile/${notification.actorUid}`);
          break;
      }
    },
    [router, markRead],
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationItem
        notification={item}
        onPress={() => handleNotificationPress(item)}
      />
    ),
    [handleNotificationPress],
  );

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={[styles.markRead, { color: colors.primary }]}>
                すべて既読にする
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <FlashList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="通知がありません"
            description="すべてチェック済みです！"
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
  markRead: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
});
