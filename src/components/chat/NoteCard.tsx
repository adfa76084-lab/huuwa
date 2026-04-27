import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatNote } from '@/types/chat';
import { Avatar } from '@/components/ui/Avatar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface NoteCardProps {
  note: ChatNote;
  onDelete?: () => void;
  canDelete: boolean;
}

export function NoteCard({ note, onDelete, canDelete }: NoteCardProps) {
  const colors = useThemeColors();
  const dateStr = note.createdAt?.toDate?.()
    ? note.createdAt.toDate().toLocaleDateString('ja-JP')
    : '';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.author}>
          <Avatar uri={note.author.avatarUrl} size={28} />
          <Text style={[styles.authorName, { color: colors.text }]}>
            {note.author.displayName}
          </Text>
          <Text style={[styles.date, { color: colors.textTertiary }]}>{dateStr}</Text>
        </View>
        {canDelete && onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{note.title}</Text>
      <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={5}>
        {note.content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  authorName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  date: {
    fontSize: FontSize.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  content: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
});
