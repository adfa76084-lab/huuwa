import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  md: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  lg: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
};

const fontSizeMap: Record<ButtonSize, number> = {
  sm: FontSize.sm,
  md: FontSize.md,
  lg: FontSize.lg,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const colors = useThemeColors();

  const backgroundColors: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.surface,
    outline: 'transparent',
  };

  const textColors: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: colors.text,
    outline: colors.primary,
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        sizeStyles[size],
        {
          backgroundColor: isDisabled && variant === 'primary'
            ? colors.surfaceVariant
            : backgroundColors[variant],
        },
        variant === 'outline' && { borderWidth: 1, borderColor: isDisabled ? colors.border : colors.primary },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: isDisabled && variant === 'primary'
                ? colors.textTertiary
                : textColors[variant],
              fontSize: fontSizeMap[size],
            },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '600',
  },
});
