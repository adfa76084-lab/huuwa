import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableWithoutFeedback,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Unsubscribe } from 'firebase/firestore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useChatStore } from '@/stores/chatStore';
import { getChatRooms, getMessageRequests } from '@/services/api/chatService';
import { updateStatusMessage } from '@/services/api/userService';
import { isNotificationEnabled } from '@/services/api/notificationService';
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/api/notificationService';
import { subscribeToQuery, where, orderBy, limit } from '@/services/firebase/firestore';
import { Collections } from '@/constants/firestore';
import { ChatRoom } from '@/types/chat';
import { UserProfile } from '@/types/user';
import { AppNotification } from '@/types/notification';
import { ChatRoomItem } from '@/components/chat/ChatRoomItem';
import { NotificationItem } from '@/components/notification/NotificationItem';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const AVATAR_SIZE = 64;
const CREATE_AVATAR_SIZE = 64;
const AVATAR_ITEM_WIDTH = 76;
const CREATE_ITEM_WIDTH = 76;
const PLUS_BUTTON_SIZE = 24;
const STATUS_MAX_LENGTH = 30;
const STATUS_BUBBLE_PLACEHOLDER = '調子はどう？';

interface QuickContact {
  uid: string;
  profile: UserProfile;
  roomId: string;
}

// ─── Feeling Screen (Full-screen status composer) ───
type StatusAudience = 'everyone' | 'followers' | 'close_friends';
const AUDIENCE_LABELS: Record<StatusAudience, string> = {
  everyone: '全員',
  followers: 'フォロワーのみ',
  close_friends: '親しい友達のみ',
};
const AUDIENCE_OPTIONS: StatusAudience[] = ['everyone', 'followers', 'close_friends'];
const FEELING_AVATAR_SIZE = 140;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function FeelingScreen({
  visible,
  currentStatus,
  avatarUrl,
  onClose,
  onSave,
}: {
  visible: boolean;
  currentStatus: string;
  avatarUrl: string | null;
  onClose: () => void;
  onSave: (message: string, audience: StatusAudience) => void;
}) {
  const colors = useThemeColors();
  const [text, setText] = useState(currentStatus);
  const [audience, setAudience] = useState<StatusAudience>('everyone');
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setText(currentStatus);
      slideAnim.setValue(1);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start(() => {
        inputRef.current?.focus();
      });
    }
  }, [visible, currentStatus, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [slideAnim, onClose]);

  const handlePost = useCallback(() => {
    if (text.trim().length === 0) return;
    onSave(text.trim(), audience);
    handleClose();
  }, [text, audience, onSave, handleClose]);

  if (!visible) return null;

  const screenHeight = Dimensions.get('window').height;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View
        style={[
          styles.feelingContainer,
          {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, screenHeight],
              }),
            }],
          },
        ]}
      >
        <LinearGradient
          colors={['#E8E0F0', '#D4C8E8', '#C9BDE0', '#B8ACD6']}
          style={StyleSheet.absoluteFill}
        />

        <KeyboardAvoidingView
          style={styles.feelingInner}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.feelingHeader}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={28} color="#4A4060" />
            </TouchableOpacity>
            <Text style={styles.feelingHeaderText}>
              あなたの「気持ち」は24時間表示されます
            </Text>
            <TouchableOpacity
              onPress={() => setShowAudiencePicker(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="settings-outline" size={24} color="#4A4060" />
            </TouchableOpacity>
          </View>

          {/* Center content */}
          <View style={styles.feelingCenter}>
            {/* Speech bubble with input */}
            <View style={styles.feelingBubble}>
              <TextInput
                ref={inputRef}
                style={styles.feelingInput}
                placeholder="今の気持ちを書き込もう..."
                placeholderTextColor="#A898C0"
                value={text}
                onChangeText={(v) => setText(v.slice(0, STATUS_MAX_LENGTH))}
                maxLength={STATUS_MAX_LENGTH}
                multiline={false}
              />
              <View style={styles.feelingBubbleTail} />
            </View>

            {/* Avatar */}
            <Avatar uri={avatarUrl} size={FEELING_AVATAR_SIZE} />
          </View>

          {/* Bottom post button */}
          <TouchableOpacity
            style={[
              styles.feelingPostButton,
              { opacity: text.trim().length > 0 ? 1 : 0.5 },
            ]}
            onPress={handlePost}
            activeOpacity={0.8}
            disabled={text.trim().length === 0}
          >
            <Ionicons name="arrow-up-circle" size={22} color="#FFFFFF" />
            <Text style={styles.feelingPostText}>あなたのストーリーズ</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>

        {/* Audience picker overlay */}
        {showAudiencePicker && (
          <Modal transparent visible animationType="fade" onRequestClose={() => setShowAudiencePicker(false)}>
            <TouchableWithoutFeedback onPress={() => setShowAudiencePicker(false)}>
              <View style={styles.audienceOverlay}>
                <TouchableWithoutFeedback>
                  <View style={[styles.audienceSheet, { backgroundColor: colors.card }]}>
                    <Text style={[styles.audienceTitle, { color: colors.text }]}>
                      公開範囲
                    </Text>
                    {AUDIENCE_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.audienceOption,
                          { borderBottomColor: colors.border },
                        ]}
                        onPress={() => {
                          setAudience(option);
                          setShowAudiencePicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.audienceOptionText, { color: colors.text }]}>
                          {AUDIENCE_LABELS[option]}
                        </Text>
                        {audience === option && (
                          <Ionicons name="checkmark" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Messages Tab ───
function MessagesTab() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const pinnedChatIds = useChatStore((s) => s.pinnedChatIds);
  const togglePinChat = useChatStore((s) => s.togglePinChat);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  // Sort: pinned first, then by lastMessageAt
  const sortedRooms = useMemo(() => {
    const pinSet = new Set(pinnedChatIds);
    return [...rooms].sort((a, b) => {
      const aPinned = pinSet.has(a.id) ? 1 : 0;
      const bPinned = pinSet.has(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return 0; // keep original order for non-pinned
    });
  }, [rooms, pinnedChatIds]);

  const fetchRooms = useCallback(async () => {
    if (!user) return;
    try {
      const [data, requests] = await Promise.all([
        getChatRooms(user.uid),
        getMessageRequests(user.uid),
      ]);
      setRooms(data);
      setRequestCount(requests.length);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [fetchRooms])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  };

  const quickContacts = useMemo<QuickContact[]>(() => {
    if (!user) return [];
    const contacts: QuickContact[] = [];
    const seen = new Set<string>();

    for (const room of rooms) {
      if (room.type !== 'dm') continue;
      const otherUid = room.members.find((uid) => uid !== user.uid);
      if (!otherUid || seen.has(otherUid)) continue;
      const profile = room.memberProfiles[otherUid];
      if (!profile) continue;
      seen.add(otherUid);
      contacts.push({ uid: otherUid, profile, roomId: room.id });
    }
    return contacts;
  }, [rooms, user]);

  const renderItem = useCallback(
    ({ item }: { item: ChatRoom }) => (
      <ChatRoomItem
        room={item}
        currentUserId={user?.uid ?? ''}
        isOnline
        isPinned={pinnedChatIds.includes(item.id)}
        onPress={() => router.push(`/(tabs)/(chat)/${item.id}`)}
        onPin={() => togglePinChat(item.id)}
        onMute={() => {/* TODO: mute chat */}}
        onDelete={() => {/* TODO: delete chat */}}
      />
    ),
    [router, user?.uid, pinnedChatIds, togglePinChat],
  );

  const listHeader = useMemo(() => {
    const hasRequests = requestCount > 0;

    return (
      <>
        {/* Story-like horizontal avatar row */}
        <View style={[styles.avatarRow, { borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.avatarRowContent}
          >
            <View style={styles.createItem}>
              {/* Speech bubble - tappable to set status */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setStatusModalVisible(true)}
              >
                <View style={[styles.speechBubble, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                  <Text
                    style={[
                      styles.speechBubbleText,
                      {
                        color: user?.statusMessage
                          ? colors.text
                          : colors.textTertiary,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {user?.statusMessage || '調子はどう？'}
                  </Text>
                  <View style={[styles.speechBubbleTail, { borderTopColor: colors.card }]} />
                </View>
              </TouchableOpacity>
              {/* Avatar with + button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/create-chat')}
              >
                <View style={styles.createAvatarWrapper}>
                  <Avatar uri={user?.avatarUrl ?? null} size={CREATE_AVATAR_SIZE} />
                  <View style={[styles.plusButton, { backgroundColor: '#1DA1F2', borderColor: colors.background }]}>
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>
              <Text
                style={[styles.avatarName, { color: colors.text }]}
                numberOfLines={1}
              >
                作成
              </Text>
            </View>

            {quickContacts.map((contact) => (
              <TouchableOpacity
                key={contact.uid}
                style={styles.avatarItem}
                activeOpacity={0.7}
                onPress={() => router.push(`/(tabs)/(chat)/${contact.roomId}`)}
              >
                <Avatar uri={contact.profile.avatarUrl} size={AVATAR_SIZE} isOnline />
                <Text
                  style={[styles.avatarName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {contact.profile.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Message requests row */}
        {hasRequests && (
          <TouchableOpacity
            style={[
              styles.requestRow,
              {
                backgroundColor: colors.card,
                borderBottomColor: colors.border,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/(chat)/message-requests')}
          >
            <View style={[styles.requestIcon, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.textTertiary} />
            </View>
            <View style={styles.requestInfo}>
              <Text style={[styles.requestLabel, { color: colors.text }]}>
                メッセージリクエスト
              </Text>
              <Text style={[styles.requestSub, { color: colors.textSecondary }]}>
                {requestCount}件の未読リクエスト
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </>
    );
  }, [quickContacts, requestCount, colors, router, user, statusModalVisible]);

  const handleSaveStatus = useCallback(
    async (message: string, _audience: StatusAudience) => {
      if (!user) return;
      try {
        await updateStatusMessage(user.uid, message);
        updateUser({ statusMessage: message });
      } catch {
        Alert.alert('エラー', 'ステータスの更新に失敗しました');
      }
    },
    [user, updateUser],
  );

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <>
      <FlashList
        data={sortedRooms}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="チャットがまだありません"
            description="ユーザーを検索してメッセージを送ってみよう！"
            actionLabel="ユーザーを検索"
            onAction={() => router.push('/create-chat')}
          />
        }
      />
      <FeelingScreen
        visible={statusModalVisible}
        currentStatus={user?.statusMessage ?? ''}
        avatarUrl={user?.avatarUrl ?? null}
        onClose={() => setStatusModalVisible(false)}
        onSave={handleSaveStatus}
      />
    </>
  );
}

// ─── Activity Tab ───
function ActivityTab() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { notifications, setNotifications, setUnreadCount, markRead } = useNotificationStore();
  const [loading, setLoading] = useState(true);

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
    <View style={styles.container}>
      {/* Mark all read button */}
      {notifications.some((n) => !n.read) && (
        <TouchableOpacity
          style={[styles.markAllReadRow, { borderBottomColor: colors.border }]}
          onPress={handleMarkAllRead}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-done" size={18} color={colors.primary} />
          <Text style={[styles.markAllReadText, { color: colors.primary }]}>
            すべて既読にする
          </Text>
        </TouchableOpacity>
      )}

      <FlashList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="通知がありません"
            description="新しいアクティビティがここに表示されます"
          />
        }
      />
    </View>
  );
}

// ─── Main Screen ───
export default function ChatListScreen() {
  const colors = useThemeColors();
  const selectedTab = useUiStore((s) => s.chatSelectedTab ?? 0);
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <LoginPrompt icon="chatbubbles-outline" description="メッセージを送受信するにはログインが必要です" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {selectedTab === 0 ? <MessagesTab /> : <ActivityTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Avatar row
  avatarRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.lg,
  },
  avatarRowContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'flex-end',
  },
  avatarItem: {
    alignItems: 'center',
    width: AVATAR_ITEM_WIDTH,
  },
  createItem: {
    alignItems: 'center',
    width: CREATE_ITEM_WIDTH,
  },
  createAvatarWrapper: {
    position: 'relative',
  },
  speechBubble: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 6,
    maxWidth: 104,
    alignSelf: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  speechBubbleText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  speechBubbleTail: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  plusButton: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: PLUS_BUTTON_SIZE,
    height: PLUS_BUTTON_SIZE,
    borderRadius: PLUS_BUTTON_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: Spacing.xs,
    textAlign: 'center',
    width: '100%',
  },
  // Message request row
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  requestIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  requestSub: {
    fontSize: FontSize.sm,
    marginTop: 3,
  },
  // Activity tab
  markAllReadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  markAllReadText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  // Feeling screen (full-screen status composer)
  feelingContainer: {
    flex: 1,
  },
  feelingInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  feelingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  feelingHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: '#5A4E70',
    marginHorizontal: Spacing.sm,
  },
  feelingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -40,
  },
  feelingBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 20,
    marginBottom: Spacing.md,
    minWidth: 200,
    maxWidth: SCREEN_WIDTH - 80,
    shadowColor: '#5A4070',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  feelingInput: {
    fontSize: FontSize.lg,
    fontWeight: '500',
    color: '#3A3050',
    textAlign: 'center',
    padding: 0,
    minWidth: 180,
  },
  feelingBubbleTail: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  feelingPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#6C5CE7',
    marginHorizontal: Spacing.xl,
    marginBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.xl,
  },
  feelingPostText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  // Audience picker
  audienceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  audienceSheet: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  audienceTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  audienceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  audienceOptionText: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
});
