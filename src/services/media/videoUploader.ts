import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Alert, Linking } from 'react-native';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase/config';

async function ensureMediaPermission(): Promise<boolean> {
  let status = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (status.status !== 'granted' && status.canAskAgain) {
    status = await ImagePicker.requestMediaLibraryPermissionsAsync();
  }
  if (status.status === 'granted') return true;

  Alert.alert(
    '写真へのアクセスが必要です',
    '動画を選ぶには、設定で写真へのアクセスを許可してください。',
    [
      { text: 'キャンセル', style: 'cancel' },
      { text: '設定を開く', onPress: () => Linking.openSettings() },
    ],
  );
  return false;
}

export interface PickVideoResult {
  videoUri: string;
  duration: number;
}

export async function pickVideo(): Promise<PickVideoResult | null> {
  const granted = await ensureMediaPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: true,
    videoMaxDuration: 60,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    videoUri: asset.uri,
    duration: asset.duration ? Math.round(asset.duration / 1000) : 0,
  };
}

export async function generateThumbnail(
  videoUri: string
): Promise<string | null> {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 500,
      quality: 0.5,
    });
    return uri;
  } catch {
    return null;
  }
}

export async function uploadVideo(
  path: string,
  uri: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const storageRef = ref(storage, path);
  const metadata = { cacheControl: 'public, max-age=31536000' };
  const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

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
