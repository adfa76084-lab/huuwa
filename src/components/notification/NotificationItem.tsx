import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { AppNotification, NotificationType } from '@/types/notification';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/utils/date';

interface NotificationItemProps {
  notification: AppNotification;
  onPress?: () => void;
}

const notificationIcons: Record<NotificationType, { name: string; color: string }> = {
  like: { name: 'heart', color: '#E74C3C' },
  reply: { name: 'chatbubble', color: '#3498DB' },
  follow: { name: 'person-add', color: '#6C5CE7' },
  thread_reply: { name: 'chatbubbles', color: '#27AE60' },
  chat_message: { name: 'mail', color: '#F39C12' },
  mention: { name: 'at', color: '#3498DB' },
};

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const colors = useThemeColors();

  const iconConfig = notificationIcons[notification.type] ?? {
    name: 'notifications',
    color: colors.primary,
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: notification.read ? colors.card : colors.surfaceVariant,
          borderBottomColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar with type icon badge */}
      <View style={styles.avatarSection}>
        <Avatar uri={notification.actor.avatarUrl} size={44} />
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: iconConfig.color },
          ]}
        >
          <Ionicons
            name={iconConfig.name as any}
            size={10}
            color="#FFFFFF"
          />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[styles.message, { color: colors.text }]}
          numberOfLines={2}
        >
          <Text style={styles.actorName}>
            {notification.actor.displayName}
          </Text>
          {'  '}
          {notification.message}
        </Text>
        <Text style={[styles.time, { color: colors.textTertiary }]}>
          {formatRelativeTime(notification.createdAt)}
        </Text>
      </View>

      {/* Unread indicator */}
      {!notification.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  avatarSection: {
    position: 'relative',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: FontSize.md,
    lineHeight: 21,
  },
  actorName: {
    fontWeight: '700',
  },
  time: {
    fontSize: FontSize.xs,
    marginTop: 3,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
