import { serverTimestamp } from 'firebase/firestore';
import { ChatFile } from '@/types/chat';
import { UserProfile } from '@/types/user';
import { Collections } from '@/constants/firestore';
import {
  setDocument,
  deleteDocument,
  querySubcollection,
  getSubcollectionRef,
  orderBy,
  doc,
} from '@/services/firebase/firestore';
import { uploadFile, getStoragePath } from '@/services/firebase/storage';
import { PickedFile } from '@/services/media/filePicker';

export async function getFiles(roomId: string): Promise<ChatFile[]> {
  const result = await querySubcollection<ChatFile>(
    Collections.CHAT_ROOMS,
    roomId,
    Collections.CHAT_FILES,
    [orderBy('createdAt', 'desc')],
    100
  );
  return result.items;
}

export async function uploadChatFile(
  roomId: string,
  uid: string,
  userProfile: UserProfile,
  pickedFile: PickedFile
): Promise<ChatFile> {
  const storagePath = getStoragePath(`chatFiles/${roomId}`, uid, pickedFile.name);
  const url = await uploadFile(storagePath, pickedFile.uri);

  const fileRef = doc(
    getSubcollectionRef(Collections.CHAT_ROOMS, roomId, Collections.CHAT_FILES)
  );

  const fileData = {
    roomId,
    name: pickedFile.name,
    url,
    mimeType: pickedFile.mimeType,
    sizeBytes: pickedFile.size,
    uploader: userProfile,
    uploaderUid: uid,
    createdAt: serverTimestamp(),
  };

  await setDocument(
    `${Collections.CHAT_ROOMS}/${roomId}/${Collections.CHAT_FILES}`,
    fileRef.id,
    fileData
  );

  return { id: fileRef.id, ...fileData } as unknown as ChatFile;
}

export async function deleteChatFile(roomId: string, fileId: string): Promise<void> {
  await deleteDocument(
    `${Collections.CHAT_ROOMS}/${roomId}/${Collections.CHAT_FILES}`,
    fileId
  );
}
