import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Unsubscribe } from 'firebase/firestore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { subscribeToQuery, where, orderBy, limit } from '@/services/firebase/firestore';
import { Collections } from '@/constants/firestore';
import { AppNotification } from '@/types/notification';
import { isNotificationEnabled } from '@/services/api/notificationService';

export default function TabsLayout() {
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  // Global real-time unread count listener
  useEffect(() => {
    if (!user) return;

    const unsubscribe: Unsubscribe = subscribeToQuery<AppNotification>(
      Collections.NOTIFICATIONS,
      [where('recipientUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(100)],
      (items) => {
        const filtered = items.filter((n) =>
          isNotificationEnabled(n.type, user.notificationPrefs),
        );
        setNotifications(filtered);
        const count = filtered.filter((n) => !n.read).length;
        setUnreadCount(count);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user, setNotifications, setUnreadCount]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(threads)"
        options={{
          title: 'スレッド',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(openchat)"
        options={{
          title: 'オープンチャット',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(categories)"
        options={{
          title: 'カテゴリー',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      {/* Shorts tab hidden – add href back to re-enable */}
      <Tabs.Screen
        name="(shorts)"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="(chat)"
        options={{
          title: 'チャット',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      {/* Account tab — hidden from the bottom bar but routes remain accessible via the avatar drawer */}
      <Tabs.Screen
        name="(account)"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
