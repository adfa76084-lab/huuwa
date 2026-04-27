import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing } from '@/constants/theme';
import { IconButton } from './IconButton';
import { Button } from './Button';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionLoading?: boolean;
  actionDisabled?: boolean;
}

export function ModalHeader({
  title,
  onClose,
  onAction,
  actionLabel = '完了',
  actionLoading = false,
  actionDisabled = false,
}: ModalHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <View style={styles.left}>
        <IconButton name="close" onPress={onClose} />
      </View>

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.right}>
        {onAction ? (
          <Button
            title={actionLabel}
            onPress={onAction}
            size="sm"
            loading={actionLoading}
            disabled={actionDisabled}
          />
        ) : (
          <View style={styles.placeholderRight} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  right: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  placeholderRight: {
    width: 44,
  },
});
