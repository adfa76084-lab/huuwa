import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface TweetMediaProps {
  imageUrls: string[];
  onPress?: (index: number) => void;
}

export function TweetMedia({ imageUrls, onPress }: TweetMediaProps) {
  const colors = useThemeColors();

  if (imageUrls.length === 0) return null;

  const handlePress = (index: number) => {
    onPress?.(index);
  };

  if (imageUrls.length === 1) {
    return (
      <TouchableOpacity
        style={[styles.container, { borderColor: colors.border }]}
        onPress={() => handlePress(0)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: imageUrls[0] }}
          style={styles.singleImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      </TouchableOpacity>
    );
  }

  if (imageUrls.length === 2) {
    return (
      <View style={[styles.container, styles.grid, { borderColor: colors.border }]}>
        {imageUrls.map((url, index) => (
          <TouchableOpacity
            key={index}
            style={styles.halfCell}
            onPress={() => handlePress(index)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: url }}
              style={styles.fillImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (imageUrls.length === 3) {
    return (
      <View style={[styles.container, styles.grid, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.halfCell}
          onPress={() => handlePress(0)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: imageUrls[0] }}
            style={styles.fillImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>
        <View style={styles.halfCell}>
          {imageUrls.slice(1, 3).map((url, index) => (
            <TouchableOpacity
              key={index + 1}
              style={styles.innerHalf}
              onPress={() => handlePress(index + 1)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: url }}
                style={styles.fillImage}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // 4 images: 2x2 grid
  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.grid}>
        {imageUrls.slice(0, 2).map((url, index) => (
          <TouchableOpacity
            key={index}
            style={styles.halfCell}
            onPress={() => handlePress(index)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: url }}
              style={styles.fillImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.grid}>
        {imageUrls.slice(2, 4).map((url, index) => (
          <TouchableOpacity
            key={index + 2}
            style={styles.halfCell}
            onPress={() => handlePress(index + 2)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: url }}
              style={styles.fillImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  grid: {
    flexDirection: 'row',
    gap: 2,
  },
  singleImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  halfCell: {
    flex: 1,
    gap: 2,
  },
  innerHalf: {
    flex: 1,
  },
  fillImage: {
    width: '100%',
    aspectRatio: 1,
  },
});
