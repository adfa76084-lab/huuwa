import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { compressImage } from './imageCompressor';

async function ensureMediaPermission(): Promise<boolean> {
  let status = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (status.status !== 'granted' && status.canAskAgain) {
    status = await ImagePicker.requestMediaLibraryPermissionsAsync();
  }
  if (status.status === 'granted') return true;

  Alert.alert(
    '写真へのアクセスが必要です',
    '画像を選ぶには、設定で写真へのアクセスを許可してください。',
    [
      { text: 'キャンセル', style: 'cancel' },
      { text: '設定を開く', onPress: () => Linking.openSettings() },
    ],
  );
  return false;
}

export async function pickImage(): Promise<string | null> {
  const granted = await ensureMediaPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;
  return compressImage(result.assets[0].uri);
}

export async function pickMultipleImages(maxCount: number = 4): Promise<string[]> {
  const granted = await ensureMediaPermission();
  if (!granted) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: maxCount,
    quality: 1,
  });

  if (result.canceled || !result.assets) return [];

  const compressed: string[] = [];
  for (const asset of result.assets.slice(0, maxCount)) {
    compressed.push(await compressImage(asset.uri));
  }
  return compressed;
}
