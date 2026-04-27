import { serverTimestamp, DocumentSnapshot } from 'firebase/firestore';
import { AppNotification, NotificationType } from '@/types/notification';
import { User, UserProfile } from '@/types/user';
import { Collections } from '@/constants/firestore';
import { PAGE_SIZE } from '@/constants/limits';
import {
  getDocument,
  setDocument,
  updateDocument,
  createBatch,
  getDocRef,
  getCollectionRef,
  queryDocuments,
  where,
  orderBy,
  doc,
} from '@/services/firebase/firestore';
import { PaginatedResult } from '@/types/common';

export async function getNotifications(
  userId: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<AppNotification>> {
  return queryDocuments<AppNotification>(
    Collections.NOTIFICATIONS,
    [where('recipientUid', '==', userId), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDocument(Collections.NOTIFICATIONS, notificationId, {
    read: true,
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const result = await queryDocuments<AppNotification>(
    Collections.NOTIFICATIONS,
    [where('recipientUid', '==', userId), where('read', '==', false)],
    500
  );

  if (result.items.length === 0) return;

  const batch = createBatch();
  for (const notification of result.items) {
    batch.update(getDocRef(Collections.NOTIFICATIONS, notification.id), {
      read: true,
    });
  }
  await batch.commit();
}

export async function getUnreadCount(userId: string): Promise<number> {
  const result = await queryDocuments<AppNotification>(
    Collections.NOTIFICATIONS,
    [where('recipientUid', '==', userId), where('read', '==', false)],
    500
  );
  return result.items.length;
}

const TYPE_TO_PREF: Record<NotificationType, keyof NonNullable<User['notificationPrefs']> | null> = {
  like: 'likes',
  reply: 'replies',
  follow: 'follows',
  thread_reply: 'threadReplies',
  chat_message: 'chatMessages',
  mention: null, // always deliver mentions
};

export function isNotificationEnabled(
  type: NotificationType,
  prefs: User['notificationPrefs'] | undefined,
): boolean {
  const key = TYPE_TO_PREF[type];
  if (!key) return true;
  return prefs?.[key] !== false;
}

export async function createNotification(
  recipientUid: string,
  actorProfile: UserProfile,
  type: NotificationType,
  targetId: string,
  message: string
): Promise<void> {
  // Don't notify yourself
  if (recipientUid === actorProfile.uid) return;

  // Respect recipient's notification preferences
  try {
    const recipient = await getDocument<User>(Collections.USERS, recipientUid);
    if (recipient && !isNotificationEnabled(type, recipient.notificationPrefs)) {
      return;
    }
  } catch {
    // If pref lookup fails, fall through and deliver
  }

  const notificationRef = doc(getCollectionRef(Collections.NOTIFICATIONS));
  await setDocument(Collections.NOTIFICATIONS, notificationRef.id, {
    type,
    recipientUid,
    actor: actorProfile,
    actorUid: actorProfile.uid,
    targetId,
    message,
    read: false,
    createdAt: serverTimestamp(),
  });
}
