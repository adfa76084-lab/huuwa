import React, { useRef, useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { ChatMessage } from '@/types/chat';
import { formatChatTimestamp, formatFeedTime } from '@/utils/date';
import { Avatar } from '@/components/ui/Avatar';
import { VoiceMessagePlayer } from '@/components/thread/VoiceMessagePlayer';
import { FileAttachmentCard } from '@/components/thread/FileAttachmentCard';
import { PollCard } from '@/components/thread/PollCard';
import { InlineVideoPlayer } from '@/components/thread/InlineVideoPlayer';

import { Timestamp } from 'firebase/firestore';

function formatTime(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '';
  const d = timestamp.toDate();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

const AVATAR_SIZE = 40;
const AVATAR_GAP = 10;
const CONTENT_LEFT = AVATAR_SIZE + AVATAR_GAP;

// Consistent color per sender
const SENDER_COLORS = [
  '#4FC3F7', '#AED581', '#FFB74D', '#F06292',
  '#BA68C8', '#4DD0E1', '#FFD54F', '#E57373',
  '#81C784', '#64B5F6', '#A1887F', '#90A4AE',
];

function getSenderColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash + uid.charCodeAt(i)) | 0;
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSender?: boolean;
  roomMemberCount?: number;
  onDoubleTapReact?: (messageId: string) => void;
}

export function ChatMessageBubble({ message, isOwn, showSender = true, roomMemberCount = 2, onDoubleTapReact }: ChatMessageBubbleProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const attachments = message.attachments ?? [];
  const senderColor = getSenderColor(message.senderUid);

  // Double tap reaction
  const lastTapRef = useRef(0);
  const heartAnim = useRef(new Animated.Value(0)).current;

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      onDoubleTapReact?.(message.id);
      Animated.sequence([
        Animated.timing(heartAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(600),
        Animated.timing(heartAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
    lastTapRef.current = now;
  }, [message.id, onDoubleTapReact, heartAnim]);

  // Reactions display
  const reactions = message.reactions ?? {};
  const totalReactions = Object.values(reactions).reduce((sum, uids) => sum + uids.length, 0);

  // Read receipt status for own messages
  const readBy = message.readBy ?? [];
  const readByOthers = readBy.filter((uid) => uid !== message.senderUid);
  const readStatus = isOwn
    ? readByOthers.length >= roomMemberCount - 1
      ? '既読'
      : '送信済み'
    : null;

  const hasText = message.content.trim().length > 0;
  const hasImage = !!message.imageUrl;
  const pollAttachments = attachments.filter((a) => a.type === 'poll');
  const nonPollAttachments = attachments.filter((a) => a.type !== 'poll');

  const timeText = formatFeedTime(message.createdAt);

  // ─── Render non-poll attachments ───
  const renderAttachments = () => (
    <>
      {hasImage && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            router.push({ pathname: '/image-viewer', params: { imageUrl: message.imageUrl! } })
          }
        >
          <Image source={{ uri: message.imageUrl! }} style={styles.image} />
        </TouchableOpacity>
      )}
      {nonPollAttachments.map((att, idx) => {
        switch (att.type) {
          case 'voice':
            return <VoiceMessagePlayer key={`voice-${idx}`} url={att.url} durationMs={att.durationMs} />;
          case 'file':
            return (
              <FileAttachmentCard
                key={`file-${idx}`}
                url={att.url}
                name={att.name}
                mimeType={att.mimeType}
                sizeBytes={att.sizeBytes}
              />
            );
          case 'video':
            return <InlineVideoPlayer key={`video-${idx}`} url={att.url} />;
          default:
            return null;
        }
      })}
    </>
  );

  const hasNonPollContent = hasText || hasImage || nonPollAttachments.length > 0;

  // ═══════════════════════════════════════
  // Own message — right-aligned bubble
  // ═══════════════════════════════════════
  // Reaction badge shown below bubble
  const reactionBadge = totalReactions > 0 ? (
    <View style={[styles.reactionBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {Object.entries(reactions).map(([emoji, uids]) => (
        <View key={emoji} style={styles.reactionItem}>
          <Text style={styles.reactionEmoji}>{emoji}</Text>
          {uids.length > 1 && (
            <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>{uids.length}</Text>
          )}
        </View>
      ))}
    </View>
  ) : null;

  // Heart animation overlay
  const heartOverlay = (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.heartOverlay,
        {
          opacity: heartAnim,
          transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }],
        },
      ]}
    >
      <Ionicons name="heart" size={40} color="#FF3B30" />
    </Animated.View>
  );

  if (isOwn) {
    return (
      <View style={showSender ? styles.spacedTop : styles.groupedTop}>
        {hasNonPollContent && (
          <TouchableOpacity style={styles.ownWrapper} activeOpacity={1} onPress={handleTap}>
            <View style={styles.ownRow}>
              <View style={styles.ownMeta}>
                {readStatus && (
                  <Text style={[styles.readStatus, { color: readStatus === '既読' ? colors.primary : colors.textTertiary }]}>
                    {readStatus}
                  </Text>
                )}
                <Text style={[styles.ownTimeLabel, { color: colors.textTertiary }]}>
                  {formatTime(message.createdAt)}
                </Text>
              </View>
              <View style={[styles.ownBubble, { backgroundColor: colors.primary }]}>
                {hasText && <Text style={styles.ownText}>{message.content}</Text>}
                {renderAttachments()}
                {heartOverlay}
              </View>
            </View>
            {reactionBadge && <View style={styles.reactionRight}>{reactionBadge}</View>}
          </TouchableOpacity>
        )}
        {pollAttachments.length > 0 && (
          <View style={styles.pollContainer}>
            {pollAttachments.map((att, idx) => (
              <PollCard key={`poll-${idx}`} pollId={att.pollId} />
            ))}
          </View>
        )}
      </View>
    );
  }

  // ═══════════════════════════════════════
  // Other's message — LINE open chat style
  //   [Avatar]  [Name]  [Time]
  //             [Message text]
  // ═══════════════════════════════════════
  return (
    <View style={showSender ? styles.spacedTop : styles.groupedTop}>
      <TouchableOpacity style={styles.otherWrapper} activeOpacity={1} onPress={handleTap}>
        {showSender && (
          <View style={styles.headerRow}>
            <Avatar uri={message.sender.avatarUrl} size={AVATAR_SIZE} />
            <Text style={[styles.senderName, { color: senderColor }]}>
              {message.sender.displayName}
            </Text>
            <Text style={[styles.headerTime, { color: colors.textTertiary }]}>{timeText}</Text>
          </View>
        )}
        {hasNonPollContent && (
          <View style={[styles.messageBody, !showSender && { marginTop: 0 }]}>
            {hasText && (
              <Text style={[styles.otherText, { color: colors.text }]}>{message.content}</Text>
            )}
            {renderAttachments()}
            {heartOverlay}
          </View>
        )}
        {reactionBadge && <View style={styles.reactionLeft}>{reactionBadge}</View>}
      </TouchableOpacity>
      {pollAttachments.length > 0 && (
        <View style={styles.pollContainer}>
          {pollAttachments.map((att, idx) => (
            <PollCard key={`poll-${idx}`} pollId={att.pollId} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Spacing ──
  spacedTop: {
    marginTop: Spacing.lg,
  },
  groupedTop: {
    marginTop: 2,
  },

  // ── Other's message ──
  otherWrapper: {
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AVATAR_GAP,
  },
  messageBody: {
    marginLeft: CONTENT_LEFT,
    marginTop: -18,
  },
  senderName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  headerTime: {
    fontSize: FontSize.sm,
  },
  otherText: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },

  // ── Own message ──
  ownWrapper: {
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-end',
    maxWidth: '78%',
  },
  ownRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  ownMeta: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    marginBottom: 2,
    gap: 1,
  },
  readStatus: {
    fontSize: 10,
    fontWeight: '600',
  },
  ownTimeLabel: {
    fontSize: 11,
  },
  ownBubble: {
    borderRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm + 2,
    overflow: 'hidden',
  },
  ownText: {
    fontSize: FontSize.md,
    lineHeight: 22,
    color: '#FFFFFF',
  },

  // ── Poll (full width) ──
  pollContainer: {
    paddingHorizontal: Spacing.md,
    width: '100%',
  },

  // ── Reactions ──
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  reactionRight: {
    alignItems: 'flex-end',
    marginRight: Spacing.xs,
  },
  reactionLeft: {
    alignItems: 'flex-start',
    marginLeft: CONTENT_LEFT,
  },
  heartOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
  },

  // ── Shared ──
  image: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.md,
    resizeMode: 'cover',
    marginTop: Spacing.xs,
  },
});
