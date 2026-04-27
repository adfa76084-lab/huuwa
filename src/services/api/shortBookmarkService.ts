import { serverTimestamp, increment, DocumentSnapshot } from 'firebase/firestore';
import { ShortBookmark } from '@/types/short';
import { Collections } from '@/constants/firestore';
import { PAGE_SIZE } from '@/constants/limits';
import {
  getDocument,
  createBatch,
  getDocRef,
  queryDocuments,
  where,
  orderBy,
} from '@/services/firebase/firestore';
import { PaginatedResult } from '@/types/common';

function getBookmarkId(userId: string, shortId: string): string {
  return `${userId}_${shortId}`;
}

export async function toggleShortBookmark(
  userId: string,
  shortId: string,
): Promise<boolean> {
  const bookmarkId = getBookmarkId(userId, shortId);
  const existing = await getDocument<ShortBookmark>(
    Collections.SHORT_BOOKMARKS,
    bookmarkId,
  );

  const batch = createBatch();

  if (existing) {
    batch.delete(getDocRef(Collections.SHORT_BOOKMARKS, bookmarkId));
    batch.update(getDocRef(Collections.SHORTS, shortId), {
      bookmarksCount: increment(-1),
    });
    await batch.commit();
    return false;
  } else {
    batch.set(getDocRef(Collections.SHORT_BOOKMARKS, bookmarkId), {
      userId,
      shortId,
      createdAt: serverTimestamp(),
    });
    batch.update(getDocRef(Collections.SHORTS, shortId), {
      bookmarksCount: increment(1),
    });
    await batch.commit();
    return true;
  }
}

export async function getUserShortBookmarks(
  userId: string,
  lastDoc?: DocumentSnapshot,
): Promise<PaginatedResult<ShortBookmark>> {
  return queryDocuments<ShortBookmark>(
    Collections.SHORT_BOOKMARKS,
    [where('userId', '==', userId), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc,
  );
}
