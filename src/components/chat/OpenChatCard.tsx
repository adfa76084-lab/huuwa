import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { ChatRoom } from '@/types/chat';
import { formatCount } from '@/utils/text';

interface OpenChatCardProps {
  room: ChatRoom;
  onPress?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function OpenChatCard({ room, onPress, isFavorite, onToggleFavorite }: OpenChatCardProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        Shadows.sm,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      {room.imageUrl ? (
        <Image
          source={{ uri: room.imageUrl }}
          style={styles.avatar}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            styles.avatar,
            styles.avatarFallback,
            { backgroundColor: colors.primary + '12' },
          ]}
        >
          <Ionicons name="chatbubbles" size={22} color={colors.primary} />
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.text }]}
          numberOfLines={1}
        >
          {room.name ?? 'オープンチャット'}
        </Text>
        {room.description ? (
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {room.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={13} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {formatCount(room.members?.length ?? room.membersCount)}人
          </Text>
        </View>
      </View>

      {/* Favorite button */}
      {onToggleFavorite && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.favoriteButton}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? '#E74C3C' : colors.textTertiary}
          />
        </TouchableOpacity>
      )}

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  description: {
    fontSize: FontSize.xs,
    lineHeight: 16,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  favoriteButton: {
    padding: 4,
  },
});
