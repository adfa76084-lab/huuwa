import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { useTweetInteractions } from '@/hooks/useTweetInteractions';
import { searchUsers } from '@/services/api/userService';
import { searchTweets } from '@/services/api/tweetService';
import { searchHashtags, getTrendingHashtags } from '@/services/api/hashtagService';
import { User } from '@/types/user';
import { Tweet } from '@/types/tweet';
import { Hashtag } from '@/types/hashtag';
import { Avatar } from '@/components/ui/Avatar';
import { TweetCard } from '@/components/tweet/TweetCard';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

const TABS = ['話題', 'ユーザー', 'ハッシュタグ'];

export default function SearchScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Results
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);

  // Trending (shown when no query)
  const [trending, setTrending] = useState<Hashtag[]>([]);

  // Search history
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const { likedIds, bookmarkedIds, checkTweets, handleLike, handleBookmark, likeDelta, bookmarkDelta } = useTweetInteractions();

  useEffect(() => {
    getTrendingHashtags().then(setTrending).catch(() => {});
    AsyncStorage.getItem('search-history').then((val) => {
      if (val) setSearchHistory(JSON.parse(val));
    }).catch(() => {});
  }, []);

  const saveToHistory = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...searchHistory.filter((h) => h !== trimmed)].slice(0, 10);
    setSearchHistory(updated);
    await AsyncStorage.setItem('search-history', JSON.stringify(updated));
  }, [searchHistory]);

  const removeFromHistory = useCallback(async (term: string) => {
    const updated = searchHistory.filter((h) => h !== term);
    setSearchHistory(updated);
    await AsyncStorage.setItem('search-history', JSON.stringify(updated));
  }, [searchHistory]);

  const clearHistory = useCallback(async () => {
    setSearchHistory([]);
    await AsyncStorage.removeItem('search-history');
  }, []);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setHasSearched(true);
    saveToHistory(q);
    try {
      const [tweetResults, userResults, hashtagResults] = await Promise.allSettled([
        searchTweets(q),
        searchUsers(q),
        searchHashtags(q),
      ]);
      const tweetData = tweetResults.status === 'fulfilled' ? tweetResults.value : [];
      setTweets(tweetData);
      setUsers(userResults.status === 'fulfilled' ? userResults.value : []);
      setHashtags(hashtagResults.status === 'fulfilled' ? hashtagResults.value : []);
      if (tweetData.length > 0) {
        checkTweets(tweetData.map((t) => t.id));
      }
    } finally {
      setLoading(false);
    }
  }, [query, checkTweets]);

  const handleClear = useCallback(() => {
    setQuery('');
    setHasSearched(false);
    setTweets([]);
    setUsers([]);
    setHashtags([]);
    inputRef.current?.focus();
  }, []);

  // ─── Suggest state (shown while typing, before confirming search) ───
  const [suggestUsers, setSuggestUsers] = useState<User[]>([]);
  const [suggestHashtags, setSuggestHashtags] = useState<Hashtag[]>([]);
  const [suggestTweets, setSuggestTweets] = useState<Tweet[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const suggestHistoryMatches = query.trim()
    ? searchHistory.filter((h) => h.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : [];

  const showSuggestions = query.trim().length > 0 && !hasSearched;

  // Fetch suggestions with fast debounce (250ms)
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!query.trim() || hasSearched) {
      setSuggestUsers([]);
      setSuggestHashtags([]);
      setSuggestTweets([]);
      return;
    }
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      const [uResult, hResult, tResult] = await Promise.allSettled([
        searchUsers(query.trim()),
        searchHashtags(query.trim()),
        searchTweets(query.trim()),
      ]);
      setSuggestUsers(
        (uResult.status === 'fulfilled' ? uResult.value : []).slice(0, 3),
      );
      setSuggestHashtags(
        (hResult.status === 'fulfilled' ? hResult.value : []).slice(0, 3),
      );
      const tweetSuggestions = (tResult.status === 'fulfilled' ? tResult.value : []).slice(0, 3);
      setSuggestTweets(tweetSuggestions);
      if (tweetSuggestions.length > 0) {
        checkTweets(tweetSuggestions.map((t) => t.id));
      }
      setSuggestLoading(false);
    }, 250);
    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  }, [query, hasSearched]);

  // Confirm search (Enter or tap suggestion)
  const confirmSearch = useCallback((term: string) => {
    setQuery(term);
    const doSearch = async () => {
      setLoading(true);
      setHasSearched(true);
      saveToHistory(term);
      try {
        const [tweetResults, userResults, hashtagResults] = await Promise.allSettled([
          searchTweets(term),
          searchUsers(term),
          searchHashtags(term),
        ]);
        const tweetData = tweetResults.status === 'fulfilled' ? tweetResults.value : [];
        setTweets(tweetData);
        setUsers(userResults.status === 'fulfilled' ? userResults.value : []);
        setHashtags(hashtagResults.status === 'fulfilled' ? hashtagResults.value : []);
        if (tweetData.length > 0) {
          checkTweets(tweetData.map((t) => t.id));
        }
      } finally {
        setLoading(false);
      }
    };
    doSearch();
  }, [saveToHistory, checkTweets]);

  const renderTrendingSection = () => (
    <ScrollView contentContainerStyle={styles.trendingContent}>
      {/* Search history */}
      {searchHistory.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>最近の検索</Text>
            <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
              <Text style={[styles.clearText, { color: colors.primary }]}>すべて削除</Text>
            </TouchableOpacity>
          </View>
          {searchHistory.map((term) => (
            <TouchableOpacity
              key={term}
              style={[styles.historyItem, { borderBottomColor: colors.border }]}
              onPress={() => { setQuery(term); }}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={16} color={colors.textTertiary} />
              <Text style={[styles.historyText, { color: colors.text }]} numberOfLines={1}>
                {term}
              </Text>
              <TouchableOpacity
                onPress={() => removeFromHistory(term)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Trending hashtags */}
      <View style={styles.sectionHeader}>
        <Ionicons name="trending-up" size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>トレンド</Text>
      </View>
      {trending.length === 0 ? (
        <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
          まだトレンドがありません
        </Text>
      ) : (
        trending.map((tag, index) => (
          <TouchableOpacity
            key={tag.id}
            style={[styles.trendItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/(tabs)/(home)/hashtag/${encodeURIComponent(tag.name)}` as any)}
            activeOpacity={0.6}
          >
            <View>
              <Text style={[styles.trendCategory, { color: colors.textTertiary }]}>
                {index + 1} ・ トレンド
              </Text>
              <Text style={[styles.trendTag, { color: colors.text }]}>#{tag.name}</Text>
              <Text style={[styles.trendCount, { color: colors.textSecondary }]}>
                {tag.postCount}件の投稿
              </Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderResults = () => {
    if (loading) return <LoadingIndicator fullScreen />;

    if (selectedTab === 0) {
      // 話題 (Tweets)
      if (tweets.length === 0) {
        return (
          <EmptyState
            icon="document-text-outline"
            title="投稿が見つかりません"
            description={`「${query}」に一致する投稿はありません`}
          />
        );
      }
      return (
        <FlashList
          data={tweets}
          renderItem={({ item }) => (
            <TweetCard
              tweet={item}
              onPress={() => router.push(`/(tabs)/(home)/tweet/${item.id}`)}
              onProfilePress={() => router.push(`/(tabs)/(home)/profile/${item.authorUid}`)}
              isLiked={likedIds.has(item.id)}
              isBookmarked={bookmarkedIds.has(item.id)}
              onLike={() => handleLike(item.id)}
              onBookmark={() => handleBookmark(item.id)}
              likeDelta={likeDelta(item.id)}
              bookmarkDelta={bookmarkDelta(item.id)}
            />
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={120}
        />
      );
    }

    if (selectedTab === 1) {
      // ユーザー
      if (users.length === 0) {
        return (
          <EmptyState
            icon="person-outline"
            title="ユーザーが見つかりません"
            description={`「${query}」に一致するユーザーはいません`}
          />
        );
      }
      return (
        <ScrollView>
          {users.map((u) => (
            <TouchableOpacity
              key={u.uid}
              style={[styles.userItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/(tabs)/(home)/profile/${u.uid}`)}
              activeOpacity={0.7}
            >
              <Avatar uri={u.avatarUrl} size={48} />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                  {u.displayName}
                </Text>
                <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                  @{u.username}
                </Text>
                {u.bio ? (
                  <Text style={[styles.userBio, { color: colors.textSecondary }]} numberOfLines={2}>
                    {u.bio}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    // ハッシュタグ
    if (hashtags.length === 0) {
      return (
        <EmptyState
          icon="pricetag-outline"
          title="ハッシュタグが見つかりません"
          description={`「${query}」に一致するハッシュタグはありません`}
        />
      );
    }
    return (
      <ScrollView>
        {hashtags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            style={[styles.hashtagItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/(tabs)/(home)/hashtag/${encodeURIComponent(tag.name)}` as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.hashtagIcon, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="pricetag" size={18} color={colors.textTertiary} />
            </View>
            <View style={styles.hashtagInfo}>
              <Text style={[styles.hashtagName, { color: colors.text }]}>#{tag.name}</Text>
              <Text style={[styles.hashtagCount, { color: colors.textSecondary }]}>
                {tag.postCount}件の投稿
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Search header */}
      <View style={[styles.searchHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="検索"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => confirmSearch(query.trim())}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestions dropdown (while typing, before confirming) */}
      {showSuggestions && (
        <ScrollView style={styles.suggestContainer} keyboardShouldPersistTaps="handled">
          {/* History matches */}
          {suggestHistoryMatches.map((term) => (
            <TouchableOpacity
              key={`h-${term}`}
              style={[styles.suggestItem, { borderBottomColor: colors.border }]}
              onPress={() => confirmSearch(term)}
            >
              <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
              <Text style={[styles.suggestText, { color: colors.text }]} numberOfLines={1}>{term}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}

          {/* User suggestions */}
          {suggestUsers.map((u) => (
            <TouchableOpacity
              key={`u-${u.uid}`}
              style={[styles.suggestItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/(tabs)/(home)/profile/${u.uid}`)}
            >
              <Avatar uri={u.avatarUrl} size={28} />
              <View style={styles.suggestUserInfo}>
                <Text style={[styles.suggestUserName, { color: colors.text }]} numberOfLines={1}>
                  {u.displayName}
                </Text>
                <Text style={[styles.suggestUserHandle, { color: colors.textTertiary }]} numberOfLines={1}>
                  @{u.username}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Hashtag suggestions */}
          {suggestHashtags.map((tag) => (
            <TouchableOpacity
              key={`t-${tag.id}`}
              style={[styles.suggestItem, { borderBottomColor: colors.border }]}
              onPress={() => confirmSearch(`#${tag.name}`)}
            >
              <Ionicons name="pricetag-outline" size={18} color={colors.textTertiary} />
              <Text style={[styles.suggestText, { color: colors.text }]} numberOfLines={1}>
                #{tag.name}
              </Text>
              <Text style={[styles.suggestMeta, { color: colors.textSecondary }]}>
                {tag.postCount}件
              </Text>
            </TouchableOpacity>
          ))}

          {/* Tweet suggestions */}
          {suggestTweets.map((tweet) => (
            <TweetCard
              key={`tw-${tweet.id}`}
              tweet={tweet}
              onPress={() => router.push(`/(tabs)/(home)/tweet/${tweet.id}`)}
              onProfilePress={() => router.push(`/(tabs)/(home)/profile/${tweet.authorUid}`)}
              isLiked={likedIds.has(tweet.id)}
              isBookmarked={bookmarkedIds.has(tweet.id)}
              onLike={() => handleLike(tweet.id)}
              onBookmark={() => handleBookmark(tweet.id)}
              likeDelta={likeDelta(tweet.id)}
              bookmarkDelta={bookmarkDelta(tweet.id)}
            />
          ))}

          {suggestLoading && (
            <View style={styles.suggestLoadingRow}>
              <LoadingIndicator />
            </View>
          )}
        </ScrollView>
      )}

      {/* Tabs - only show when searched */}
      {hasSearched && (
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {TABS.map((tab, index) => {
            const isActive = selectedTab === index;
            const count = index === 0 ? tweets.length : index === 1 ? users.length : hashtags.length;
            return (
              <TouchableOpacity
                key={tab}
                style={styles.tabItem}
                onPress={() => setSelectedTab(index)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? colors.text : colors.textTertiary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab}
                  {hasSearched && !loading && count > 0 ? ` ${count}` : ''}
                </Text>
                {isActive && (
                  <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Content */}
      {!showSuggestions && (
        <View style={styles.content}>
          {hasSearched ? renderResults() : renderTrendingSection()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Search header
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 38,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    position: 'relative',
  },
  tabLabel: {
    fontSize: FontSize.sm,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    height: 3,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  // Suggestions
  suggestContainer: {
    flex: 1,
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestText: {
    flex: 1,
    fontSize: FontSize.md,
  },
  suggestMeta: {
    fontSize: FontSize.xs,
  },
  suggestUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  suggestUserName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  suggestUserHandle: {
    fontSize: FontSize.sm,
  },
  suggestLoadingRow: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  // Trending
  trendingContent: {
    paddingBottom: Spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    flex: 1,
  },
  clearButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  clearText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyText: {
    flex: 1,
    fontSize: FontSize.md,
  },
  emptyHint: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.sm,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  trendCategory: {
    fontSize: FontSize.xs,
    marginBottom: 2,
  },
  trendTag: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  trendCount: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  // User results
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  userHandle: {
    fontSize: FontSize.sm,
    marginTop: 1,
  },
  userBio: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  // Hashtag results
  hashtagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hashtagIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagInfo: {
    flex: 1,
  },
  hashtagName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  hashtagCount: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});
