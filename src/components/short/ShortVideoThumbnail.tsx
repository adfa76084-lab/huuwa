import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShortVideo } from '@/types/short';
import { FontSize, Spacing } from '@/constants/theme';
import { formatCount } from '@/utils/text';

const COLUMN_COUNT = 3;
const GAP = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = (SCREEN_WIDTH - GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;
const ITEM_HEIGHT = ITEM_WIDTH * 1.6;

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface ShortVideoThumbnailProps {
  short: ShortVideo;
  onPress?: () => void;
}

export function ShortVideoThumbnail({ short, onPress }: ShortVideoThumbnailProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: short.thumbnailUrl || short.videoUrl }}
        style={styles.thumbnail}
      />
      <View style={styles.overlay}>
        <View style={styles.bottomRow}>
          <View style={styles.stat}>
            <Ionicons name="play" size={12} color="#fff" />
            <Text style={styles.statText}>{formatCount(short.likesCount)}</Text>
          </View>
          {short.duration > 0 && (
            <Text style={styles.durationText}>
              {formatDuration(short.duration)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export { ITEM_WIDTH, ITEM_HEIGHT, GAP, COLUMN_COUNT };

const styles = StyleSheet.create({
  container: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    backgroundColor: '#1a1a1a',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: Spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  durationText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
