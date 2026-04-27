import React, { useEffect, useState, useCallback } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { addThreadReply, subscribeToThread, subscribeToThreadReplies } from '@/services/api/threadService';
import { Thread, ThreadReply, ReplyAttachment } from '@/types/thread';
import { ThreadReplyCard } from '@/components/thread/ThreadReplyCard';
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

export default function CategoryThreadDetailScreen() {
  const colors = useThemeColors();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { user, userProfile } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [pendingAttachment, setPendingAttachment] = useState<ReplyAttachment | null>(null);

  // Real-time subscriptions
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

  const handleSendReply = async (content: string) => {
    if (!user || !userProfile || !threadId || sending) return;
    setSending(true);
    try {
      let imageUrls: string[] = [];
      if (pendingImages.length > 0) {
        imageUrls = await Promise.all(
          pendingImages.map((uri) => {
            const path = getStoragePath('thread-images', user.uid, `img_${Date.now()}.jpg`);
            return uploadImage(path, uri);
          }),
        );
      }

      const attachments: ReplyAttachment[] = [];
      if (pendingAttachment) {
        if (pendingAttachment.type === 'voice') {
          const path = getStoragePath('thread-voice', user.uid, `voice_${Date.now()}.m4a`);
          const downloadUrl = await uploadVoiceWithRetry(path, pendingAttachment.url);
          attachments.push({ type: 'voice', url: downloadUrl, durationMs: pendingAttachment.durationMs });
        } else if (pendingAttachment.type === 'video') {
          const path = getStoragePath('thread-videos', user.uid, `video_${Date.now()}.mp4`);
          const downloadUrl = await uploadVideo(path, pendingAttachment.url);
          attachments.push({ type: 'video', url: downloadUrl });
        } else if (pendingAttachment.type === 'file') {
          const path = getStoragePath('thread-files', user.uid, pendingAttachment.name);
          const downloadUrl = await uploadFile(path, pendingAttachment.url);
          attachments.push({
            type: 'file',
            url: downloadUrl,
            name: pendingAttachment.name,
            mimeType: pendingAttachment.mimeType,
            sizeBytes: pendingAttachment.sizeBytes,
          });
        } else if (pendingAttachment.type === 'poll') {
          attachments.push(pendingAttachment);
        }
      }

      await addThreadReply(threadId, user.uid, content, imageUrls, userProfile, attachments);
      clearPending();
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
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

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <FlashList
        data={replies}
        renderItem={({ item }) => <ThreadReplyCard reply={item} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          thread ? (
            <View style={styles.threadHeader}>
              <View style={[styles.threadIconWrapper, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="chatbubbles" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.threadTitle, { color: colors.text }]}>
                {thread.title}
              </Text>
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

      <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
        <ChatInput
          placeholder="返信を入力..."
          onSend={handleSendReply}
          onAttach={() => setShowAttachMenu(true)}
          attachmentPreview={renderAttachmentPreview()}
          disabled={sending}
          sending={sending}
          voiceButton={
            <VoiceRecordButton
              onRecorded={handleVoiceRecorded}
              disabled={sending}
            />
          }
        />
      </View>

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
  threadTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    textAlign: 'left',
    letterSpacing: 0.2,
    marginBottom: Spacing.xs,
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
