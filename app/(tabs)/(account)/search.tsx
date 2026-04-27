import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { getUserTweets } from '@/services/api/tweetService';
import { getUserThreads } from '@/services/api/threadService';
import { getCreatedOpenChats } from '@/services/api/chatService';
import { Tweet } from '@/types/tweet';
import { Thread } from '@/types/thread';
import { ChatRoom } from '@/types/chat';
import { TweetCard } from '@/components/tweet/TweetCard';
import { ThreadCard } from '@/components/thread/ThreadCard';
import { OpenChatCard } from '@/components/chat/OpenChatCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchBar } from '@/components/ui/SearchBar';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing } from '@/constants/theme';

const SEGMENTS = ['投稿', 'スレッド', 'オープンチャット'];

export default function MyProfileSearchScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState(0);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [openChats, setOpenChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getUserTweets(user.uid).then((r) => r.items).catch(() => []),
      getUserThreads(user.uid).then((r) => r.items).catch(() => []),
      getCreatedOpenChats(user.uid).catch(() => []),
    ])
      .then(([tw, th, oc]) => {
        setTweets(tw);
        setThreads(th);
        setOpenChats(oc);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const q = query.trim().toLowerCase();

  const filteredTweets = useMemo(() => {
    if (!q) return tweets;
    return tweets.filter((t) => t.content.toLowerCase().includes(q));
  }, [tweets, q]);

  const filteredThreads = useMemo(() => {
    if (!q) return threads;
    return threads.filter((t) => t.title.toLowerCase().includes(q));
  }, [threads, q]);

  const filteredOpenChats = useMemo(() => {
    if (!q) return openChats;
    return openChats.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q),
    );
  }, [openChats, q]);

  const activeCount =
    segment === 0
      ? filteredTweets.length
      : segment === 1
      ? filteredThreads.length
      : filteredOpenChats.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchWrapper}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="自分の投稿・スレッド・オープンチャットを検索"
          autoFocus
        />
      </View>

      <View style={styles.segmentWrapper}>
        <SegmentedControl
          segments={SEGMENTS}
          selectedIndex={segment}
          onSelect={setSegment}
        />
      </View>

      {loading ? (
        <LoadingIndicator />
      ) : activeCount === 0 ? (
        <EmptyState
          icon="search-outline"
          title={q ? '該当する項目がありません' : '検索しましょう'}
          description={q ? 'キーワードを変えて試してみてください' : '自分が投稿したコンテンツから検索できます'}
        />
      ) : segment === 0 ? (
        <FlashList
          data={filteredTweets}
          renderItem={({ item }) => (
            <TweetCard
              tweet={item}
              onPress={() => router.push(`/(tabs)/(home)/tweet/${item.id}`)}
            />
          )}
          keyExtractor={(item) => item.id}
        />
      ) : segment === 1 ? (
        <FlashList
          data={filteredThreads}
          renderItem={({ item }) => (
            <ThreadCard
              thread={item}
              onPress={() => router.push(`/(tabs)/(home)/thread/${item.id}`)}
            />
          )}
          keyExtractor={(item) => item.id}
        />
      ) : (
        <FlatList
          data={filteredOpenChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs }}>
              <OpenChatCard
                room={item}
                onPress={() => router.push(`/(tabs)/(openchat)/${item.id}` as any)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrapper: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  segmentWrapper: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
});
