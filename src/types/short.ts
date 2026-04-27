import { FirestoreTimestamp } from './common';
import { UserProfile } from './user';
import { Mention } from './mention';

export interface ShortVideo {
  id: string;
  author: UserProfile;
  authorUid: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  categoryId: string | null;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  duration: number; // seconds
  createdAt: FirestoreTimestamp;
}

export interface ShortBookmark {
  id: string; // `${userId}_${shortId}`
  userId: string;
  shortId: string;
  createdAt: FirestoreTimestamp;
}

export interface ShortComment {
  id: string;
  shortId: string;
  content: string;
  author: UserProfile;
  authorUid: string;
  mentions: Mention[];
  createdAt: FirestoreTimestamp;
}

export interface CreateShortForm {
  videoUri: string;
  caption: string;
  categoryId: string | null;
  duration?: number;
}
