import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase/config';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 600;
const VOICE_CONTENT_TYPE = 'audio/mp4';

async function uploadOnce(path: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const storageRef = ref(storage, path);
  const snap = await uploadBytes(storageRef, blob, {
    contentType: VOICE_CONTENT_TYPE,
    cacheControl: 'public, max-age=31536000',
  });
  return getDownloadURL(snap.ref);
}

export async function uploadVoiceWithRetry(
  path: string,
  uri: string,
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await uploadOnce(path, uri);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw lastError ?? new Error('Voice upload failed');
}
