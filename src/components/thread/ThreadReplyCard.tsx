import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { ThreadReply } from '@/types/thread';
import { Avatar } from '@/components/ui/Avatar';
import { MentionText } from '@/components/mention/MentionText';
import { formatFeedTime } from '@/utils/date';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { InlineVideoPlayer } from './InlineVideoPlayer';
import { FileAttachmentCard } from './FileAttachmentCard';
import { PollCard } from './PollCard';

const AVATAR_SIZE = 40;
const AVATAR_GAP = 10;
const CONTENT_LEFT = AVATAR_SIZE + AVATAR_GAP;

interface ThreadReplyCardProps {
  reply: ThreadReply;
}

export function ThreadReplyCard({ reply }: ThreadReplyCardProps) {
  const colors = useThemeColors();
  const router = useRouter();

  const pollAttachments = (reply.attachments ?? []).filter((a) => a.type === 'poll');
  const nonPollAttachments = (reply.attachments ?? []).filter((a) => a.type !== 'poll');

  return (
    <View style={styles.container}>
      {/* Header: Avatar + Name + Time */}
      <View style={styles.headerRow}>
        <Avatar uri={reply.author.avatarUrl} size={AVATAR_SIZE} />
        <Text
          style={[styles.authorName, { color: colors.text }]}
          numberOfLines={1}
        >
          {reply.author.displayName}
        </Text>
        <Text style={[styles.time, { color: colors.textTertiary }]}>
          {formatFeedTime(reply.createdAt)}
        </Text>
      </View>

      {/* Content area — indented to align under the name */}
      <View style={styles.contentArea}>
        {/* Text */}
        {reply.content.length > 0 && (
          <MentionText
            content={reply.content}
            textStyle={[styles.content, { color: colors.text }]}
            mentions={reply.mentions}
          />
        )}

        {/* Images — full width */}
        {reply.imageUrls.length > 0 && (
          <View style={styles.imageRow}>
            {reply.imageUrls.map((url, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({ pathname: '/image-viewer', params: { imageUrl: url } } as any)
                }
              >
                <Image source={{ uri: url }} style={styles.replyImage} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Rich media attachments (excluding polls) */}
        {nonPollAttachments.map((attachment, index) => {
          switch (attachment.type) {
            case 'voice':
              return (
                <VoiceMessagePlayer
                  key={`voice-${index}`}
                  url={attachment.url}
                  durationMs={attachment.durationMs}
                />
              );
            case 'video':
              return (
                <InlineVideoPlayer
                  key={`video-${index}`}
                  url={attachment.url}
                  thumbnailUrl={attachment.thumbnailUrl}
                />
              );
            case 'file':
              return (
                <FileAttachmentCard
                  key={`file-${index}`}
                  url={attachment.url}
                  name={attachment.name}
                  mimeType={attachment.mimeType}
                  sizeBytes={attachment.sizeBytes}
                />
              );
            default:
              return null;
          }
        })}

        {/* Polls */}
        {pollAttachments.map((attachment, index) => (
          <PollCard key={`poll-${index}`} pollId={attachment.pollId} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AVATAR_GAP,
  },
  authorName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    flexShrink: 1,
  },
  time: {
    fontSize: FontSize.sm,
    marginLeft: 2,
  },
  contentArea: {
    marginLeft: CONTENT_LEFT,
    marginTop: -18,
  },
  content: {
    fontSize: FontSize.md,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginLeft: -CONTENT_LEFT,
    paddingLeft: CONTENT_LEFT,
  },
  replyImage: {
    width: 260,
    height: 200,
    borderRadius: BorderRadius.md,
    resizeMode: 'cover',
  },
});
