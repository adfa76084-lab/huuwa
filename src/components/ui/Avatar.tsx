import React from 'react';
import { Image, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';

interface AvatarProps {
  uri: string | null;
  size?: number;
  onPress?: () => void;
  isOnline?: boolean;
}

export function Avatar({ uri, size = 40, onPress, isOnline }: AvatarProps) {
  const colors = useThemeColors();

  const borderRadiusValue = size / 2;
  const dotSize = Math.max(size * 0.38, 14);
  const borderWidth = Math.max(dotSize * 0.2, 2.5);

  const avatarImage = uri ? (
    <Image
      source={{ uri }}
      style={[
        styles.image,
        {
          width: size,
          height: size,
          borderRadius: borderRadiusValue,
        },
      ]}
    />
  ) : (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: borderRadiusValue,
          backgroundColor: colors.surfaceVariant,
        },
      ]}
    >
      <Ionicons
        name="person"
        size={size * 0.55}
        color={colors.textTertiary}
      />
    </View>
  );

  const content = (
    <View style={{ width: size, height: size }}>
      {avatarImage}
      {isOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              borderWidth,
              borderColor: colors.card,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: '#34C759',
  },
});
