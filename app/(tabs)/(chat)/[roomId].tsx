import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import {
  sendMessage,
  subscribeToChatMessages,
  acceptMessageRequest,
  declineMessageRequest,
  setTypingStatus,
  subscribeToTypingStatus,
  markMessagesAsRead,
} from '@/services/api/chatService';
import { getDocument } from '@/services/firebase/firestore';
import { Collections } from '@/constants/firestore';
import { ChatMessage, ChatRoom, ChatAttachment } from '@/types/chat';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { TypingBubble } from '@/components/chat/TypingBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageRequestActionBar } from '@/components/chat/MessageRequestActionBar';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { AttachmentMenu } from '@/components/thread/AttachmentMenu';
import { VoiceRecordButton } from '@/components/chat/VoiceRecordButton';
import { PollCreatorModal } from '@/components/thread/PollCreatorModal';
import { pickImage } from '@/services/media/imageUploader';
import { pickVideo, uploadVideo } from '@/services/media/videoUploader';
import { pickFile, PickedFile } from '@/services/media/filePicker';
import { uploadVoiceWithRetry } from '@/services/media/voiceUploader';
import { uploadImage, uploadFile, getStoragePath } from '@/services/firebase/storage';
import { createPoll } from '@/services/api/pollService';

type PendingAttachment =
  | { kind: 'image'; uri: string }
  | { kind: 'video'; uri: string }
  | { kind: 'file'; file: PickedFile }
  | { kind: 'voice'; uri: string; durationMs: number }
  | { kind: 'poll'; pollId: string; question: string };

export default function ChatRoomScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const pendingRef = useRef<PendingAttachment | null>(null);
  const listRef = useRef<FlashList<ChatMessage>>(null);
  const [processingRequest, setProcessingRequest] = useState(false);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const unsub = subscribeToTypingStatus(roomId, setTypingUsers);
    return () => unsub();
  }, [roomId]);

  // Clear typing status when component unmounts or user leaves
  useEffect(() => {
    return () => {
      if (roomId && user) {
        setTypingStatus(roomId, user.uid, false).catch(() => {});
      }
    };
  }, [roomId, user]);

  const handleTyping = useCallback(() => {
    if (!roomId || !user) return;
    setTypingStatus(roomId, user.uid, true).catch(() => {});

    // Auto-clear after 3 seconds of no typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(roomId, user.uid, false).catch(() => {});
    }, 3000);
  }, [roomId, user]);

  // Who is typing (excluding current user)
  const othersTyping = useMemo(() => {
    if (!user) return [];
    return typingUsers.filter((uid) => uid !== user.uid);
  }, [typingUsers, user]);

  const typingAvatarUrl = useMemo(() => {
    if (othersTyping.length === 0 || !room) return null;
    const firstTypingUid = othersTyping[0];
    return room.memberProfiles[firstTypingUid]?.avatarUrl ?? null;
  }, [othersTyping, room]);

  // Search state
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const searchResultCount = searchQuery.trim() ? filteredMessages.length : 0;

  // Attachment state
  const [menuVisible, setMenuVisible] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pending, setPending] = useState<PendingAttachment | null>(null);

  // Keep refs in sync with state
  useEffect(() => { pendingRef.current = pending; }, [pending]);

  // Fetch room metadata
  useEffect(() => {
    if (!roomId) return;
    getDocument<ChatRoom>(Collections.CHAT_ROOMS, roomId).then((data) => {
      setRoom(data);
    });
  }, [roomId]);

  // Real-time message subscription + auto mark as read
  useEffect(() => {
    if (!roomId || !user) return;
    const unsubscribe = subscribeToChatMessages(roomId, (msgs) => {
      setMessages(msgs);
      setLoading(false);

      // Mark unread messages from others as read
      const unreadIds = msgs
        .filter((m) => m.senderUid !== user.uid && !(m.readBy ?? []).includes(user.uid))
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        markMessagesAsRead(roomId, unreadIds, user.uid).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, [roomId, user]);

  const isPending = (room?.status ?? 'active') === 'pending';
  const isSender = isPending && room?.requestSenderUid === user?.uid;
  const isReceiver = isPending && room?.requestSenderUid !== user?.uid;

  // ─── Send ───
  const handleSend = useCallback(
    async (content: string) => {
      if (!user || !userProfile || !roomId) return;
      if (sendingRef.current) return;
      sendingRef.current = true;
      setSending(true);

      const curPending = pendingRef.current;

      try {
        let imageUrl: string | null = null;
        const attachments: ChatAttachment[] = [];

        if (curPending) {
          switch (curPending.kind) {
            case 'image': {
              const path = getStoragePath('chat_images', user.uid, 'photo.jpg');
              imageUrl = await uploadImage(path, curPending.uri);
              break;
            }
            case 'video': {
              const path = getStoragePath('chat_videos', user.uid, 'video.mp4');
              const url = await uploadVideo(path, curPending.uri);
              attachments.push({ type: 'video', url });
              break;
            }
            case 'file': {
              const path = getStoragePath('chat_files', user.uid, curPending.file.name);
              const url = await uploadFile(path, curPending.file.uri);
              attachments.push({
                type: 'file',
                url,
                name: curPending.file.name,
                mimeType: curPending.file.mimeType,
                sizeBytes: curPending.file.size,
              });
              break;
            }
            case 'voice': {
              const path = getStoragePath('chat_voice', user.uid, `voice_${Date.now()}.m4a`);
              const url = await uploadVoiceWithRetry(path, curPending.uri);
              attachments.push({
                type: 'voice',
                url,
                durationMs: curPending.durationMs,
              });
              break;
            }
            case 'poll': {
              attachments.push({ type: 'poll', pollId: curPending.pollId });
              break;
            }
          }
        }

        await sendMessage(roomId, user.uid, userProfile, content, imageUrl, attachments);
        setPending(null);
      } catch (e: any) {
        const detail = e?.code || e?.message || JSON.stringify(e);
        Alert.alert('送信エラー', String(detail));
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [user, userProfile, roomId]
  );

  // ─── Message request handlers ───
  const handleAccept = async () => {
    if (!roomId) return;
    setProcessingRequest(true);
    try {
      await acceptMessageRequest(roomId);
      setRoom((prev) => prev ? { ...prev, status: 'active', requestSenderUid: null } : prev);
    } catch {
      Alert.alert('エラー', '承認に失敗しました');
    } finally {
      setProcessingRequest(false);
    }
  };

  const handleDecline = async () => {
    if (!roomId) return;
    Alert.alert(
      'メッセージリクエストを削除',
      'このリクエストを削除してもよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            setProcessingRequest(true);
            try {
              await declineMessageRequest(roomId);
              router.back();
            } catch {
              Alert.alert('エラー', '削除に失敗しました');
              setProcessingRequest(false);
            }
          },
        },
      ]
    );
  };

  // ─── Attachment handlers ───
  const handlePickImage = useCallback(async () => {
    try {
      const uri = await pickImage();
      if (uri) setPending({ kind: 'image', uri });
    } catch {
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  }, []);

  const handlePickVideo = useCallback(async () => {
    try {
      const result = await pickVideo();
      if (result) setPending({ kind: 'video', uri: result.videoUri });
    } catch {
      Alert.alert('エラー', '動画の選択に失敗しました');
    }
  }, []);

  const handlePickFile = useCallback(async () => {
    try {
      const file = await pickFile();
      if (file) setPending({ kind: 'file', file });
    } catch (e: any) {
      Alert.alert('エラー', e?.message ?? 'ファイルの選択に失敗しました');
    }
  }, []);

  const handleVoiceRecorded = useCallback((uri: string, durationMs: number) => {
    setPending({ kind: 'voice', uri, durationMs });
  }, []);

  const handleCreatePoll = useCallback(
    async (question: string, options: string[]) => {
      if (!user) return;
      try {
        const poll = await createPoll(user.uid, question, options);
        setPending({ kind: 'poll', pollId: poll.id, question });
      } catch {
        Alert.alert('エラー', 'アンケートの作成に失敗しました');
      }
    },
    [user]
  );

  const handleClearPending = useCallback(() => setPending(null), []);

  // ─── Header info (DM partner / group meta) ───
  const headerInfo = useMemo(() => {
    if (!room) return null;
    if (room.type === 'dm') {
      const partnerUid = room.members.find((uid) => uid !== user?.uid);
      const partner = partnerUid ? room.memberProfiles[partnerUid] : null;
      return {
        avatarUrl: partner?.avatarUrl ?? null,
        title: partner?.displayName ?? 'ユーザー',
        subtitle: partner?.username ? `@${partner.username}` : null,
      };
    }
    return {
      avatarUrl: room.imageUrl,
      title: room.name ?? 'グループ',
      subtitle: `${room.membersCount}人のメンバー`,
    };
  }, [room, user]);

  // ─── Render ───
  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  const attachmentPreview = pending ? (
    <AttachmentPreview pending={pending} onClear={handleClearPending} />
  ) : undefined;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Avatar uri={headerInfo?.avatarUrl ?? null} size={36} />
              <View style={styles.headerTitleTextContainer}>
                <Text
                  style={[styles.headerTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {headerInfo?.title ?? ''}
                </Text>
                {headerInfo?.subtitle && (
                  <Text
                    style={[styles.headerSubtitle, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {headerInfo.subtitle}
                  </Text>
                )}
              </View>
            </View>
          ),
          headerTitleAlign: 'left',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                setSearchActive((v) => !v);
                if (searchActive) setSearchQuery('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={searchActive ? 'close' : 'ellipsis-horizontal'}
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Search bar */}
      {searchActive && (
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="メッセージを検索..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.trim().length > 0 && (
            <Text style={[styles.searchCount, { color: colors.textSecondary }]}>
              {searchResultCount}件
            </Text>
          )}
          <TouchableOpacity
            onPress={() => { setSearchActive(false); setSearchQuery(''); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      <FlashList
        ref={listRef}
        data={searchActive && searchQuery.trim() ? filteredMessages : messages}
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const showSender = !prev || prev.senderUid !== item.senderUid;
          return (
            <ChatMessageBubble
              message={item}
              isOwn={item.senderUid === user?.uid}
              showSender={showSender}
              roomMemberCount={room?.membersCount ?? 2}
            />
          );
        }}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            listRef.current?.scrollToEnd({ animated: true });
          }
        }}
        ListFooterComponent={
          othersTyping.length > 0 ? (
            <TypingBubble avatarUrl={typingAvatarUrl} />
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-outline"
            title="メッセージはまだありません"
            description="最初のメッセージを送ってみましょう！"
          />
        }
      />

      <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
        {isReceiver ? (
          <MessageRequestActionBar
            onAccept={handleAccept}
            onDecline={handleDecline}
            loading={processingRequest}
          />
        ) : (
          <ChatInput
            placeholder={isSender ? '承認待ち...' : 'メッセージを入力...'}
            onSend={(text) => {
              if (roomId && user) setTypingStatus(roomId, user.uid, false).catch(() => {});
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              handleSend(text);
            }}
            onTyping={handleTyping}
            onAttach={!isPending ? () => setMenuVisible(true) : undefined}
            attachmentPreview={attachmentPreview}
            disabled={isSender || sending}
            sending={sending}
            voiceButton={
              !isPending ? (
                <VoiceRecordButton
                  onRecorded={handleVoiceRecorded}
                  disabled={isSender || sending}
                />
              ) : undefined
            }
          />
        )}
      </View>

      <AttachmentMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onPickImage={handlePickImage}
        onPickVideo={handlePickVideo}
        onPickFile={handlePickFile}
        onCreatePoll={() => setPollModalVisible(true)}
      />

      <PollCreatorModal
        visible={pollModalVisible}
        onClose={() => setPollModalVisible(false)}
        onCreate={handleCreatePoll}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Attachment preview component ───

function AttachmentPreview({
  pending,
  onClear,
}: {
  pending: PendingAttachment;
  onClear: () => void;
}) {
  const colors = useThemeColors();

  let content: React.ReactNode = null;

  switch (pending.kind) {
    case 'image':
      content = (
        <Image source={{ uri: pending.uri }} style={styles.previewImage} />
      );
      break;
    case 'video':
      content = (
        <View style={[styles.previewBadge, { backgroundColor: colors.surface }]}>
          <Ionicons name="videocam" size={18} color={colors.primary} />
          <Text style={[styles.previewText, { color: colors.text }]}>動画を選択済み</Text>
        </View>
      );
      break;
    case 'file':
      content = (
        <View style={[styles.previewBadge, { backgroundColor: colors.surface }]}>
          <Ionicons name="document" size={18} color={colors.primary} />
          <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={1}>
            {pending.file.name}
          </Text>
        </View>
      );
      break;
    case 'voice':
      content = (
        <View style={[styles.previewBadge, { backgroundColor: colors.surface }]}>
          <Ionicons name="mic" size={18} color={colors.primary} />
          <Text style={[styles.previewText, { color: colors.text }]}>
            ボイスメッセージ ({Math.round(pending.durationMs / 1000)}秒)
          </Text>
        </View>
      );
      break;
    case 'poll':
      content = (
        <View style={[styles.previewBadge, { backgroundColor: colors.surface }]}>
          <Ionicons name="bar-chart" size={18} color={colors.primary} />
          <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={1}>
            アンケート: {pending.question}
          </Text>
        </View>
      );
      break;
  }

  return (
    <View style={styles.previewContainer}>
      {content}
      <TouchableOpacity onPress={onClear} hitSlop={8}>
        <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  headerTitleTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.xs,
  },
  searchCount: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  inputContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
  },
  previewBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  previewText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
});
