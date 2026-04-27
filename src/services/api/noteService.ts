import { serverTimestamp } from 'firebase/firestore';
import { ChatNote } from '@/types/chat';
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

export async function getNotes(roomId: string): Promise<ChatNote[]> {
  const result = await querySubcollection<ChatNote>(
    Collections.CHAT_ROOMS,
    roomId,
    Collections.CHAT_NOTES,
    [orderBy('createdAt', 'desc')],
    100
  );
  return result.items;
}

export async function createNote(
  roomId: string,
  uid: string,
  userProfile: UserProfile,
  title: string,
  content: string
): Promise<ChatNote> {
  const noteRef = doc(
    getSubcollectionRef(Collections.CHAT_ROOMS, roomId, Collections.CHAT_NOTES)
  );

  const noteData = {
    roomId,
    title,
    content,
    author: userProfile,
    authorUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDocument(
    `${Collections.CHAT_ROOMS}/${roomId}/${Collections.CHAT_NOTES}`,
    noteRef.id,
    noteData
  );

  return { id: noteRef.id, ...noteData } as unknown as ChatNote;
}

export async function deleteNote(roomId: string, noteId: string): Promise<void> {
  await deleteDocument(
    `${Collections.CHAT_ROOMS}/${roomId}/${Collections.CHAT_NOTES}`,
    noteId
  );
}
