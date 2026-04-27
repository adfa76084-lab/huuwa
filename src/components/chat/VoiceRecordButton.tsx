import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import {
  VOICE_MAX_DURATION_MS,
  VOICE_MIN_DURATION_MS,
} from '@/constants/limits';
import {
  startRecording,
  stopRecording,
  cancelRecording,
  ensureMicrophonePermission,
} from '@/services/media/voiceRecorder';
import { stopAll as stopAllPlayback } from '@/services/media/voicePlayback';

const CANCEL_THRESHOLD_PX = 80;

interface VoiceRecordButtonProps {
  onRecorded: (uri: string, durationMs: number) => void;
  disabled?: boolean;
  size?: number;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * LINE-style hold-to-record voice button.
 * - Hold to start, release to send.
 * - Slide up past the cancel threshold to cancel.
 * - Auto-stops at 60s. Auto-cancels recordings under 1s.
 */
export function VoiceRecordButton({ onRecorded, disabled, size = 40 }: VoiceRecordButtonProps) {
  const colors = useThemeColors();
  const [uiRecording, setUiRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [willCancel, setWillCancel] = useState(false);

  // Refs (mutable, no re-renders)
  const pressedRef = useRef(false);          // finger is currently down
  const recordingRef = useRef(false);        // mic actually open
  const willCancelRef = useRef(false);       // swipe-up canceled
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dot = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Pulsing dot
  useEffect(() => {
    if (!uiRecording) {
      dot.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, { toValue: 0.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(dot, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [uiRecording, dot]);

  const stopTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const finishRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    stopTick();
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    setUiRecording(false);

    const cancel = willCancelRef.current;
    willCancelRef.current = false;
    setWillCancel(false);

    // Trust the button-side elapsed time; the recorder's reported duration
    // can come back as 0 in some platform/timing combinations.
    const measuredMs = Date.now() - startedAtRef.current;

    if (cancel) {
      try { await cancelRecording(); } catch {}
      return;
    }

    if (measuredMs < VOICE_MIN_DURATION_MS) {
      try { await cancelRecording(); } catch {}
      Alert.alert('短すぎます', '1秒以上録音してください');
      return;
    }

    try {
      const { uri, durationMs } = await stopRecording();
      const finalMs = durationMs > 0 ? durationMs : measuredMs;
      onRecorded(uri, finalMs);
    } catch {
      try { await cancelRecording(); } catch {}
    }
  }, [onRecorded, scale]);

  const beginRecording = useCallback(async () => {
    if (recordingRef.current || disabled) return;

    // Permission check first — if denied, OS handled the dialog already; bail out.
    const granted = await ensureMicrophonePermission();
    if (!granted) {
      pressedRef.current = false;
      setUiRecording(false);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
      return;
    }

    // User may have released during the permission dialog
    if (!pressedRef.current) return;

    try {
      stopAllPlayback();
      await startRecording();
    } catch {
      pressedRef.current = false;
      setUiRecording(false);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
      return;
    }

    // Released between startRecording call and now → cancel right away
    if (!pressedRef.current) {
      try { await cancelRecording(); } catch {}
      setUiRecording(false);
      return;
    }

    recordingRef.current = true;
    willCancelRef.current = false;
    startedAtRef.current = Date.now();
    setElapsedMs(0);

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= VOICE_MAX_DURATION_MS) finishRecording();
    }, 100);
  }, [disabled, finishRecording, scale]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTick();
      if (recordingRef.current) {
        recordingRef.current = false;
        cancelRecording().catch(() => {});
      }
    };
  }, []);

  // Lazily build PanResponder so the closures see latest callbacks
  const beginRef = useRef(beginRecording);
  const finishRef = useRef(finishRecording);
  beginRef.current = beginRecording;
  finishRef.current = finishRecording;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        pressedRef.current = true;
        setUiRecording(true);
        Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, friction: 5 }).start();
        beginRef.current();
      },
      onPanResponderMove: (_e, g) => {
        if (!recordingRef.current) return;
        const cancel = g.dy < -CANCEL_THRESHOLD_PX;
        if (cancel !== willCancelRef.current) {
          willCancelRef.current = cancel;
          setWillCancel(cancel);
        }
      },
      onPanResponderRelease: () => {
        pressedRef.current = false;
        if (recordingRef.current) {
          finishRef.current();
        } else {
          // Recording never started (permission dialog or quick tap)
          setUiRecording(false);
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
        }
      },
      onPanResponderTerminate: () => {
        pressedRef.current = false;
        if (recordingRef.current) {
          willCancelRef.current = true;
          finishRef.current();
        } else {
          setUiRecording(false);
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
        }
      },
    }),
  ).current;

  const buttonBg = uiRecording ? colors.error : colors.primary;

  return (
    <>
      {uiRecording && (
        <View
          pointerEvents="none"
          style={[styles.overlay, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.overlayRow}>
            <Animated.View style={[styles.dot, { backgroundColor: colors.error, opacity: dot }]} />
            <Text style={[styles.elapsed, { color: colors.text }]}>{formatTime(elapsedMs)}</Text>
          </View>
          <Text style={[styles.hint, { color: willCancel ? colors.error : colors.textSecondary }]}>
            {willCancel ? '指を離してキャンセル' : '上にスワイプでキャンセル'}
          </Text>
        </View>
      )}

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: disabled ? colors.surfaceVariant : buttonBg,
            transform: [{ scale }],
          },
        ]}
      >
        <Ionicons name="mic" size={size * 0.55} color="#FFFFFF" />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 56,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 200,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 4 },
    }),
  },
  overlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  elapsed: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: FontSize.xs,
  },
});
