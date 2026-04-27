import {
  serverTimestamp,
  increment,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { ShortVideo, CreateShortForm } from '@/types/short';
import { UserProfile } from '@/types/user';
import { Collections } from '@/constants/firestore';
import { PAGE_SIZE, SHORTS_PAGE_SIZE } from '@/constants/limits';
import {
  getDocument,
  setDocument,
  deleteDocument,
  createBatch,
  getDocRef,
  getCollectionRef,
  queryDocuments,
  where,
  orderBy,
  doc,
} from '@/services/firebase/firestore';
import { uploadVideo, generateThumbnail } from '@/services/media/videoUploader';
import { uploadImage, getStoragePath } from '@/services/firebase/storage';
import { PaginatedResult } from '@/types/common';

export async function getShorts(
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<ShortVideo>> {
  return queryDocuments<ShortVideo>(
    Collections.SHORTS,
    [orderBy('createdAt', 'desc')],
    SHORTS_PAGE_SIZE,
    lastDoc
  );
}

export async function getCategoryShorts(
  categoryId: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<ShortVideo>> {
  return queryDocuments<ShortVideo>(
    Collections.SHORTS,
    [where('categoryId', '==', categoryId), orderBy('createdAt', 'desc')],
    SHORTS_PAGE_SIZE,
    lastDoc
  );
}

export async function getUserShorts(
  userId: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<ShortVideo>> {
  return queryDocuments<ShortVideo>(
    Collections.SHORTS,
    [where('authorUid', '==', userId), orderBy('createdAt', 'desc')],
    SHORTS_PAGE_SIZE,
    lastDoc
  );
}

export async function getShort(shortId: string): Promise<ShortVideo | null> {
  return getDocument<ShortVideo>(Collections.SHORTS, shortId);
}

export async function createShort(
  uid: string,
  form: CreateShortForm,
  userProfile: UserProfile,
  onProgress?: (progress: number) => void
): Promise<ShortVideo> {
  const ts = Date.now();

  // Generate thumbnail and upload video in parallel
  const [thumbnailUri, videoUrl] = await Promise.all([
    generateThumbnail(form.videoUri),
    uploadVideo(
      getStoragePath('shorts', uid, `${ts}.mp4`),
      form.videoUri,
      onProgress,
    ),
  ]);

  // Upload thumbnail if generated
  let thumbnailUrl = '';
  if (thumbnailUri) {
    thumbnailUrl = await uploadImage(
      getStoragePath('short_thumbs', uid, `${ts}.jpg`),
      thumbnailUri,
    );
  }

  const authorDoc = await getDocument<{ isPrivate?: boolean }>(Collections.USERS, uid);
  const authorIsPrivate = authorDoc?.isPrivate === true;

  const shortRef = doc(getCollectionRef(Collections.SHORTS));
  const shortData = {
    author: userProfile,
    authorUid: uid,
    authorIsPrivate,
    videoUrl,
    thumbnailUrl,
    caption: form.caption,
    categoryId: form.categoryId,
    likesCount: 0,
    commentsCount: 0,
    bookmarksCount: 0,
    duration: form.duration ?? 0,
    createdAt: serverTimestamp(),
  };

  await setDocument(Collections.SHORTS, shortRef.id, shortData);
  return {
    id: shortRef.id,
    ...shortData,
    createdAt: Timestamp.now(),
  } as unknown as ShortVideo;
}

export async function deleteShort(shortId: string): Promise<void> {
  await deleteDocument(Collections.SHORTS, shortId);
}

export interface ShortLike {
  id: string;
  userId: string;
  shortId: string;
}

export async function getUserLikedShorts(
  userId: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<ShortLike>> {
  return queryDocuments<ShortLike>(
    Collections.SHORT_LIKES,
    [where('userId', '==', userId), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc
  );
}

export async function likeShort(userId: string, shortId: string): Promise<boolean> {
  const likeId = `${userId}_${shortId}`;
  const existing = await getDocument(Collections.SHORT_LIKES, likeId);

  const batch = createBatch();

  if (existing) {
    batch.delete(getDocRef(Collections.SHORT_LIKES, likeId));
    batch.update(getDocRef(Collections.SHORTS, shortId), {
      likesCount: increment(-1),
    });
    await batch.commit();
    return false;
  } else {
    batch.set(getDocRef(Collections.SHORT_LIKES, likeId), {
      userId,
      shortId,
      createdAt: serverTimestamp(),
    });
    batch.update(getDocRef(Collections.SHORTS, shortId), {
      likesCount: increment(1),
    });
    await batch.commit();
    return true;
  }
}
