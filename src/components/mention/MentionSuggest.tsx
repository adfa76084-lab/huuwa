import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { getMentionSuggestions, getDefaultMentionSuggestions } from '@/services/api/mentionService';
import { Avatar } from '@/components/ui/Avatar';

interface MentionSuggestUser {
  uid: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface MentionSuggestProps {
  query: string;
  visible: boolean;
  onSelect: (user: MentionSuggestUser) => void;
  currentUid?: string | null;
  /** When provided, anchor the popup at this y-offset (px from top of parent)
   * instead of pinning it to the bottom — used to drop it just under the line
   * containing the active '@'. */
  anchorTop?: number;
}

export function MentionSuggest({ query, visible, onSelect, currentUid, anchorTop }: MentionSuggestProps) {
  const colors = useThemeColors();
  const [results, setResults] = useState<MentionSuggestUser[]>([]);
  const [defaults, setDefaults] = useState<MentionSuggestUser[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload default (followings) suggestions once we know the current uid,
  // so they're ready the moment the user types '@'.
  useEffect(() => {
    if (!currentUid) {
      setDefaults([]);
      return;
    }
    let cancelled = false;
    getDefaultMentionSuggestions(currentUid)
      .then((items) => {
        if (!cancelled) setDefaults(items);
      })
      .catch(() => {
        if (!cancelled) setDefaults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUid]);

  useEffect(() => {
    if (!visible || !query) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const items = await getMentionSuggestions(query);
        setResults(items);
      } catch {
        setResults([]);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, visible]);

  if (!visible) return null;
  // When query is empty, fall back to default (followings) list.
  const display = query ? results : defaults;
  if (display.length === 0) return null;

  const positionStyle = anchorTop != null
    ? { top: anchorTop, borderWidth: StyleSheet.hairlineWidth }
    : { bottom: 0, borderTopWidth: 1 };

  return (
    <View style={[styles.container, positionStyle, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {display.map((item) => (
          <TouchableOpacity
            key={item.uid}
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={() => onSelect(item)}
            activeOpacity={0.6}
          >
            <Avatar uri={item.avatarUrl} size={32} />
            <View style={styles.userInfo}>
              <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                {item.displayName}
              </Text>
              <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                @{item.username}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    maxHeight: 320,
    borderRadius: BorderRadius.md,
    zIndex: 100,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  username: {
    fontSize: FontSize.sm,
    marginTop: 1,
  },
});
