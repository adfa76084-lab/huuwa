import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius } from '@/constants/theme';

interface InlineVideoPlayerProps {
  url: string;
  thumbnailUrl?: string;
}

export function InlineVideoPlayer({ url, thumbnailUrl }: InlineVideoPlayerProps) {
  const colors = useThemeColors();
  const [showVideo, setShowVideo] = useState(false);

  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  const handlePlay = useCallback(() => {
    setShowVideo(true);
    player.play();
  }, [player]);

  if (!showVideo) {
    return (
      <TouchableOpacity
        onPress={handlePlay}
        activeOpacity={0.8}
        style={[styles.thumbnailContainer, { backgroundColor: colors.surfaceVariant }]}
      >
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, { backgroundColor: colors.surfaceVariant }]} />
        )}
        <View style={styles.playOverlay}>
          <Ionicons name="play-circle" size={48} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.videoContainer, { backgroundColor: colors.surfaceVariant }]}>
      <VideoView
        player={player}
        style={styles.video}
        allowsFullscreen
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  thumbnailContainer: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
