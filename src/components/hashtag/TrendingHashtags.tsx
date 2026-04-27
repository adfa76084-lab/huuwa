import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { subscribeToTrendingHashtags } from '@/services/api/hashtagService';
import { Hashtag } from '@/types/hashtag';

export function TrendingHashtags() {
  const colors = useThemeColors();
  const router = useRouter();
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);

  useEffect(() => {
    const unsub = subscribeToTrendingHashtags(setHashtags);
    return unsub;
  }, []);

  if (hashtags.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          トレンドタグ
        </Text>
      </View>
      <View style={styles.list}>
        {hashtags.map((tag, index) => (
          <TouchableOpacity
            key={tag.id}
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/(tabs)/(home)/hashtag/${encodeURIComponent(tag.name)}` as any)}
            activeOpacity={0.6}
          >
            <View style={styles.itemLeft}>
              <Text style={[styles.rank, { color: colors.textTertiary }]}>
                {index + 1}
              </Text>
              <Text style={[styles.tagName, { color: colors.primary }]}>
                #{tag.name}
              </Text>
            </View>
            <Text style={[styles.postCount, { color: colors.textSecondary }]}>
              {tag.postCount}件
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  list: {},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rank: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  tagName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  postCount: {
    fontSize: FontSize.sm,
  },
});
