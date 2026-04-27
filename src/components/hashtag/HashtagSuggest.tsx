import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { searchHashtags } from '@/services/api/hashtagService';
import { Hashtag } from '@/types/hashtag';

interface HashtagSuggestProps {
  query: string; // the text after '#' that the user is typing
  visible: boolean;
  onSelect: (tag: string) => void;
}

export function HashtagSuggest({ query, visible, onSelect }: HashtagSuggestProps) {
  const colors = useThemeColors();
  const [results, setResults] = useState<Hashtag[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible || !query) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const items = await searchHashtags(query);
        setResults(items);
      } catch {
        setResults([]);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, visible]);

  if (!visible || results.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={() => onSelect(item.name)}
            activeOpacity={0.6}
          >
            <Text style={[styles.tagName, { color: colors.primary }]}>
              #{item.name}
            </Text>
            <Text style={[styles.postCount, { color: colors.textTertiary }]}>
              {item.postCount}件
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: 280,
    borderTopWidth: 1,
    borderRadius: BorderRadius.md,
    zIndex: 100,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tagName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  postCount: {
    fontSize: FontSize.sm,
  },
});
