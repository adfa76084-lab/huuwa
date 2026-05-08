import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { sendMessage, subscribeToChatMessages, generateMessageId } from '@/services/api/chatService';
import { ChatMessage, ChatAttachment } from '@/types/chat';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
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

export default function OpenChatRoomScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const pendingRef = useRef<PendingAttachment | null>(null);
  const listRef = useRef<FlashList<ChatMessage>>(null);

  // Attachment state
  const [menuVisible, setMenuVisible] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pending, setPending] = useState<PendingAttachment | null>(null);

  // Optimistic outgoing messages: rendered instantly with local URIs while
  // upload + sendMessage runs in the background. The optimistic message and
  // the eventual real document share the same client-side ID, so dedupe is
  // a trivial id-equality check once the realtime listener delivers it.
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);

  // Keep refs in sync with state
  useEffect(() => { pendingRef.current = pending; }, [pending]);

  useEffect(() => {
    if (!roomId || !user) return;
    const unsubscribe = subscribeToChatMessages(roomId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [roomId, user]);

  // Drop optimistic stand-ins once their real counterpart arrives via realtime.
  useEffect(() => {
    if (optimisticMessages.length === 0) return;
    const realIds = new Set(messages.map((m) => m.id));
    setOptimisticMessages((prev) => prev.filter((opt) => !realIds.has(opt.id)));
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Send ───
  const handleSend = useCallback(
    async (content: string) => {
      if (!user || !userProfile || !roomId) return;

      const curPending = pendingRef.current;

      // Build the optimistic message with local URIs so it renders instantly.
      // Use the same ID we'll write to Firestore so the realtime listener
      // can dedupe by id when it delivers the real document.
      const messageId = generateMessageId(roomId);
      let optimisticImageUrl: string | null = null;
      const optimisticAttachments: ChatAttachment[] = [];
      if (curPending) {
        switch (curPending.kind) {
          case 'image':
            optimisticImageUrl = curPending.uri;
            break;
          case 'video':
            optimisticAttachments.push({ type: 'video', url: curPending.uri });
            break;
          case 'file':
            optimisticAttachments.push({
              type: 'file',
              url: curPending.file.uri,
              name: curPending.file.name,
              mimeType: curPending.file.mimeType,
              sizeBytes: curPending.file.size,
            });
            break;
          case 'voice':
            optimisticAttachments.push({
              type: 'voice',
              url: curPending.uri,
              durationMs: curPending.durationMs,
            });
            break;
          case 'poll':
            optimisticAttachments.push({ type: 'poll', pollId: curPending.pollId });
            break;
        }
      }
      const optimisticMsg: ChatMessage = {
        id: messageId,
        roomId,
        senderUid: user.uid,
        sender: userProfile,
        content,
        imageUrl: optimisticImageUrl,
        attachments: optimisticAttachments,
        createdAt: Timestamp.now(),
        readBy: [user.uid],
      };
      setOptimisticMessages((prev) => [...prev, optimisticMsg]);
      setPending(null);

      // Run upload + send in the background — input stays free for the next message.
      (async () => {
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

          await sendMessage(
            roomId,
            user.uid,
            userProfile,
            content,
            imageUrl,
            attachments,
            messageId,
          );
        } catch (e: any) {
          setOptimisticMessages((prev) => prev.filter((m) => m.id !== messageId));
          const detail = e?.code || e?.message || JSON.stringify(e);
          Alert.alert('送信エラー', String(detail));
        }
      })();
    },
    [user, userProfile, roomId],
  );

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

  // Real messages from Firestore + any in-flight optimistic ones we haven't
  // matched yet. Sorting by createdAt keeps order stable when the optimistic
  // is still ahead of its (slightly later, server-stamped) real twin.
  const allMessages = useMemo(() => {
    if (optimisticMessages.length === 0) return messages;
    const combined = [...messages, ...optimisticMessages];
    combined.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return ta - tb;
    });
    return combined;
  }, [messages, optimisticMessages]);

  // ─── Render ───
  if (!user) {
    return <LoginPrompt icon="people-outline" description="オープンチャットに参加するにはログインが必要です" />;
  }

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  const attachmentPreview = pending ? (
    <AttachmentPreview pending={pending} onClear={handleClearPending} />
  ) : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/(openchat)/search/${roomId}` as any)}
                hitSlop={8}
              >
                <Ionicons name="search-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/(openchat)/info/${roomId}` as any)}
                hitSlop={8}
              >
                <Ionicons name="menu-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <FlashList
          ref={listRef}
          data={allMessages}
          renderItem={({ item, index }) => {
            const prev = index > 0 ? allMessages[index - 1] : null;
            const showSender = !prev || prev.senderUid !== item.senderUid;
            return (
              <ChatMessageBubble
                message={item}
                isOwn={item.senderUid === user?.uid}
                showSender={showSender}
              />
            );
          }}
          keyExtractor={(item) => item.id}
          onContentSizeChange={() => {
            if (allMessages.length > 0) {
              listRef.current?.scrollToEnd({ animated: true });
            }
          }}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-outline"
              title="メッセージはまだありません"
              description="最初のメッセージを送ってみましょう！"
            />
          }
        />

        <ChatInput
          placeholder="メッセージを入力..."
          onSend={handleSend}
          onAttach={() => setMenuVisible(true)}
          attachmentPreview={attachmentPreview}
          voiceButton={<VoiceRecordButton onRecorded={handleVoiceRecorded} />}
        />
      </KeyboardAvoidingView>

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
    </>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
