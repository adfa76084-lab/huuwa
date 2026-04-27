import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatEvent } from '@/types/chat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

interface EventCardProps {
  event: ChatEvent;
  currentUid: string;
  onToggleAttendance: () => void;
  onDelete?: () => void;
  canDelete: boolean;
}

export function EventCard({
  event,
  currentUid,
  onToggleAttendance,
  onDelete,
  canDelete,
}: EventCardProps) {
  const colors = useThemeColors();
  const isAttending = event.attendees?.includes(currentUid);
  const dateStr = event.date?.toDate?.()
    ? event.date.toDate().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
        {canDelete && onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {event.description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {event.description}
        </Text>
      ) : null}

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{dateStr}</Text>
        </View>
        {event.location && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {event.location}
            </Text>
          </View>
        )}
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {event.attendees?.length ?? 0}人参加
          </Text>
        </View>
      </View>

      <Button
        title={isAttending ? '参加中' : '参加する'}
        onPress={onToggleAttendance}
        variant={isAttending ? 'outline' : 'primary'}
        size="sm"
      />
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
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    flex: 1,
  },
  description: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  meta: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaText: {
    fontSize: FontSize.sm,
  },
});
