import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { ChatRoom } from '@/types/chat';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import {
  getChatRoom,
  leaveOpenChat,
  getNotificationPref,
  setNotificationPref,
} from '@/services/api/chatService';
import { Avatar } from '@/components/ui/Avatar';
import { Tag } from '@/components/ui/Tag';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}

export default function ChatInfoScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!roomId || !user) return;
    (async () => {
      const [chatRoom, pref] = await Promise.all([
        getChatRoom(roomId),
        getNotificationPref(user.uid, roomId),
      ]);
      setRoom(chatRoom);
      setMuted(pref?.muted ?? false);
      setLoading(false);
    })();
  }, [roomId, user]);

  const handleToggleMute = async (value: boolean) => {
    if (!user || !roomId) return;
    setMuted(value);
    await setNotificationPref(user.uid, roomId, value);
  };

  const handleLeave = () => {
    Alert.alert('退出確認', 'このオープンチャットから退出しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: async () => {
          if (!user || !roomId) return;
          await leaveOpenChat(roomId, user.uid);
          router.dismissAll();
        },
      },
    ]);
  };

  const handleInvite = () => {
    router.push(`/(tabs)/(openchat)/invite/${roomId}`);
  };

  if (loading || !room) {
    return <LoadingIndicator fullScreen />;
  }

  const isAdmin = room.createdBy === user?.uid;
  const category = DEFAULT_CATEGORIES.find((c) => c.id === room.categoryId);

  const menuItems: MenuItem[] = [
    { icon: 'people-outline', label: 'メンバー', route: `/(tabs)/(openchat)/members/${roomId}` },
    { icon: 'images-outline', label: '写真・動画', route: `/(tabs)/(openchat)/media/${roomId}` },
    { icon: 'document-text-outline', label: 'ノート', route: `/(tabs)/(openchat)/notes/${roomId}` },
    { icon: 'calendar-outline', label: 'イベント', route: `/(tabs)/(openchat)/events/${roomId}` },
    { icon: 'link-outline', label: 'リンク', route: `/(tabs)/(openchat)/links/${roomId}` },
    { icon: 'folder-outline', label: 'ファイル', route: `/(tabs)/(openchat)/files/${roomId}` },
  ];

  if (isAdmin) {
    menuItems.push({
      icon: 'settings-outline',
      label: '設定',
      route: `/(tabs)/(openchat)/settings/${roomId}`,
    });
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header Section */}
      <View style={styles.headerSection}>
        {room.imageUrl ? (
          <Image source={{ uri: room.imageUrl }} style={styles.roomImage} />
        ) : (
          <View style={[styles.roomImagePlaceholder, { backgroundColor: colors.primary + '30' }]}>
            <Ionicons name="chatbubbles" size={48} color={colors.primary} />
          </View>
        )}
        <Text style={[styles.roomName, { color: colors.text }]}>{room.name}</Text>
        {room.description ? (
          <Text style={[styles.roomDescription, { color: colors.textSecondary }]}>
            {room.description}
          </Text>
        ) : null}
        {category && (
          <View style={styles.categoryRow}>
            <Tag label={category.name} />
          </View>
        )}
        <Text style={[styles.memberCount, { color: colors.textTertiary }]}>
          {room.membersCount}人のメンバー
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionSection, { backgroundColor: colors.surface }]}>
        <View style={[styles.actionItem, { borderBottomColor: colors.border }]}>
          <View style={styles.actionLeft}>
            <Ionicons
              name={muted ? 'notifications-off-outline' : 'notifications-outline'}
              size={22}
              color={colors.text}
            />
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              通知をオフ
            </Text>
          </View>
          <Switch value={muted} onValueChange={handleToggleMute} />
        </View>

        <TouchableOpacity
          style={[styles.actionItem, { borderBottomColor: colors.border }]}
          onPress={handleInvite}
        >
          <View style={styles.actionLeft}>
            <Ionicons name="person-add-outline" size={22} color={colors.text} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>招待</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleLeave}>
          <View style={styles.actionLeft}>
            <Ionicons name="exit-outline" size={22} color={colors.error} />
            <Text style={[styles.actionLabel, { color: colors.error }]}>退出</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Menu Section */}
      <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.menuItem,
              index < menuItems.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
            onPress={() => router.push(item.route as any)}
          >
            <Ionicons name={item.icon} size={22} color={colors.text} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  roomImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: Spacing.lg,
  },
  roomImagePlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  roomName: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  roomDescription: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  categoryRow: {
    marginBottom: Spacing.sm,
  },
  memberCount: {
    fontSize: FontSize.sm,
  },
  actionSection: {
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionLabel: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  menuSection: {
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
});
