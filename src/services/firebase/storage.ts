import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export async function uploadImage(
  path: string,
  uri: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, blob);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => reject(error),
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadUrl);
      }
    );
  });
}

export async function uploadFile(
  path: string,
  uri: string,
  onProgress?: (progress: number) => void,
  contentType?: string
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  // Infer content type from file extension if not provided and the blob lacks one.
  let resolvedType = contentType ?? (blob as any).type;
  if (!resolvedType || resolvedType === 'application/octet-stream') {
    if (path.endsWith('.m4a') || path.endsWith('.mp4a')) resolvedType = 'audio/mp4';
    else if (path.endsWith('.mp3')) resolvedType = 'audio/mpeg';
    else if (path.endsWith('.wav')) resolvedType = 'audio/wav';
    else if (path.endsWith('.aac')) resolvedType = 'audio/aac';
    else if (path.endsWith('.mp4')) resolvedType = 'video/mp4';
    else if (path.endsWith('.mov')) resolvedType = 'video/quicktime';
  }

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, blob, resolvedType ? { contentType: resolvedType } : undefined);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => reject(error),
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadUrl);
      }
    );
  });
}

export function getStoragePath(folder: string, userId: string, fileName: string): string {
  return `${folder}/${userId}/${Date.now()}_${fileName}`;
}
