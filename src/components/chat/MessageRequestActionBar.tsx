import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Button } from '@/components/ui/Button';
import { FontSize, Spacing } from '@/constants/theme';

interface MessageRequestActionBarProps {
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

export function MessageRequestActionBar({
  onAccept,
  onDecline,
  loading,
}: MessageRequestActionBarProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderTopColor: colors.border },
      ]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        このメッセージリクエストを承認しますか？
      </Text>
      <View style={styles.actions}>
        <Button
          title="削除"
          variant="outline"
          size="sm"
          onPress={onDecline}
          disabled={loading}
          style={styles.button}
        />
        <Button
          title="承認"
          variant="primary"
          size="sm"
          onPress={onAccept}
          loading={loading}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
  },
});
