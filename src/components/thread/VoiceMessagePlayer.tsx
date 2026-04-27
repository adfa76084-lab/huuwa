import React, { useCallback, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { setActive, clearActive } from '@/services/media/voicePlayback';

interface VoiceMessagePlayerProps {
  url: string;
  durationMs: number;
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function VoiceMessagePlayer({ url, durationMs }: VoiceMessagePlayerProps) {
  const colors = useThemeColors();
  const player = useAudioPlayer(url, { downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const idRef = useRef<symbol>(Symbol('voicePlayer'));

  const isPlaying = status.playing;
  const currentTimeSec = status.currentTime ?? 0;
  const durationSec = status.duration > 0 ? status.duration : durationMs / 1000;
  const progress = durationSec > 0 ? Math.min(currentTimeSec / durationSec, 1) : 0;
  const didEnd = status.didJustFinish || (durationSec > 0 && currentTimeSec >= durationSec - 0.05);

  useEffect(() => {
    if (didEnd && isPlaying === false) {
      try { player.seekTo(0); } catch {}
      clearActive(idRef.current);
    }
  }, [didEnd, isPlaying, player]);

  useEffect(() => {
    const id = idRef.current;
    return () => {
      try { player.pause(); } catch {}
      clearActive(id);
    };
  }, [player]);

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      player.pause();
      clearActive(idRef.current);
    } else {
      if (didEnd) {
        try { player.seekTo(0); } catch {}
      }
      setActive(idRef.current, () => {
        try { player.pause(); } catch {}
      });
      player.play();
    }
  }, [isPlaying, player, didEnd]);

  const remainingSec = isPlaying
    ? Math.max(durationSec - currentTimeSec, 0)
    : durationMs / 1000;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary + '15' }]}>
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
        <Ionicons
          name={isPlaying ? 'pause-circle' : 'play-circle'}
          size={36}
          color={colors.primary}
        />
      </TouchableOpacity>

      <View style={styles.waveArea}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${progress * 100}%` },
            ]}
          />
        </View>
        <Text style={[styles.duration, { color: colors.textSecondary }]}>
          {formatDuration(remainingSec)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  waveArea: {
    flex: 1,
    gap: Spacing.xs,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  duration: {
    fontSize: FontSize.xs,
  },
});
