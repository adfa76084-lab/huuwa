import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { IMAGE_MAX_WIDTH, IMAGE_QUALITY } from '@/constants/limits';

export async function compressImage(uri: string): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: IMAGE_MAX_WIDTH } }],
    { compress: IMAGE_QUALITY, format: SaveFormat.JPEG }
  );
  return result.uri;
}
