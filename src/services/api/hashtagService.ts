import {
  serverTimestamp,
  increment,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { Hashtag } from '@/types/hashtag';
import { Tweet } from '@/types/tweet';
import { Collections } from '@/constants/firestore';
import { PAGE_SIZE, HASHTAG_SUGGEST_LIMIT, TRENDING_HASHTAGS_LIMIT } from '@/constants/limits';
import {
  getDocument,
  setDocument,
  updateDocument,
  queryDocuments,
  subscribeToQuery,
  subscribeToDocument,
  where,
  orderBy,
  limit,
} from '@/services/firebase/firestore';
import { PaginatedResult } from '@/types/common';

/**
 * Extract hashtags from text content.
 * Matches #tag patterns (supports Japanese, alphanumeric, underscores).
 */
export function extractHashtags(content: string): string[] {
  const regex = /#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF_]+)/g;
  const tags: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const tag = match[1];
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }

  return tags;
}

/**
 * Upsert hashtag documents — increment postCount or create new.
 */
export async function upsertHashtags(tags: string[]): Promise<void> {
  for (const tag of tags) {
    const existing = await getDocument<Hashtag>(Collections.HASHTAGS, tag);
    if (existing) {
      await updateDocument(Collections.HASHTAGS, tag, {
        postCount: increment(1),
      });
    } else {
      await setDocument(Collections.HASHTAGS, tag, {
        name: tag,
        postCount: 1,
        createdAt: serverTimestamp(),
      });
    }
  }
}

/**
 * Decrement postCount for hashtags (e.g. when deleting a tweet).
 */
export async function decrementHashtags(tags: string[]): Promise<void> {
  for (const tag of tags) {
    const existing = await getDocument<Hashtag>(Collections.HASHTAGS, tag);
    if (existing && existing.postCount > 1) {
      await updateDocument(Collections.HASHTAGS, tag, {
        postCount: increment(-1),
      });
    }
  }
}

/**
 * Search hashtags by prefix (forward-match).
 */
export async function searchHashtags(prefix: string): Promise<Hashtag[]> {
  if (!prefix) return [];

  const end = prefix + '\uf8ff';
  const result = await queryDocuments<Hashtag>(
    Collections.HASHTAGS,
    [
      where('name', '>=', prefix),
      where('name', '<=', end),
      orderBy('name'),
      limit(HASHTAG_SUGGEST_LIMIT),
    ],
    HASHTAG_SUGGEST_LIMIT,
  );

  return result.items;
}

/**
 * Get trending hashtags ordered by postCount descending.
 */
export async function getTrendingHashtags(): Promise<Hashtag[]> {
  const result = await queryDocuments<Hashtag>(
    Collections.HASHTAGS,
    [orderBy('postCount', 'desc'), limit(TRENDING_HASHTAGS_LIMIT)],
    TRENDING_HASHTAGS_LIMIT,
  );
  return result.items;
}

/**
 * Subscribe to trending hashtags in real-time.
 */
export function subscribeToTrendingHashtags(
  callback: (items: Hashtag[]) => void,
): Unsubscribe {
  return subscribeToQuery<Hashtag>(
    Collections.HASHTAGS,
    [orderBy('postCount', 'desc'), limit(TRENDING_HASHTAGS_LIMIT)],
    (items) => callback(items),
  );
}

/**
 * Subscribe to a single hashtag document for real-time postCount.
 */
export function subscribeToHashtag(
  tag: string,
  callback: (hashtag: Hashtag | null) => void,
): Unsubscribe {
  return subscribeToDocument<Hashtag>(Collections.HASHTAGS, tag, callback);
}

/**
 * Get tweets for a specific hashtag (paginated).
 */
export async function getHashtagFeed(
  tag: string,
  lastDoc?: DocumentSnapshot,
): Promise<PaginatedResult<Tweet>> {
  return queryDocuments<Tweet>(
    Collections.TWEETS,
    [
      where('hashtags', 'array-contains', tag),
      where('parentTweetId', '==', null),
      orderBy('createdAt', 'desc'),
    ],
    PAGE_SIZE,
    lastDoc,
  );
}

/**
 * Subscribe to real-time hashtag feed.
 */
export function subscribeToHashtagFeed(
  tag: string,
  callback: (items: Tweet[], lastDoc: DocumentSnapshot | null) => void,
): Unsubscribe {
  return subscribeToQuery<Tweet>(
    Collections.TWEETS,
    [
      where('hashtags', 'array-contains', tag),
      where('parentTweetId', '==', null),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    ],
    callback,
  );
}
