import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  SectionList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getMediaMessages } from '@/services/api/chatService';
import { ChatMessage } from '@/types/chat';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing, FontSize } from '@/constants/theme';

const COLUMNS = 3;
const GAP = 2;
const screenWidth = Dimensions.get('window').width;
const itemSize = (screenWidth - GAP * (COLUMNS - 1)) / COLUMNS;

interface MediaSection {
  title: string;
  data: ChatMessage[][];
}

function groupByMonth(messages: ChatMessage[]): MediaSection[] {
  const map = new Map<string, ChatMessage[]>();

  for (const msg of messages) {
    const date = msg.createdAt?.toDate?.() ?? new Date();
    const key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    const list = map.get(key);
    if (list) {
      list.push(msg);
    } else {
      map.set(key, [msg]);
    }
  }

  // Each section's data is chunked into rows of COLUMNS for the grid
  return [...map.entries()].map(([title, items]) => {
    const rows: ChatMessage[][] = [];
    for (let i = 0; i < items.length; i += COLUMNS) {
      rows.push(items.slice(i, i + COLUMNS));
    }
    return { title, data: rows };
  });
}

export default function MediaScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    (async () => {
      const media = await getMediaMessages(roomId);
      setMessages(media);
      setLoading(false);
    })();
  }, [roomId]);

  const sections = useMemo(() => groupByMonth(messages), [messages]);

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  if (messages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="images-outline"
          title="写真・動画はまだありません"
          description="チャットで画像を送信すると、ここに表示されます"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(row, index) => `row-${index}`}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {title}
            </Text>
          </View>
        )}
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map((msg) => (
              <TouchableOpacity
                key={msg.id}
                style={styles.item}
                onPress={() =>
                  router.push({
                    pathname: '/image-viewer',
                    params: { uri: msg.imageUrl },
                  } as any)
                }
                activeOpacity={0.8}
              >
                <Image source={{ uri: msg.imageUrl! }} style={styles.image} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
  item: {
    width: itemSize,
    height: itemSize,
    padding: GAP / 2,
  },
  image: {
    flex: 1,
    borderRadius: 2,
  },
});
