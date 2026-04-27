import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { ShortVideo } from '@/types/short';
import { ShortVideoOverlay } from './ShortVideoOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type PreloadState = 'active' | 'preload' | 'idle';

interface ShortVideoCardProps {
  short: ShortVideo;
  preloadState: PreloadState;
  itemHeight: number;
  onLike?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onProfile?: () => void;
  onShare?: () => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Lightweight placeholder – no native video player allocated        */
/* ------------------------------------------------------------------ */
function ShortVideoPlaceholder({
  short,
  itemHeight,
  onLike,
  onComment,
  onProfile,
  onShare,
  isLiked,
}: ShortVideoCardProps) {
  return (
    <View style={[styles.container, { height: itemHeight }]}>
      {short.thumbnailUrl ? (
        <Image
          source={{ uri: short.thumbnailUrl }}
          style={styles.video}
          contentFit="cover"
        />
      ) : null}
      <ShortVideoOverlay
        short={short}
        onLike={onLike}
        onComment={onComment}
        onProfile={onProfile}
        onShare={onShare}
        isLiked={isLiked}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Active / preloading player – owns the native VideoPlayer          */
/* ------------------------------------------------------------------ */
function ShortVideoPlayer({
  short,
  preloadState,
  itemHeight,
  onLike,
  onComment,
  onProfile,
  onShare,
  isLiked,
}: ShortVideoCardProps) {
  const [isPaused, setIsPaused] = useState(false);

  const player = useVideoPlayer(short.videoUrl, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (preloadState === 'active') {
      setIsPaused(false);
      player.play();
    } else {
      player.pause();
    }
  }, [preloadState, player]);

  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  const handlePress = useCallback(() => {
    if (preloadState !== 'active') return;
    if (player.playing) {
      player.pause();
      setIsPaused(true);
    } else {
      player.play();
      setIsPaused(false);
    }
  }, [preloadState, player]);

  return (
    <View style={[styles.container, { height: itemHeight }]}>
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={StyleSheet.absoluteFill}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
          />
        </View>
      </TouchableWithoutFeedback>

      {preloadState === 'active' && status === 'loading' && (
        <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
      )}

      {preloadState === 'active' && isPaused && (
        <View style={styles.pauseOverlay} pointerEvents="none">
          <View style={styles.pauseIcon} />
        </View>
      )}

      <ShortVideoOverlay
        short={short}
        onLike={onLike}
        onComment={onComment}
        onProfile={onProfile}
        onShare={onShare}
        isLiked={isLiked}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Memoised wrapper – prevents full re-renders on every scroll       */
/* ------------------------------------------------------------------ */
export const ShortVideoCard = React.memo(
  function ShortVideoCard(props: ShortVideoCardProps) {
    if (props.preloadState === 'idle') {
      return <ShortVideoPlaceholder {...props} />;
    }
    return <ShortVideoPlayer {...props} />;
  },
  (prev, next) =>
    prev.preloadState === next.preloadState &&
    prev.short === next.short &&
    prev.isLiked === next.isLiked &&
    prev.isBookmarked === next.isBookmarked &&
    prev.itemHeight === next.itemHeight,
);

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
