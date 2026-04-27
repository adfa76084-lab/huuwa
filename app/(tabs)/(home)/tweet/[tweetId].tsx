import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { useTweetInteractions } from '@/hooks/useTweetInteractions';
import { useTweetImpressions } from '@/hooks/useTweetImpressions';
import { recordTweetImpression } from '@/services/api/tweetService';
import { Spacing, FontSize } from '@/constants/theme';
import { getTweet, getTweetReplies, createTweet } from '@/services/api/tweetService';
import { Tweet } from '@/types/tweet';
import { TweetCard } from '@/components/tweet/TweetCard';
import { CommentBottomSheet } from '@/components/tweet/CommentBottomSheet';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChatInput } from '@/components/chat/ChatInput';

export default function TweetDetailScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { tweetId } = useLocalSearchParams<{ tweetId: string }>();
  const { user, userProfile } = useAuth();
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [replies, setReplies] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const interactions = useTweetInteractions();
  const impressions = useTweetImpressions();
  const [commentTweetId, setCommentTweetId] = useState<string | null>(null);
  const [commentTweet, setCommentTweet] = useState<Tweet | null>(null);

  const fetchData = useCallback(async () => {
    if (!tweetId) return;
    try {
      const [tweetData, repliesData] = await Promise.all([
        getTweet(tweetId),
        getTweetReplies(tweetId),
      ]);
      setTweet(tweetData);
      setReplies(repliesData.items);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [tweetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Record impression for the main tweet
  useEffect(() => {
    if (user && tweetId) {
      recordTweetImpression(user.uid, tweetId);
    }
  }, [user, tweetId]);

  // Check like/bookmark state for main tweet + replies
  useEffect(() => {
    const ids = replies.map((r) => r.id);
    if (tweet) ids.push(tweet.id);
    if (ids.length > 0) {
      interactions.checkTweets(ids);
    }
  }, [tweet, replies]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSendReply = async (content: string) => {
    if (!user || !userProfile || !tweetId || sending) return;
    setSending(true);
    try {
      await createTweet(user.uid, {
        content,
        images: [],
        categoryIds: tweet?.categoryIds ?? [],
        parentTweetId: tweetId,
      }, userProfile);
      await fetchData();
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  const handleReplyPress = useCallback(
    (replyTweet: Tweet) => {
      setCommentTweet(replyTweet);
      setCommentTweetId(replyTweet.id);
    },
    [],
  );

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
        extraData={[interactions.likedIds, interactions.bookmarkedIds]}
        onViewableItemsChanged={impressions.onViewableItemsChanged}
        viewabilityConfig={impressions.viewabilityConfig}
        renderItem={({ item }) => (
          <TweetCard
            tweet={item}
            onPress={() => handleReplyPress(item)}
            onLike={() => interactions.handleLike(item.id)}
            onBookmark={() => interactions.handleBookmark(item.id)}
            onReply={() => handleReplyPress(item)}
            isLiked={interactions.likedIds.has(item.id)}
            isBookmarked={interactions.bookmarkedIds.has(item.id)}
            likeDelta={interactions.likeDelta(item.id)}
            bookmarkDelta={interactions.bookmarkDelta(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          tweet ? (
            <View style={styles.headerTweet}>
              <TweetCard
                tweet={tweet}
                onLike={() => interactions.handleLike(tweet.id)}
                onBookmark={() => interactions.handleBookmark(tweet.id)}
                isLiked={interactions.likedIds.has(tweet.id)}
                isBookmarked={interactions.bookmarkedIds.has(tweet.id)}
                likeDelta={interactions.likeDelta(tweet.id)}
                bookmarkDelta={interactions.bookmarkDelta(tweet.id)}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-outline"
            title="まだ返信がありません"
            description="最初の返信をしてみましょう！"
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
      {user ? (
        <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
          <ChatInput
            placeholder="返信を入力..."
            onSend={handleSendReply}
          />
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.loginPromptBar, { borderTopColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.7}
        >
          <Text style={[styles.loginPromptText, { color: colors.primary }]}>
            コメントするにはログインしてください
          </Text>
        </TouchableOpacity>
      )}

      <CommentBottomSheet
        visible={commentTweetId !== null}
        tweetId={commentTweetId}
        tweet={commentTweet}
        onClose={() => {
          setCommentTweetId(null);
          setCommentTweet(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTweet: {
    marginBottom: Spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
  },
  inputContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
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
});
