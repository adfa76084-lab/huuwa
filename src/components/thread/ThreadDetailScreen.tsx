import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { addThreadReply, generateReplyId, subscribeToThread, subscribeToThreadReplies } from '@/services/api/threadService';
import { Thread, ThreadReply, ReplyAttachment } from '@/types/thread';
import { ThreadReplyCard } from '@/components/thread/ThreadReplyCard';
import { ThreadMenu, ThreadMenuTarget } from '@/components/thread/ThreadMenu';
import { AttachmentMenu } from '@/components/thread/AttachmentMenu';
import { PollCreatorModal } from '@/components/thread/PollCreatorModal';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChatInput } from '@/components/chat/ChatInput';
import { VoiceRecordButton } from '@/components/chat/VoiceRecordButton';
import { uploadImage, uploadFile, getStoragePath } from '@/services/firebase/storage';
import { pickVideo, uploadVideo } from '@/services/media/videoUploader';
import { pickFile } from '@/services/media/filePicker';
import { uploadVoiceWithRetry } from '@/services/media/voiceUploader';
import { createPoll } from '@/services/api/pollService';
import * as ImagePicker from 'expo-image-picker';

export function ThreadDetailScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { user, userProfile } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [pendingAttachment, setPendingAttachment] = useState<ReplyAttachment | null>(null);

  const [menuTarget, setMenuTarget] = useState<ThreadMenuTarget | null>(null);
  const [hiddenReplyIds, setHiddenReplyIds] = useState<Set<string>>(new Set());

  // Optimistic outgoing replies — rendered with local URIs while uploads run
  // in the background. The optimistic reply and the eventual real document
  // share the same client-side ID so dedupe is a trivial id-equality check.
  const [optimisticReplies, setOptimisticReplies] = useState<ThreadReply[]>([]);

  const blockedAuthorSet = useMemo(
    () => new Set([...(user?.blockedUids ?? []), ...(user?.mutedUids ?? [])]),
    [user?.blockedUids, user?.mutedUids],
  );

  const visibleReplies = useMemo(() => {
    const filtered = replies.filter(
      (r) => !blockedAuthorSet.has(r.authorUid) && !hiddenReplyIds.has(r.id),
    );
    if (optimisticReplies.length === 0) return filtered;
    return [...filtered, ...optimisticReplies];
  }, [replies, blockedAuthorSet, hiddenReplyIds, optimisticReplies]);

  // Drop optimistic stand-ins once their real counterpart arrives via realtime.
  useEffect(() => {
    if (optimisticReplies.length === 0) return;
    const realIds = new Set(replies.map((r) => r.id));
    setOptimisticReplies((prev) => prev.filter((opt) => !realIds.has(opt.id)));
  }, [replies]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!threadId) return;

    const unsubThread = subscribeToThread(threadId, (data) => {
      setThread(data);
    });

    const unsubReplies = subscribeToThreadReplies(threadId, (items) => {
      setReplies(items);
      setLoading(false);
    });

    return () => {
      unsubThread();
      unsubReplies();
    };
  }, [threadId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
    });
    if (result.canceled || !result.assets.length) return;
    setPendingImages(result.assets.map((a) => a.uri));
  }, []);

  const handlePickVideo = useCallback(async () => {
    const result = await pickVideo();
    if (!result) return;
    setPendingAttachment({ type: 'video', url: result.videoUri });
  }, []);

  const handleVoiceRecorded = useCallback((uri: string, durationMs: number) => {
    setPendingAttachment({ type: 'voice', url: uri, durationMs });
  }, []);

  const handlePickFile = useCallback(async () => {
    try {
      const file = await pickFile();
      if (!file) return;
      setPendingAttachment({
        type: 'file',
        url: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.size,
      });
    } catch (e: any) {
      Alert.alert('エラー', e.message ?? 'ファイルの選択に失敗しました');
    }
  }, []);

  const handleCreatePoll = useCallback(
    async (question: string, options: string[]) => {
      if (!user) return;
      try {
        const poll = await createPoll(user.uid, question, options);
        setPendingAttachment({ type: 'poll', pollId: poll.id });
      } catch {
        Alert.alert('エラー', 'アンケートの作成に失敗しました');
      }
    },
    [user],
  );

  const clearPending = () => {
    setPendingImages([]);
    setPendingAttachment(null);
  };

  const handleSendReply = (content: string) => {
    if (!user || !userProfile || !threadId) return;

    // Snapshot the form state so the user can keep typing the next reply
    // while uploads run in the background.
    const snapshotImages = [...pendingImages];
    const snapshotAttachment = pendingAttachment;

    // Reuse the same client-generated ID for the optimistic and real reply
    // so the realtime listener can dedupe by id when it delivers the real doc.
    const replyId = generateReplyId(threadId);
    const optimisticAttachments: ReplyAttachment[] = [];
    if (snapshotAttachment) {
      optimisticAttachments.push(snapshotAttachment);
    }
    const optimisticReply: ThreadReply = {
      id: replyId,
      threadId,
      author: userProfile,
      authorUid: user.uid,
      content,
      imageUrls: snapshotImages,
      attachments: optimisticAttachments,
      mentions: [],
      createdAt: Timestamp.now(),
    };
    setOptimisticReplies((prev) => [...prev, optimisticReply]);
    clearPending();

    // Run uploads + write in the background.
    (async () => {
      try {
        let imageUrls: string[] = [];
        if (snapshotImages.length > 0) {
          imageUrls = await Promise.all(
            snapshotImages.map((uri) => {
              const path = getStoragePath('thread-images', user.uid, `img_${Date.now()}.jpg`);
              return uploadImage(path, uri);
            }),
          );
        }

        const attachments: ReplyAttachment[] = [];
        if (snapshotAttachment) {
          if (snapshotAttachment.type === 'voice') {
            const path = getStoragePath('thread-voice', user.uid, `voice_${Date.now()}.m4a`);
            const downloadUrl = await uploadVoiceWithRetry(path, snapshotAttachment.url);
            attachments.push({
              type: 'voice',
              url: downloadUrl,
              durationMs: snapshotAttachment.durationMs,
            });
          } else if (snapshotAttachment.type === 'video') {
            const path = getStoragePath('thread-videos', user.uid, `video_${Date.now()}.mp4`);
            const downloadUrl = await uploadVideo(path, snapshotAttachment.url);
            attachments.push({ type: 'video', url: downloadUrl });
          } else if (snapshotAttachment.type === 'file') {
            const path = getStoragePath('thread-files', user.uid, snapshotAttachment.name);
            const downloadUrl = await uploadFile(path, snapshotAttachment.url);
            attachments.push({
              type: 'file',
              url: downloadUrl,
              name: snapshotAttachment.name,
              mimeType: snapshotAttachment.mimeType,
              sizeBytes: snapshotAttachment.sizeBytes,
            });
          } else if (snapshotAttachment.type === 'poll') {
            attachments.push(snapshotAttachment);
          }
        }

        await addThreadReply(
          threadId,
          user.uid,
          content,
          imageUrls,
          userProfile,
          attachments,
          [],
          replyId,
        );
      } catch {
        setOptimisticReplies((prev) => prev.filter((r) => r.id !== replyId));
      }
    })();
  };

  const renderAttachmentPreview = () => {
    if (pendingImages.length > 0) {
      return (
        <View style={styles.previewContainer}>
          {pendingImages.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.previewThumb} />
          ))}
          <TouchableOpacity onPress={clearPending} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      );
    }
    if (pendingAttachment) {
      const label =
        pendingAttachment.type === 'voice'
          ? `ボイスメッセージ (${Math.max(1, Math.round(((pendingAttachment as any).durationMs ?? 0) / 1000))}秒)`
          : pendingAttachment.type === 'video'
          ? '動画'
          : pendingAttachment.type === 'file'
          ? (pendingAttachment as any).name
          : 'アンケート';
      const icon: keyof typeof Ionicons.glyphMap =
        pendingAttachment.type === 'voice'
          ? 'mic'
          : pendingAttachment.type === 'video'
          ? 'videocam'
          : pendingAttachment.type === 'file'
          ? 'document'
          : 'bar-chart';
      return (
        <View style={[styles.previewChip, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={icon} size={16} color={colors.primary} />
          <Text style={[styles.previewLabel, { color: colors.text }]} numberOfLines={1}>
            {label}
          </Text>
          <TouchableOpacity onPress={clearPending}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  if (loading && !thread) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <FlashList
        data={visibleReplies}
        renderItem={({ item }) => (
          <ThreadReplyCard
            reply={item}
            onMenuPress={() =>
              setMenuTarget({
                kind: 'reply',
                id: item.id,
                authorUid: item.authorUid,
                authorUsername: item.author.username,
                onHideLocally: () =>
                  setHiddenReplyIds((prev) => new Set(prev).add(item.id)),
              })
            }
          />
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          thread ? (
            <View style={styles.threadHeader}>
              <View style={[styles.threadIconWrapper, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="chatbubbles" size={36} color={colors.primary} />
              </View>
              <View style={styles.titleRow}>
                <Text style={[styles.threadTitle, { color: colors.text }]}>
                  {thread.title}
                </Text>
                <TouchableOpacity
                  style={styles.headerMenuBtn}
                  hitSlop={10}
                  onPress={() =>
                    setMenuTarget({
                      kind: 'thread',
                      id: thread.id,
                      authorUid: thread.authorUid,
                      authorUsername: thread.author.username,
                    })
                  }
                  accessibilityLabel="メニュー"
                >
                  <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.threadMeta, { color: colors.textSecondary }]}>
                {thread.author.displayName} · {thread.repliesCount} {thread.repliesCount === 1 ? 'reply' : 'replies'}
              </Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="まだ返信がありません"
            description="会話を始めましょう！"
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {!user ? (
        <TouchableOpacity
          style={[styles.loginPromptBar, { borderTopColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.7}
        >
          <Text style={[styles.loginPromptText, { color: colors.primary }]}>
            返信するにはログインしてください
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
          <ChatInput
            placeholder="返信を入力..."
            onSend={handleSendReply}
            onAttach={() => setShowAttachMenu(true)}
            attachmentPreview={renderAttachmentPreview()}
            voiceButton={<VoiceRecordButton onRecorded={handleVoiceRecorded} />}
          />
        </View>
      )}

      <AttachmentMenu
        visible={showAttachMenu}
        onClose={() => setShowAttachMenu(false)}
        onPickImage={handlePickImage}
        onPickVideo={handlePickVideo}
        onPickFile={handlePickFile}
        onCreatePoll={() => setShowPollCreator(true)}
      />
      <PollCreatorModal
        visible={showPollCreator}
        onClose={() => setShowPollCreator(false)}
        onCreate={handleCreatePoll}
      />

      {menuTarget && (
        <ThreadMenu
          target={menuTarget}
          visible={true}
          onClose={() => setMenuTarget(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  threadHeader: {
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },
  threadIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  threadTitle: {
    flex: 1,
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    textAlign: 'left',
    letterSpacing: 0.2,
  },
  headerMenuBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  threadMeta: {
    fontSize: FontSize.sm,
    textAlign: 'left',
    marginBottom: Spacing.lg,
  },
  divider: {
    width: '100%',
    height: 1,
  },
  loginPromptBar: {
    paddingVertical: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  loginPromptText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  inputContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewThumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    resizeMode: 'cover',
  },
  clearBtn: {
    marginLeft: Spacing.xs,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  previewLabel: {
    fontSize: FontSize.sm,
    maxWidth: 200,
  },
});
