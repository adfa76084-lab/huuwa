import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '@/types/user';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Avatar } from '@/components/ui/Avatar';
import { FontSize, Spacing } from '@/constants/theme';

interface UserListItemProps {
  user: UserProfile;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

export function UserListItem({ user, onPress, rightElement }: UserListItemProps) {
  const colors = useThemeColors();

  return (
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
      <Avatar uri={user.avatarUrl} size={44} />
      <View style={styles.info}>
        <Text
          style={[styles.displayName, { color: colors.text }]}
          numberOfLines={1}
        >
          {user.displayName}
        </Text>
        <Text
          style={[styles.username, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          @{user.username}
        </Text>
      </View>
      {rightElement ?? (
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
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
  info: {
    flex: 1,
  },
  displayName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  username: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});
