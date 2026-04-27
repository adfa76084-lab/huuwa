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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { useTweetInteractions } from '@/hooks/useTweetInteractions';
import { getTweetReplies, createTweet } from '@/services/api/tweetService';
import { sendMentionNotifications } from '@/services/api/mentionService';
import { Tweet } from '@/types/tweet';
import { Mention } from '@/types/mention';
import { Avatar } from '@/components/ui/Avatar';
import { MentionText } from '@/components/mention/MentionText';
import { TweetActions } from './TweetActions';
import { ChatInput } from '@/components/chat/ChatInput';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/date';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

interface CommentBottomSheetProps {
  visible: boolean;
  tweetId: string | null;
  tweet: Tweet | null;
  onClose: () => void;
}

/** A single sub-reply row (indented, smaller) */
function SubReplyItem({
  reply,
  interactions,
  onReply,
}: {
  reply: Tweet;
  interactions: ReturnType<typeof useTweetInteractions>;
  onReply: (comment: Tweet) => void;
}) {
  const colors = useThemeColors();

  return (
    <View style={[styles.subReplyItem, { borderBottomColor: colors.border }]}>
      <Avatar uri={reply.author.avatarUrl} size={28} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentAuthor, { color: colors.text }]}>
            {reply.author.displayName}
          </Text>
          <Text style={[styles.commentTime, { color: colors.textTertiary }]}>
            {formatRelativeTime(reply.createdAt)}
          </Text>
        </View>
        <MentionText
          content={reply.content}
          textStyle={[styles.commentText, { color: colors.text }]}
          mentions={reply.mentions}
        />
        <TweetActions
          likesCount={reply.likesCount}
          repliesCount={reply.repliesCount}
          bookmarksCount={reply.bookmarksCount}
          isLiked={interactions.likedIds.has(reply.id)}
          isBookmarked={interactions.bookmarkedIds.has(reply.id)}
          onLike={() => interactions.handleLike(reply.id)}
          onBookmark={() => interactions.handleBookmark(reply.id)}
          onReply={() => onReply(reply)}
        />
      </View>
    </View>
  );
}

const INITIAL_REPLIES_LIMIT = 3;

/** A top-level comment with expandable sub-replies */
function CommentItem({
  comment,
  interactions,
  onReply,
  expandedIds,
  subReplies,
  onToggleReplies,
}: {
  comment: Tweet;
  interactions: ReturnType<typeof useTweetInteractions>;
  onReply: (comment: Tweet) => void;
  expandedIds: Set<string>;
  subReplies: Record<string, Tweet[]>;
  onToggleReplies: (commentId: string) => void;
}) {
  const colors = useThemeColors();
  const isExpanded = expandedIds.has(comment.id);
  const replies = subReplies[comment.id] ?? [];
  const [visibleCount, setVisibleCount] = useState(INITIAL_REPLIES_LIMIT);

  // Reset visible count when collapsing
  const handleToggle = useCallback(() => {
    if (isExpanded) {
      setVisibleCount(INITIAL_REPLIES_LIMIT);
    }
    onToggleReplies(comment.id);
  }, [isExpanded, onToggleReplies, comment.id]);

  const visibleReplies = replies.slice(0, visibleCount);
  const remainingCount = replies.length - visibleCount;

  return (
    <View>
      {/* Main comment */}
      <View style={[styles.commentItem, { borderBottomColor: comment.repliesCount > 0 && isExpanded ? 'transparent' : colors.border }]}>
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
          <MentionText
            content={comment.content}
            textStyle={[styles.commentText, { color: colors.text }]}
            mentions={comment.mentions}
          />
          <TweetActions
            likesCount={comment.likesCount}
            repliesCount={comment.repliesCount}
            bookmarksCount={comment.bookmarksCount}
            isLiked={interactions.likedIds.has(comment.id)}
            isBookmarked={interactions.bookmarkedIds.has(comment.id)}
            onLike={() => interactions.handleLike(comment.id)}
            onBookmark={() => interactions.handleBookmark(comment.id)}
            onReply={() => onReply(comment)}
          />

          {/* Toggle sub-replies */}
          {comment.repliesCount > 0 && (
            <TouchableOpacity
              style={styles.viewRepliesButton}
              onPress={handleToggle}
              activeOpacity={0.6}
            >
              <View style={[styles.viewRepliesLine, { backgroundColor: colors.textTertiary }]} />
              <Text style={[styles.viewRepliesText, { color: colors.textSecondary }]}>
                {isExpanded ? '返信を非表示' : `返信${comment.repliesCount}件を表示`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sub-replies (show up to visibleCount) */}
      {isExpanded && visibleReplies.map((reply) => (
        <SubReplyItem
          key={reply.id}
          reply={reply}
          interactions={interactions}
          onReply={onReply}
        />
      ))}

      {/* Show more replies button */}
      {isExpanded && remainingCount > 0 && (
        <TouchableOpacity
          style={styles.showMoreRepliesButton}
          onPress={() => setVisibleCount((prev) => prev + INITIAL_REPLIES_LIMIT)}
          activeOpacity={0.6}
        >
          <View style={[styles.viewRepliesLine, { backgroundColor: colors.textTertiary }]} />
          <Text style={[styles.viewRepliesText, { color: colors.primary }]}>
            他{remainingCount}件の返信を表示
          </Text>
        </TouchableOpacity>
      )}

      {/* Separator after expanded replies */}
      {isExpanded && replies.length > 0 && (
        <View style={[styles.expandedSeparator, { backgroundColor: colors.border }]} />
      )}
    </View>
  );
}

export function CommentBottomSheet({
  visible,
  tweetId,
  tweet,
  onClose,
}: CommentBottomSheetProps) {
  const colors = useThemeColors();
  const { user, userProfile } = useAuth();
  const [comments, setComments] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Tweet | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [subReplies, setSubReplies] = useState<Record<string, Tweet[]>>({});
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const interactions = useTweetInteractions();

  const fetchComments = useCallback(async () => {
    if (!tweetId) return;
    setLoading(true);
    try {
      const result = await getTweetReplies(tweetId);
      setComments(result.items);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [tweetId]);

  const fetchSubReplies = useCallback(async (commentId: string) => {
    try {
      const result = await getTweetReplies(commentId);
      setSubReplies((prev) => ({ ...prev, [commentId]: result.items }));
      // Check interactions for sub-replies
      if (result.items.length > 0) {
        interactions.checkTweets(result.items.map((r) => r.id));
      }
    } catch {
      // silently fail
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleReplies = useCallback(
    (commentId: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(commentId)) {
          next.delete(commentId);
        } else {
          next.add(commentId);
          // Fetch sub-replies if not loaded
          if (!subReplies[commentId]) {
            fetchSubReplies(commentId);
          }
        }
        return next;
      });
    },
    [subReplies, fetchSubReplies],
  );

  // Animate in when visible
  useEffect(() => {
    if (visible) {
      fetchComments();
      setReplyTo(null);
      setExpandedIds(new Set());
      setSubReplies({});
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

  // Swipe down to dismiss
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

  // Check interaction state for loaded comments
  useEffect(() => {
    if (comments.length > 0) {
      interactions.checkTweets(comments.map((c) => c.id));
    }
  }, [comments]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReplyTo = useCallback((comment: Tweet) => {
    setReplyTo(comment);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleSend = useCallback(
    async (content: string, mentionsFromInput?: Mention[]) => {
      if (!user || !userProfile || !tweetId || sending) return;
      setSending(true);

      // If replying to a comment, parentTweetId is the comment's ID
      // Otherwise it's the original tweet's ID
      const parentId = replyTo ? replyTo.id : tweetId;
      const commentMentions = mentionsFromInput ?? [];

      try {
        const newTweet = await createTweet(
          user.uid,
          {
            content,
            images: [],
            categoryIds: tweet?.categoryIds ?? [],
            parentTweetId: parentId,
            rootTweetId: replyTo ? tweetId : null,
            mentions: commentMentions,
          },
          userProfile,
        );

        // Send mention notifications
        if (commentMentions.length > 0) {
          sendMentionNotifications(commentMentions, userProfile, newTweet.id).catch(() => {});
        }

        if (replyTo) {
          // Refresh the sub-replies for the parent comment
          // Find the top-level parent: if replyTo is a top-level comment, use its ID
          // If replyTo is a sub-reply, find which top-level comment it belongs to
          const topLevelParent = comments.find((c) => c.id === replyTo.id);
          if (topLevelParent) {
            // Replied to a top-level comment → refresh its sub-replies and expand
            await fetchSubReplies(replyTo.id);
            setExpandedIds((prev) => new Set(prev).add(replyTo.id));
          } else {
            // Replied to a sub-reply → find the parent comment and refresh
            for (const [parentCommentId, replies] of Object.entries(subReplies)) {
              if (replies.some((r) => r.id === replyTo.id)) {
                await fetchSubReplies(parentCommentId);
                break;
              }
            }
          }
          // Also refresh top-level to update repliesCount
          await fetchComments();
          setReplyTo(null);
        } else {
          await fetchComments();
        }
      } catch {
        // silently fail
      } finally {
        setSending(false);
      }
    },
    [user, userProfile, tweetId, tweet, sending, replyTo, comments, subReplies, fetchComments, fetchSubReplies],
  );

  const renderComment = useCallback(
    ({ item }: { item: Tweet }) => (
      <CommentItem
        comment={item}
        interactions={interactions}
        onReply={handleReplyTo}
        expandedIds={expandedIds}
        subReplies={subReplies}
        onToggleReplies={handleToggleReplies}
      />
    ),
    [interactions, handleReplyTo, expandedIds, subReplies, handleToggleReplies],
  );

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={animateClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Overlay */}
        <TouchableWithoutFeedback onPress={animateClose}>
          <Animated.View
            style={[
              styles.overlay,
              { opacity: overlayAnim },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sheet */}
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
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              コメント
            </Text>
            <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
              {comments.reduce((sum, c) => sum + 1 + (c.repliesCount ?? 0), 0)}
            </Text>
          </View>

          {/* Comments list */}
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

          {/* Reply-to indicator */}
          {replyTo && (
            <View style={[styles.replyToBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <Text style={[styles.replyToText, { color: colors.textSecondary }]} numberOfLines={1}>
                <Text style={{ fontWeight: '700' }}>@{replyTo.author.displayName}</Text>
                {' '}に返信
              </Text>
              <TouchableOpacity
                onPress={handleCancelReply}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <View style={[styles.inputContainer, { borderTopColor: replyTo ? 'transparent' : colors.border }]}>
            <ChatInput
              placeholder={replyTo ? `@${replyTo.author.displayName}に返信...` : 'コメントを追加...'}
              onSend={handleSend}
              enableMentions
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
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  viewRepliesLine: {
    width: 24,
    height: StyleSheet.hairlineWidth,
  },
  viewRepliesText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  subReplyItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingLeft: 36 + Spacing.md, // indent under parent avatar
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expandedSeparator: {
    height: StyleSheet.hairlineWidth,
  },
  showMoreRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingLeft: 36 + Spacing.md,
  },
  replyToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyToText: {
    fontSize: FontSize.sm,
    flex: 1,
    marginRight: Spacing.sm,
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
    marginBottom: 30,
  },
});
