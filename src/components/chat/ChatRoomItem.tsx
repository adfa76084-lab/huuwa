import React, { useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing } from '@/constants/theme';
import { ChatRoom } from '@/types/chat';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/utils/date';
import { truncate } from '@/utils/text';

interface ChatRoomItemProps {
  room: ChatRoom;
  currentUserId: string;
  isOnline?: boolean;
  isPinned?: boolean;
  onPress?: () => void;
  onPin?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
}

export function ChatRoomItem({ room, currentUserId, isOnline, isPinned, onPress, onPin, onMute, onDelete }: ChatRoomItemProps) {
  const colors = useThemeColors();
  const swipeableRef = useRef<Swipeable>(null);

  const otherMember = useMemo(() => {
    if (room.type === 'dm') {
      const otherUid = room.members.find((uid) => uid !== currentUserId);
      if (otherUid && room.memberProfiles[otherUid]) {
        return room.memberProfiles[otherUid];
      }
    }
    return null;
  }, [room, currentUserId]);

  const displayName =
    room.type === 'dm'
      ? otherMember?.displayName ?? 'Unknown'
      : room.name ?? 'Group Chat';

  const avatarUri =
    room.type === 'dm' ? otherMember?.avatarUrl ?? null : null;

  const isGroup = room.type === 'group' || room.type === 'open';

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateMute = dragX.interpolate({
      inputRange: [-140, -70, 0],
      outputRange: [0, 0, 70],
      extrapolate: 'clamp',
    });
    const translateDelete = dragX.interpolate({
      inputRange: [-140, -70, 0],
      outputRange: [0, 70, 140],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActions}>
        <Animated.View style={{ transform: [{ translateX: translateMute }] }}>
          <TouchableOpacity
            style={[styles.swipeButton, { backgroundColor: '#8E8E93' }]}
            onPress={() => {
              swipeableRef.current?.close();
              onMute?.();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-off" size={20} color="#FFFFFF" />
            <Text style={styles.swipeButtonText}>ミュート</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ transform: [{ translateX: translateDelete }] }}>
          <TouchableOpacity
            style={[styles.swipeButton, { backgroundColor: '#FF3B30' }]}
            onPress={() => {
              swipeableRef.current?.close();
              onDelete?.();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.swipeButtonText}>削除</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const translatePin = dragX.interpolate({
      inputRange: [0, 70],
      outputRange: [-70, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActions}>
        <Animated.View style={{ transform: [{ translateX: translatePin }] }}>
          <TouchableOpacity
            style={[styles.swipeButton, { backgroundColor: isPinned ? '#8E8E93' : '#FF9500' }]}
            onPress={() => {
              swipeableRef.current?.close();
              onPin?.();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name={isPinned ? 'pin-outline' : 'pin'} size={20} color="#FFFFFF" />
            <Text style={styles.swipeButtonText}>{isPinned ? '解除' : 'ピン留め'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      rightThreshold={40}
      leftThreshold={40}
      overshootRight={false}
      overshootLeft={false}
    >
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Avatar or group icon */}
        {isGroup && !avatarUri ? (
          <View
            style={[
              styles.groupAvatar,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <Ionicons
              name={room.type === 'open' ? 'globe-outline' : 'people'}
              size={22}
              color={colors.textTertiary}
            />
          </View>
        ) : (
          <Avatar uri={avatarUri} size={50} isOnline={room.type === 'dm' && isOnline} />
        )}

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text
              style={[styles.name, { color: colors.text }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {room.lastMessageAt && (
              <Text style={[styles.time, { color: colors.textTertiary }]}>
                {formatRelativeTime(room.lastMessageAt)}
              </Text>
            )}
          </View>

          {room.lastMessage ? (
            <Text
              style={[styles.lastMessage, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {truncate(room.lastMessage, 55)}
            </Text>
          ) : (
            <Text style={[styles.lastMessage, { color: colors.textTertiary }]}>
              メッセージはまだありません
            </Text>
          )}
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    </Swipeable>
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
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  time: {
    fontSize: FontSize.xs,
  },
  lastMessage: {
    fontSize: FontSize.sm,
    marginTop: 3,
  },
  // Swipe actions
  swipeActions: {
    flexDirection: 'row',
  },
  swipeButton: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  swipeButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
