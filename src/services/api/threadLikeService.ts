import {
  serverTimestamp,
  increment,
  setDoc,
  deleteDoc,
  updateDoc,
  DocumentSnapshot,
} from 'firebase/firestore';
import { ThreadLike } from '@/types/thread';
import { Collections } from '@/constants/firestore';
import { PAGE_SIZE } from '@/constants/limits';
import {
  getDocument,
  getDocRef,
  queryDocuments,
  where,
  orderBy,
} from '@/services/firebase/firestore';
import { PaginatedResult } from '@/types/common';

function getThreadLikeId(userId: string, threadId: string): string {
  return `${userId}_${threadId}`;
}

export async function isThreadLiked(userId: string, threadId: string): Promise<boolean> {
  const like = await getDocument<ThreadLike>(
    Collections.THREAD_LIKES,
    getThreadLikeId(userId, threadId),
  );
  return like !== null;
}

export async function toggleThreadLike(userId: string, threadId: string): Promise<boolean> {
  const likeId = getThreadLikeId(userId, threadId);
  const existing = await getDocument<ThreadLike>(Collections.THREAD_LIKES, likeId);
  const likeRef = getDocRef(Collections.THREAD_LIKES, likeId);
  const threadRef = getDocRef(Collections.THREADS, threadId);

  if (existing) {
    await deleteDoc(likeRef);
    updateDoc(threadRef, { likesCount: increment(-1) }).catch(() => {});
    return false;
  } else {
    await setDoc(likeRef, { userId, threadId, createdAt: serverTimestamp() });
    updateDoc(threadRef, { likesCount: increment(1) }).catch(() => {});
    return true;
  }
}

export async function getUserThreadLikes(
  userId: string,
  lastDoc?: DocumentSnapshot,
): Promise<PaginatedResult<ThreadLike>> {
  return queryDocuments<ThreadLike>(
    Collections.THREAD_LIKES,
    [where('userId', '==', userId), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc,
  );
}
