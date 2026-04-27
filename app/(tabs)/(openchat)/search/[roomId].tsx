import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { ChatRoom, ChatMessage } from '@/types/chat';
import { UserProfile } from '@/types/user';
import { getChatRoom, searchMessages } from '@/services/api/chatService';
import { SearchBar } from '@/components/ui/SearchBar';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { formatRelativeTime } from '@/utils/date';

export default function SearchScreen() {
  const colors = useThemeColors();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [query, setQuery] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [results, setResults] = useState<ChatMessage[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roomLoading, setRoomLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    (async () => {
      const r = await getChatRoom(roomId);
      setRoom(r);
      setRoomLoading(false);
    })();
  }, [roomId]);

  const members: UserProfile[] = useMemo(() => {
    if (!room) return [];
    return room.members
      .map((uid) => room.memberProfiles[uid])
      .filter(Boolean);
  }, [room]);

  const doSearch = useCallback(async () => {
    if (!roomId) return;
    if (!query.trim() && !selectedUid) return;
    setLoading(true);
    setSearched(true);
    const msgs = await searchMessages(roomId, query.trim(), selectedUid);
    setResults(msgs);
    setLoading(false);
  }, [roomId, query, selectedUid]);

  // Auto-search when filter changes
  useEffect(() => {
    if (selectedUid || query.trim()) {
      doSearch();
    } else {
      setResults([]);
      setSearched(false);
    }
  }, [selectedUid]);

  const handleSubmit = () => {
    doSearch();
  };

  const handleSelectMember = (uid: string) => {
    setSelectedUid((prev) => (prev === uid ? null : uid));
  };

  if (roomLoading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarWrapper}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="メッセージを検索..."
            autoFocus
          />
        </View>
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Member filter chips */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
          メンバーで絞り込み
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipList}
        >
          {members.map((m) => {
            const isSelected = selectedUid === m.uid;
            return (
              <TouchableOpacity
                key={m.uid}
                style={[
                  styles.chip,
                  isSelected
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                ]}
                onPress={() => handleSelectMember(m.uid)}
                activeOpacity={0.7}
              >
                <Avatar uri={m.avatarUrl} size={20} />
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {m.displayName}
                </Text>
                {isSelected && (
                  <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results */}
      {loading ? (
        <LoadingIndicator fullScreen />
      ) : (
        <FlashList
          data={results}
          renderItem={({ item }) => (
            <SearchResultItem message={item} currentUid={user?.uid ?? ''} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultList}
          ListEmptyComponent={
            searched ? (
              <EmptyState
                icon="search-outline"
                title="結果が見つかりません"
                description="別のキーワードやメンバーで検索してみてください"
              />
            ) : (
              <EmptyState
                icon="search-outline"
                title="メッセージを検索"
                description="キーワードを入力するか、メンバーで絞り込んで検索できます"
              />
            )
          }
        />
      )}
    </View>
  );
}

function SearchResultItem({
  message,
  currentUid,
}: {
  message: ChatMessage;
  currentUid: string;
}) {
  const colors = useThemeColors();
  const isOwn = message.senderUid === currentUid;

  return (
    <View style={[styles.resultItem, { borderBottomColor: colors.border }]}>
      <Avatar uri={message.sender.avatarUrl} size={36} />
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={[styles.resultSender, { color: colors.text }]}>
            {isOwn ? 'あなた' : message.sender.displayName}
          </Text>
          <Text style={[styles.resultTime, { color: colors.textTertiary }]}>
            {formatRelativeTime(message.createdAt)}
          </Text>
        </View>
        <Text
          style={[styles.resultText, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {message.content}
        </Text>
        {message.imageUrl && (
          <View style={styles.resultImageBadge}>
            <Ionicons name="image-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.resultImageText, { color: colors.textTertiary }]}>
              画像
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  searchBarWrapper: {
    flex: 1,
  },
  searchButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  chipList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    maxWidth: 80,
  },
  resultList: {
    paddingBottom: Spacing.xxl,
  },
  resultItem: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  resultSender: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  resultTime: {
    fontSize: FontSize.xs,
  },
  resultText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  resultImageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  resultImageText: {
    fontSize: FontSize.xs,
  },
});
