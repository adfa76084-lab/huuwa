import {
  serverTimestamp,
  increment,
  setDoc,
  updateDoc,
  DocumentSnapshot,
  Unsubscribe,
  QueryConstraint,
} from 'firebase/firestore';
import { Thread, ThreadReply, CreateThreadForm, ReplyAttachment } from '@/types/thread';
import { UserProfile } from '@/types/user';
import { Mention } from '@/types/mention';
import { sendMentionNotifications } from './mentionService';
import { Collections } from '@/constants/firestore';
import { PAGE_SIZE } from '@/constants/limits';
import {
  getDocument,
  setDocument,
  createBatch,
  getDocRef,
  getCollectionRef,
  queryDocuments,
  querySubcollection,
  getSubcollectionRef,
  subscribeToQuery,
  subscribeToSubcollection,
  subscribeToDocument,
  where,
  orderBy,
  limit,
  doc,
} from '@/services/firebase/firestore';
import { PaginatedResult } from '@/types/common';

export async function getThreads(
  lastDoc?: DocumentSnapshot,
  categoryIds?: string[]
): Promise<PaginatedResult<Thread>> {
  const constraints: QueryConstraint[] = [];

  if (categoryIds && categoryIds.length > 0) {
    constraints.push(where('categoryId', 'in', categoryIds));
  }

  constraints.push(orderBy('createdAt', 'desc'));

  return queryDocuments<Thread>(Collections.THREADS, constraints, PAGE_SIZE, lastDoc);
}

export async function getThread(threadId: string): Promise<Thread | null> {
  return getDocument<Thread>(Collections.THREADS, threadId);
}

export async function getThreadReplies(
  threadId: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<ThreadReply>> {
  return querySubcollection<ThreadReply>(
    Collections.THREADS,
    threadId,
    Collections.THREAD_REPLIES,
    [orderBy('createdAt', 'asc')],
    PAGE_SIZE,
    lastDoc
  );
}

export async function createThread(
  uid: string,
  form: CreateThreadForm,
  userProfile: UserProfile
): Promise<Thread> {
  const threadRef = doc(getCollectionRef(Collections.THREADS));

  // Snapshot author privacy for Firestore rule enforcement
  const authorDoc = await getDocument<{ isPrivate?: boolean }>(Collections.USERS, uid);
  const authorIsPrivate = authorDoc?.isPrivate === true;

  const threadData = {
    title: form.title,
    imageUrl: form.imageUrl ?? null,
    author: userProfile,
    authorUid: uid,
    authorIsPrivate,
    categoryId: form.categoryId,
    repliesCount: 0,
    lastReplyAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await setDocument(Collections.THREADS, threadRef.id, threadData);

  // Add the initial reply with the thread content
  const mentions = form.mentions ?? [];
  if (form.content) {
    const replyRef = doc(
      getSubcollectionRef(Collections.THREADS, threadRef.id, Collections.THREAD_REPLIES)
    );
    await setDocument(
      `${Collections.THREADS}/${threadRef.id}/${Collections.THREAD_REPLIES}`,
      replyRef.id,
      {
        threadId: threadRef.id,
        author: userProfile,
        authorUid: uid,
        content: form.content,
        imageUrls: [],
        mentions,
        createdAt: serverTimestamp(),
      }
    );

    // Send mention notifications
    if (mentions.length > 0) {
      sendMentionNotifications(mentions, userProfile, threadRef.id).catch(() => {});
    }
  }

  return { id: threadRef.id, ...threadData } as unknown as Thread;
}

export async function addThreadReply(
  threadId: string,
  uid: string,
  content: string,
  imageUrls: string[],
  userProfile: UserProfile,
  attachments: ReplyAttachment[] = [],
  mentions: Mention[] = []
): Promise<ThreadReply> {
  const replyRef = doc(
    getSubcollectionRef(Collections.THREADS, threadId, Collections.THREAD_REPLIES)
  );

  const replyData = {
    threadId,
    author: userProfile,
    authorUid: uid,
    content,
    imageUrls,
    attachments,
    mentions,
    createdAt: serverTimestamp(),
  };

  // Write the reply first so it's never lost even if the counter update fails
  await setDoc(replyRef, replyData);

  // Update thread counters separately — non-critical
  updateDoc(getDocRef(Collections.THREADS, threadId), {
    repliesCount: increment(1),
    lastReplyAt: serverTimestamp(),
  }).catch(() => {});

  // Send mention notifications
  if (mentions.length > 0) {
    sendMentionNotifications(mentions, userProfile, threadId).catch(() => {});
  }

  return { id: replyRef.id, ...replyData } as unknown as ThreadReply;
}

export function subscribeToThreadReplies(
  threadId: string,
  callback: (replies: ThreadReply[]) => void
): Unsubscribe {
  return subscribeToSubcollection<ThreadReply>(
    Collections.THREADS,
    threadId,
    Collections.THREAD_REPLIES,
    [orderBy('createdAt', 'asc')],
    callback
  );
}

export function subscribeToThread(
  threadId: string,
  callback: (thread: Thread | null) => void
): Unsubscribe {
  return subscribeToDocument<Thread>(Collections.THREADS, threadId, callback);
}

export async function getUserThreads(
  userId: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<Thread>> {
  return queryDocuments<Thread>(
    Collections.THREADS,
    [where('authorUid', '==', userId), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc
  );
}

export async function getCategoryThreads(
  categoryId: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<Thread>> {
  return queryDocuments<Thread>(
    Collections.THREADS,
    [where('categoryId', '==', categoryId), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc
  );
}

export const THREAD_FEED_POOL = 60;

export function subscribeToThreads(
  callback: (items: Thread[], lastDoc: DocumentSnapshot | null) => void,
  categoryIds?: string[]
): Unsubscribe {
  const constraints: QueryConstraint[] = [];

  if (categoryIds && categoryIds.length > 0) {
    constraints.push(where('categoryId', 'in', categoryIds));
  }

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(THREAD_FEED_POOL));

  return subscribeToQuery<Thread>(Collections.THREADS, constraints, callback);
}

export function subscribeToCategoryThreads(
  categoryId: string,
  pageSize: number,
  callback: (items: Thread[]) => void
): Unsubscribe {
  return subscribeToQuery<Thread>(
    Collections.THREADS,
    [
      where('categoryId', '==', categoryId),
      orderBy('createdAt', 'desc'),
    ],
    callback
  );
}
