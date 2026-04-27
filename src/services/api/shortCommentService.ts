import { serverTimestamp, increment } from 'firebase/firestore';
import { ShortComment } from '@/types/short';
import { UserProfile } from '@/types/user';
import { Mention } from '@/types/mention';
import { Collections } from '@/constants/firestore';
import { sendMentionNotifications } from './mentionService';
import { PAGE_SIZE } from '@/constants/limits';
import {
  createBatch,
  getDocRef,
  getSubcollectionRef,
  getSubcollectionDocRef,
  querySubcollection,
  orderBy,
  doc,
} from '@/services/firebase/firestore';

export async function getShortComments(
  shortId: string
): Promise<{ items: ShortComment[]; lastDoc: unknown; hasMore: boolean }> {
  return querySubcollection<ShortComment>(
    Collections.SHORTS,
    shortId,
    Collections.SHORT_COMMENTS,
    [orderBy('createdAt', 'desc')],
    PAGE_SIZE
  );
}

export async function createShortComment(
  shortId: string,
  uid: string,
  userProfile: UserProfile,
  content: string,
  mentions: Mention[] = []
): Promise<ShortComment> {
  const commentRef = doc(getSubcollectionRef(Collections.SHORTS, shortId, Collections.SHORT_COMMENTS));
  const commentData = {
    shortId,
    content,
    author: userProfile,
    authorUid: uid,
    mentions,
    createdAt: serverTimestamp(),
  };

  const batch = createBatch();
  batch.set(commentRef, commentData);
  batch.update(getDocRef(Collections.SHORTS, shortId), {
    commentsCount: increment(1),
  });
  await batch.commit();

  // Send mention notifications
  if (mentions.length > 0) {
    sendMentionNotifications(mentions, userProfile, shortId).catch(() => {});
  }

  return { id: commentRef.id, ...commentData } as unknown as ShortComment;
}

export async function deleteShortComment(
  shortId: string,
  commentId: string
): Promise<void> {
  const commentRef = getSubcollectionDocRef(
    Collections.SHORTS,
    shortId,
    Collections.SHORT_COMMENTS,
    commentId
  );

  const batch = createBatch();
  batch.delete(commentRef);
  batch.update(getDocRef(Collections.SHORTS, shortId), {
    commentsCount: increment(-1),
  });
  await batch.commit();
}
