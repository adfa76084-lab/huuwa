import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  PanResponder,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import {
  getShortComments,
  createShortComment,
  deleteShortComment,
} from '@/services/api/shortCommentService';
import { ShortComment } from '@/types/short';
import { Avatar } from '@/components/ui/Avatar';
import { ChatInput } from '@/components/chat/ChatInput';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/date';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

interface ShortCommentSheetProps {
  visible: boolean;
  shortId: string | null;
  commentsCount: number;
  onClose: () => void;
  onCommentCountChange?: (delta: number) => void;
}

function CommentItem({
  comment,
  isOwn,
  onDelete,
}: {
  comment: ShortComment;
  isOwn: boolean;
  onDelete: (commentId: string) => void;
}) {
  const colors = useThemeColors();

  const handleLongPress = () => {
    if (!isOwn) return;
    Alert.alert('コメントを削除', 'このコメントを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => onDelete(comment.id),
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.commentItem, { borderBottomColor: colors.border }]}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
      delayLongPress={500}
    >
      <Avatar uri={comment.author.avatarUrl} size={36} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentAuthor, { color: colors.text }]}>
            {comment.author.displayName}
          </Text>
          <Text style={[styles.commentTime, { color: colors.textTertiary }]}>
            {formatRelativeTime(comment.createdAt)}
          </Text>
        </View>
        <Text style={[styles.commentText, { color: colors.text }]}>
          {comment.content}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function ShortCommentSheet({
  visible,
  shortId,
  commentsCount,
  onClose,
  onCommentCountChange,
}: ShortCommentSheetProps) {
  const colors = useThemeColors();
  const { user, userProfile } = useAuth();
  const [comments, setComments] = useState<ShortComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const fetchComments = useCallback(async () => {
    if (!shortId) return;
    setLoading(true);
    try {
      const result = await getShortComments(shortId);
      setComments(result.items);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [shortId]);

  useEffect(() => {
    if (visible) {
      fetchComments();
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
      overlayAnim.setValue(0);
    }
  }, [visible, slideAnim, overlayAnim, fetchComments]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [slideAnim, overlayAnim, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dx) < gestureState.dy;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          animateClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    }),
  ).current;

  const handleSend = useCallback(
    async (content: string) => {
      if (!user || !userProfile || !shortId || sending) return;
      setSending(true);
      try {
        await createShortComment(shortId, user.uid, userProfile, content);
        onCommentCountChange?.(1);
        await fetchComments();
      } catch {
        // silently fail
      } finally {
        setSending(false);
      }
    },
    [user, userProfile, shortId, sending, fetchComments, onCommentCountChange],
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (!shortId) return;
      try {
        await deleteShortComment(shortId, commentId);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        onCommentCountChange?.(-1);
      } catch {
        // silently fail
      }
    },
    [shortId, onCommentCountChange],
  );

  const renderComment = useCallback(
    ({ item }: { item: ShortComment }) => (
      <CommentItem
        comment={item}
        isOwn={item.authorUid === user?.uid}
        onDelete={handleDelete}
      />
    ),
    [user, handleDelete],
  );

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={animateClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={animateClose}>
          <Animated.View
            style={[styles.overlay, { opacity: overlayAnim }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              transform: [{ translateY: slideAnim }],
              height: SHEET_HEIGHT,
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
          </View>

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              コメント
            </Text>
            <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
              {commentsCount}
            </Text>
          </View>

          {loading ? (
            <LoadingIndicator />
          ) : (
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                    まだコメントはありません
                  </Text>
                </View>
              }
            />
          )}

          <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
            <ChatInput
              placeholder="コメントを追加..."
              onSend={handleSend}
              disabled={sending}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  headerCount: {
    fontSize: FontSize.lg,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  commentAuthor: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: FontSize.xs,
  },
  commentText: {
    fontSize: FontSize.md,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyText: {
    fontSize: FontSize.md,
  },
  inputContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
