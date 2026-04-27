import {
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
  AudioModule,
  IOSOutputFormat,
  AudioQuality,
  type RecordingOptions,
} from 'expo-audio';
type AudioRecorderType = InstanceType<typeof AudioModule.AudioRecorder>;

let currentRecorder: AudioRecorderType | null = null;

/**
 * AAC mono 44.1kHz 64kbps — tuned for voice messages (LINE-style).
 * Keeps files small for fast upload/playback while preserving voice clarity.
 */
const VOICE_RECORDING_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

export async function ensureMicrophonePermission(): Promise<boolean> {
  let status = await getRecordingPermissionsAsync();
  if (!status.granted && status.canAskAgain) {
    status = await requestRecordingPermissionsAsync();
  }
  return status.granted;
}

export function isRecording(): boolean {
  return currentRecorder !== null;
}

export async function startRecording(): Promise<void> {
  if (currentRecorder) throw new Error('Already recording');
  const granted = await ensureMicrophonePermission();
  if (!granted) throw new Error('Microphone permission denied');

  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

  const recorder = new AudioModule.AudioRecorder(VOICE_RECORDING_OPTIONS);
  await recorder.prepareToRecordAsync();
  recorder.record();
  currentRecorder = recorder;
}

export async function stopRecording(): Promise<{ uri: string; durationMs: number }> {
  if (!currentRecorder) throw new Error('No active recording');

  const recorder = currentRecorder;
  currentRecorder = null;

  // Read duration BEFORE stop() — durationMillis resets to 0 once stopped.
  let durationMs = 0;
  try {
    durationMs = recorder.getStatus().durationMillis ?? 0;
  } catch {
    durationMs = 0;
  }

  await recorder.stop();
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

  const uri = recorder.uri;
  if (!uri) throw new Error('Recording URI not available');

  return { uri, durationMs };
}

export async function cancelRecording(): Promise<void> {
  if (!currentRecorder) return;

  const recorder = currentRecorder;
  currentRecorder = null;

  try {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  } catch {
    // already stopped
  }
}
