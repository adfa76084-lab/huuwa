import * as DocumentPicker from 'expo-document-picker';
import { FILE_MAX_SIZE_BYTES } from '@/constants/limits';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export async function pickFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const size = asset.size ?? 0;

  if (size > FILE_MAX_SIZE_BYTES) {
    throw new Error(`File size exceeds ${FILE_MAX_SIZE_BYTES / 1024 / 1024}MB limit`);
  }

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    size,
  };
}
