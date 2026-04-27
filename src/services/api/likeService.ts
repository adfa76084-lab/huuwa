import {
  serverTimestamp,
  increment,
  setDoc,
  deleteDoc,
  updateDoc,
  DocumentSnapshot,
} from 'firebase/firestore';
import { Like } from '@/types/tweet';
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

export async function getUserLikes(
  userId: string,
  lastDoc?: DocumentSnapshot,
): Promise<PaginatedResult<Like>> {
  return queryDocuments<Like>(
    Collections.LIKES,
    [where('userId', '==', userId), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc,
  );
}

function getLikeId(userId: string, tweetId: string): string {
  return `${userId}_${tweetId}`;
}

export async function isLiked(userId: string, tweetId: string): Promise<boolean> {
  const like = await getDocument<Like>(Collections.LIKES, getLikeId(userId, tweetId));
  return like !== null;
}

export async function toggleLike(userId: string, tweetId: string): Promise<boolean> {
  const likeId = getLikeId(userId, tweetId);
  const existing = await getDocument<Like>(Collections.LIKES, likeId);
  const likeRef = getDocRef(Collections.LIKES, likeId);
  const tweetRef = getDocRef(Collections.TWEETS, tweetId);

  if (existing) {
    await deleteDoc(likeRef);
    updateDoc(tweetRef, { likesCount: increment(-1) }).catch(() => {});
    return false;
  } else {
    await setDoc(likeRef, { userId, tweetId, createdAt: serverTimestamp() });
    updateDoc(tweetRef, { likesCount: increment(1) }).catch(() => {});
    return true;
  }
}
