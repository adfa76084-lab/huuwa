import { FirestoreTimestamp } from './common';
import { UserProfile } from './user';
import { Mention } from './mention';

export interface Tweet {
  id: string;
  author: UserProfile;
  authorUid: string;
  content: string;
  imageUrls: string[];
  categoryId: string | null;
  categoryIds: string[];
  parentTweetId: string | null; // null = top-level tweet, string = reply
  pollId: string | null;
  hashtags: string[];
  mentions: Mention[];
  likesCount: number;
  repliesCount: number;
  bookmarksCount: number;
  viewsCount: number;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface Like {
  id: string; // `${userId}_${tweetId}`
  userId: string;
  tweetId: string;
  createdAt: FirestoreTimestamp;
}

export interface Bookmark {
  id: string; // `${userId}_${tweetId}`
  userId: string;
  tweetId: string;
  createdAt: FirestoreTimestamp;
}

export interface ComposeTweetForm {
  content: string;
  images: string[]; // local URIs
  categoryIds: string[];
  parentTweetId: string | null;
  rootTweetId?: string | null; // original post ID for nested replies
  pollId?: string | null;
  hashtags?: string[];
  mentions?: Mention[];
}
