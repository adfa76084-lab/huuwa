import { serverTimestamp, increment, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Bookmark } from '@/types/tweet';
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
import { DocumentSnapshot } from 'firebase/firestore';

function getBookmarkId(userId: string, tweetId: string): string {
  return `${userId}_${tweetId}`;
}

export async function isBookmarked(userId: string, tweetId: string): Promise<boolean> {
  const bookmark = await getDocument<Bookmark>(Collections.BOOKMARKS, getBookmarkId(userId, tweetId));
  return bookmark !== null;
}

export async function toggleBookmark(userId: string, tweetId: string): Promise<boolean> {
  const bookmarkId = getBookmarkId(userId, tweetId);
  const existing = await getDocument<Bookmark>(Collections.BOOKMARKS, bookmarkId);
  const bookmarkRef = getDocRef(Collections.BOOKMARKS, bookmarkId);
  const tweetRef = getDocRef(Collections.TWEETS, tweetId);

  if (existing) {
    await deleteDoc(bookmarkRef);
    updateDoc(tweetRef, { bookmarksCount: increment(-1) }).catch(() => {});
    return false;
  } else {
    await setDoc(bookmarkRef, { userId, tweetId, createdAt: serverTimestamp() });
    updateDoc(tweetRef, { bookmarksCount: increment(1) }).catch(() => {});
    return true;
  }
}

export async function getUserBookmarks(
  userId: string,
  lastDoc?: DocumentSnapshot,
  pageSize: number = PAGE_SIZE
): Promise<PaginatedResult<Bookmark>> {
  return queryDocuments<Bookmark>(
    Collections.BOOKMARKS,
    [where('userId', '==', userId), orderBy('createdAt', 'desc')],
    pageSize,
    lastDoc
  );
}
