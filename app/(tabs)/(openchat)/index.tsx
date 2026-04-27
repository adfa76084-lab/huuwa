import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { getAllOpenChatRooms, getMyOpenChatRooms, joinOpenChat } from '@/services/api/chatService';
import { ChatRoom } from '@/types/chat';
import { Category } from '@/types/category';
import { OpenChatCard } from '@/components/chat/OpenChatCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchBar } from '@/components/ui/SearchBar';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { useChatStore } from '@/stores/chatStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { getUserCategories } from '@/services/api/categoryService';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { showInterstitial } from '@/services/ads/interstitialManager';

const SEGMENTS = ['参加中', '探す', 'お気に入り'];

export default function OpenChatListScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const selectedCategoryIds = useCategoryStore((s) => s.selectedCategoryIds);
  const favoriteIds = useChatStore((s) => s.favoriteOpenChatIds);
  const toggleFavorite = useChatStore((s) => s.toggleFavoriteOpenChat);

  const [allRooms, setAllRooms] = useState<ChatRoom[]>([]);
  const [myRooms, setMyRooms] = useState<ChatRoom[]>([]);
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(user ? 0 : 1);

  // Default categories are always available synchronously
  const defaultCategories: Category[] = useMemo(
    () => DEFAULT_CATEGORIES.map((c) => ({ ...c, imageUrl: null, membersCount: 0 })),
    [],
  );
  const allCategories = useMemo(
    () => [...defaultCategories, ...userCategories],
    [defaultCategories, userCategories],
  );

  const myRoomIds = useMemo(() => new Set(myRooms.map((r) => r.id)), [myRooms]);

  const fetchAll = useCallback(async () => {
    const catIds = selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined;
    const tasks: Promise<any>[] = [getAllOpenChatRooms(catIds)];
    if (user) {
      tasks.push(getMyOpenChatRooms(user.uid), getUserCategories());
    }
    const results = await Promise.allSettled(tasks);

    if (results[0].status === 'fulfilled') {
      setAllRooms(results[0].value);
    } else {
      console.error('[OpenChat] getAllOpenChatRooms error:', results[0].reason);
    }
    if (user && results[1]?.status === 'fulfilled') {
      setMyRooms(results[1].value);
    }
    if (user && results[2]?.status === 'fulfilled') {
      setUserCategories(results[2].value);
    }
    if (!user) {
      setMyRooms([]);
      setUserCategories([]);
    }
  }, [user, selectedCategoryIds]);

  // Fetch on mount + whenever the query inputs change (login state, joined
  // categories). Tab focus alone does NOT refetch — only pull-to-refresh.
  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Resolve selected categories for display
  const selectedCategories = useMemo(
    () => allCategories.filter((c) => selectedCategoryIds.includes(c.id)),
    [allCategories, selectedCategoryIds],
  );

  // Filter by store's selectedCategoryIds + search
  const filterRooms = useCallback(
    (rooms: ChatRoom[]) => {
      let result = rooms;

      if (selectedCategoryIds.length > 0) {
        result = result.filter(
          (r) => r.categoryId && selectedCategoryIds.includes(r.categoryId),
        );
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(
          (r) =>
            r.name?.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q),
        );
      }

      return result;
    },
    [selectedCategoryIds, searchQuery],
  );

  const joinedRooms = useMemo(() => filterRooms(myRooms), [myRooms, filterRooms]);

  const notJoinedRooms = useMemo(() => {
    const base = filterRooms(allRooms.filter((r) => !myRoomIds.has(r.id)));
    // Light ranking: log-popularity * random jitter (shuffles ties, keeps popular top)
    return base
      .map((r) => ({
        room: r,
        score:
          Math.log((r.membersCount ?? 0) + 1) * (0.7 + Math.random() * 0.6),
      }))
      .sort((a, b) => b.score - a.score)
      .map((s) => s.room);
  }, [allRooms, myRoomIds, filterRooms]);

  const favoriteRooms = useMemo(() => {
    const favSet = new Set(favoriteIds);
    return filterRooms(allRooms.filter((r) => favSet.has(r.id)));
  }, [allRooms, favoriteIds, filterRooms]);

  const handlePressRoom = useCallback(
    (room: ChatRoom) => {
      if (!user) {
        Alert.alert(
          'ログインが必要です',
          'オープンチャットに参加するにはログインしてください',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'ログイン', onPress: () => router.push('/(auth)/login') },
          ],
        );
        return;
      }
      if (myRoomIds.has(room.id)) {
        router.push(`/(tabs)/(openchat)/${room.id}`);
        return;
      }

      Alert.alert(
        'オープンチャットに参加',
        `「${room.name}」に参加しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '参加する',
            onPress: async () => {
              if (!user || !userProfile) return;
              try {
                await joinOpenChat(room.id, user.uid, userProfile);
                setMyRooms((prev) => [...prev, room]);
                router.push(`/(tabs)/(openchat)/${room.id}`);
              } catch {
                Alert.alert('エラー', '参加に失敗しました');
              }
            },
          },
        ],
      );
    },
    [myRoomIds, user, userProfile, router],
  );

  const currentRooms =
    selectedSegment === 0
      ? joinedRooms
      : selectedSegment === 1
      ? notJoinedRooms
      : favoriteRooms;

  const emptyMessage =
    selectedSegment === 0
      ? { title: '参加中のオープンチャットがありません', desc: 'オープンチャットに参加してみましょう！' }
      : selectedSegment === 1
      ? { title: 'オープンチャットが見つかりません', desc: 'すべてのオープンチャットに参加済みです！' }
      : { title: 'お気に入りがありません', desc: 'ハートを押してお気に入りに追加しましょう！' };

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Category box */}
      <View style={styles.topBar}>
        <View style={[styles.categoryBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.categoryBoxHeader}>
            <Ionicons name="folder-open-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.categoryBoxTitle, { color: colors.textSecondary }]}>
              自分の所属しているカテゴリー
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
            {selectedCategories.length > 0 ? (
              <>
                {(showAllCategories ? selectedCategories : selectedCategories.slice(0, 4)).map((cat) => (
                  <View
                    key={cat.id}
                    style={[styles.categoryChip, { backgroundColor: cat.color + '18' }]}
                  >
                    <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                    <Text style={[styles.categoryChipText, { color: cat.color }]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </View>
                ))}
                {selectedCategories.length > 4 && (
                  <TouchableOpacity
                    style={[styles.categoryChip, { backgroundColor: colors.textTertiary + '18' }]}
                    onPress={() => setShowAllCategories((v) => !v)}
                  >
                    <Ionicons name={showAllCategories ? 'chevron-back' : 'ellipsis-horizontal'} size={14} color={colors.textSecondary} />
                    <Text style={[styles.categoryChipText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {showAllCategories ? '閉じる' : `他${selectedCategories.length - 4}件`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={[styles.categoryChip, { backgroundColor: colors.primary + '14' }]}>
                <Ionicons name="grid" size={14} color={colors.primary} />
                <Text style={[styles.categoryChipText, { color: colors.primary }]}>
                  すべてのカテゴリー
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Segmented control */}
      <View style={styles.segmentWrapper}>
        <SegmentedControl
          segments={SEGMENTS}
          selectedIndex={selectedSegment}
          onSelect={setSelectedSegment}
        />
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="オープンチャットを検索..."
        />
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {currentRooms.length > 0 ? (
          currentRooms.map((room) => (
            <View key={room.id} style={styles.cardWrapper}>
              <OpenChatCard
                room={room}
                onPress={() => handlePressRoom(room)}
                isFavorite={favoriteIds.includes(room.id)}
                onToggleFavorite={() => toggleFavorite(room.id)}
              />
            </View>
          ))
        ) : (
          <EmptyState
            icon="chatbubbles-outline"
            title={emptyMessage.title}
            description={emptyMessage.desc}
          />
        )}
      </ScrollView>

      <FloatingActionButton
        icon="add"
        onPress={async () => {
          if (!user) {
            Alert.alert(
              'ログインが必要です',
              'オープンチャットを作成するにはログインしてください',
              [
                { text: 'キャンセル', style: 'cancel' },
                { text: 'ログイン', onPress: () => router.push('/(auth)/login') },
              ],
            );
            return;
          }
          await showInterstitial();
          router.push('/create-openchat');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  categoryBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  categoryBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  categoryBoxTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  categoryChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.full,
  },
  categoryChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    maxWidth: 120,
  },
  segmentWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  searchWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  listContent: {
    paddingBottom: Spacing.xxxl * 2,
  },
  cardWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
});
