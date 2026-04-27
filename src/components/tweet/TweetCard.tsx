import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Tweet } from '@/types/tweet';
import { Mention } from '@/types/mention';
import { Avatar } from '@/components/ui/Avatar';
import { TweetMedia } from './TweetMedia';
import { TweetActions } from './TweetActions';
import { TweetMenu } from './TweetMenu';
import { PollCard } from '@/components/thread/PollCard';
import { formatFeedTime } from '@/utils/date';

interface TweetCardProps {
  tweet: Tweet;
  onPress?: () => void;
  onProfilePress?: () => void;
  onLike?: () => void;
  onBookmark?: () => void;
  onReply?: () => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
  likeDelta?: number;
  bookmarkDelta?: number;
}

/**
 * Render tweet content with clickable hashtags and @mentions highlighted.
 */
function TweetContent({
  content,
  textColor,
  primaryColor,
  mentions,
}: {
  content: string;
  textColor: string;
  primaryColor: string;
  mentions?: Mention[];
}) {
  const router = useRouter();
  const mentionColor = '#3498DB';

  // Build username→uid lookup
  const usernameToUid: Record<string, string> = {};
  if (mentions) {
    for (const m of mentions) {
      usernameToUid[m.username] = m.uid;
    }
  }

  // Split content by both @mention and #hashtag patterns
  const parts = content.split(/([@#][a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF_]+)/g);

  return (
    <Text style={[styles.content, { color: textColor }]}>
      {parts.map((part, index) => {
        if (part.startsWith('#') && part.length > 1) {
          const tag = part.slice(1);
          return (
            <Text
              key={index}
              style={{ color: primaryColor, fontWeight: '600' }}
              onPress={() => router.push(`/(tabs)/(home)/hashtag/${encodeURIComponent(tag)}` as any)}
            >
              {part}
            </Text>
          );
        }
        if (part.startsWith('@') && part.length > 1) {
          const username = part.slice(1);
          const uid = usernameToUid[username];
          return (
            <Text
              key={index}
              style={{ color: mentionColor, fontWeight: '700' }}
              onPress={() => {
                if (uid) {
                  router.push(`/(tabs)/(home)/profile/${uid}` as any);
                }
              }}
            >
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

export function TweetCard({
  tweet,
  onPress,
  onProfilePress,
  onLike,
  onBookmark,
  onReply,
  isLiked = false,
  isBookmarked = false,
  likeDelta = 0,
  bookmarkDelta = 0,
}: TweetCardProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <Avatar
          uri={tweet.author.avatarUrl}
          size={46}
          onPress={onProfilePress}
        />
        <View style={styles.body}>
          {/* Author info row */}
          <View style={styles.authorRow}>
            <TouchableOpacity
              onPress={onProfilePress}
              activeOpacity={0.7}
              style={styles.authorLeft}
            >
              <Text
                style={[styles.displayName, { color: colors.text }]}
                numberOfLines={1}
              >
                {tweet.author.displayName}
              </Text>
              <Text
                style={[styles.username, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                @{tweet.author.username}
              </Text>
              <Text style={[styles.separator, { color: colors.textTertiary }]}>
                ·
              </Text>
              <Text style={[styles.time, { color: colors.textTertiary }]}>
                {formatFeedTime(tweet.createdAt)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={12}
              style={styles.moreButton}
              activeOpacity={0.6}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Tweet content with clickable hashtags and mentions */}
          {tweet.content.length > 0 && (
            <TweetContent
              content={tweet.content}
              textColor={colors.text}
              primaryColor={colors.primary}
              mentions={tweet.mentions}
            />
          )}

          {/* Hashtag badges (for tags not inline in content) */}
          {tweet.hashtags && tweet.hashtags.length > 0 && (() => {
            // Show tags that are NOT already inline in the content
            const inlineTags = new Set<string>();
            const regex = /#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF_]+)/g;
            let m: RegExpExecArray | null;
            while ((m = regex.exec(tweet.content)) !== null) {
              inlineTags.add(m[1]);
            }
            const extraTags = tweet.hashtags.filter((t) => !inlineTags.has(t));
            if (extraTags.length === 0) return null;
            return (
              <View style={styles.hashtagRow}>
                {extraTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => router.push(`/(tabs)/(home)/hashtag/${encodeURIComponent(tag)}` as any)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.hashtagText, { color: colors.primary }]}>
                      #{tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })()}

          {/* Images */}
          {tweet.imageUrls.length > 0 && (
            <TweetMedia imageUrls={tweet.imageUrls} onPress={() => {}} />
          )}

          {/* Action bar */}
          <TweetActions
            likesCount={Math.max(0, tweet.likesCount + likeDelta)}
            repliesCount={tweet.repliesCount}
            bookmarksCount={Math.max(0, tweet.bookmarksCount + bookmarkDelta)}
            viewsCount={tweet.viewsCount}
            isLiked={isLiked}
            isBookmarked={isBookmarked}
            onLike={onLike}
            onReply={onReply}
            onBookmark={onBookmark}
          />
        </View>
      </View>

      {/* Poll — full bleed, breaks out of container padding */}
      {tweet.pollId && (
        <View style={styles.pollContainer}>
          <PollCard pollId={tweet.pollId} />
        </View>
      )}

      <TweetMenu
        tweet={tweet}
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  body: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'nowrap',
  },
  authorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  moreButton: {
    padding: 2,
  },
  displayName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    flexShrink: 1,
  },
  username: {
    fontSize: FontSize.sm,
    flexShrink: 2,
  },
  separator: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  time: {
    fontSize: FontSize.sm,
  },
  content: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  hashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  hashtagText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  pollContainer: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.sm,
  },
});
