import { FirestoreTimestamp } from './common';
import { UserProfile } from './user';

export type NotificationType = 'like' | 'reply' | 'follow' | 'thread_reply' | 'chat_message' | 'mention';

export interface AppNotification {
  id: string;
  type: NotificationType;
  recipientUid: string;
  actor: UserProfile;
  actorUid: string;
  targetId: string; // tweetId, threadId, or chatRoomId
  message: string;
  read: boolean;
  createdAt: FirestoreTimestamp;
}
