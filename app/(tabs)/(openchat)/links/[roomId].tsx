import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { subscribeToChatMessages } from '@/services/api/chatService';
import { ChatMessage } from '@/types/chat';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';

const URL_REGEX = /https?:\/\/[^\s]+/g;

interface ExtractedLink {
  id: string;
  url: string;
  sender: { displayName: string; avatarUrl: string | null };
  createdAt: any;
}

export default function LinksScreen() {
  const colors = useThemeColors();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const [links, setLinks] = useState<ExtractedLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = subscribeToChatMessages(
      roomId,
      (messages: ChatMessage[]) => {
        const extracted: ExtractedLink[] = [];
        for (const msg of messages) {
          const matches = msg.content.match(URL_REGEX);
          if (matches) {
            for (const url of matches) {
              extracted.push({
                id: `${msg.id}_${url}`,
                url,
                sender: msg.sender,
                createdAt: msg.createdAt,
              });
            }
          }
        }
        setLinks(extracted);
        setLoading(false);
      },
      500
    );

    return () => unsubscribe();
  }, [roomId]);

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={links}
        renderItem={({ item }) => {
          const dateStr = item.createdAt?.toDate?.()
            ? item.createdAt.toDate().toLocaleDateString('ja-JP')
            : '';
          return (
            <TouchableOpacity
              style={[styles.linkItem, { backgroundColor: colors.surface }]}
              onPress={() => Linking.openURL(item.url)}
              activeOpacity={0.7}
            >
              <Ionicons name="link" size={20} color={colors.primary} />
              <View style={styles.linkInfo}>
                <Text
                  style={[styles.url, { color: colors.primary }]}
                  numberOfLines={2}
                >
                  {item.url}
                </Text>
                <View style={styles.linkMeta}>
                  <Avatar uri={item.sender.avatarUrl} size={16} />
                  <Text style={[styles.senderName, { color: colors.textTertiary }]}>
                    {item.sender.displayName}
                  </Text>
                  <Text style={[styles.date, { color: colors.textTertiary }]}>
                    {dateStr}
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="link-outline"
            title="リンクはまだありません"
            description="チャットでURLを送信すると、ここに表示されます"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  linkInfo: {
    flex: 1,
  },
  url: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  linkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  senderName: {
    fontSize: FontSize.xs,
  },
  date: {
    fontSize: FontSize.xs,
  },
});
