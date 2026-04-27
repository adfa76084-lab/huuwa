import {
  serverTimestamp,
  increment,
  setDoc,
  updateDoc,
  DocumentSnapshot,
  Unsubscribe,
  QueryConstraint,
  Timestamp,
} from 'firebase/firestore';
import { Tweet, ComposeTweetForm } from '@/types/tweet';
import { UserProfile } from '@/types/user';
import { Collections } from '@/constants/firestore';
import { PAGE_SIZE } from '@/constants/limits';
import {
  getDocument,
  setDocument,
  deleteDocument,
  createBatch,
  getDocRef,
  getCollectionRef,
  queryDocuments,
  subscribeToQuery,
  where,
  orderBy,
  limit,
  doc,
} from '@/services/firebase/firestore';
import { uploadImage, getStoragePath } from '@/services/firebase/storage';
import { PaginatedResult } from '@/types/common';
import { extractHashtags, upsertHashtags, decrementHashtags } from './hashtagService';
import { sendMentionNotifications } from './mentionService';

export async function getTweets(
  lastDoc?: DocumentSnapshot,
  categoryIds?: string[]
): Promise<PaginatedResult<Tweet>> {
  const constraints: QueryConstraint[] = [];

  if (categoryIds && categoryIds.length > 0) {
    constraints.push(where('categoryId', 'in', categoryIds));
  }

  // Always exclude replies from the feed
  constraints.push(where('parentTweetId', '==', null));
  constraints.push(orderBy('createdAt', 'desc'));

  return queryDocuments<Tweet>(Collections.TWEETS, constraints, PAGE_SIZE, lastDoc);
}

export async function getTweet(tweetId: string): Promise<Tweet | null> {
  return getDocument<Tweet>(Collections.TWEETS, tweetId);
}

export async function getTweetReplies(
  tweetId: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<Tweet>> {
  return queryDocuments<Tweet>(
    Collections.TWEETS,
    [where('parentTweetId', '==', tweetId), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc
  );
}

export async function getUserTweets(
  userId: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<Tweet>> {
  return queryDocuments<Tweet>(
    Collections.TWEETS,
    [where('authorUid', '==', userId), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc
  );
}

export async function createTweet(
  uid: string,
  form: ComposeTweetForm,
  userProfile: UserProfile,
  onProgress?: (progress: number) => void
): Promise<Tweet> {
  const imageUrls: string[] = [];
  const totalImages = form.images.length;
  for (let i = 0; i < totalImages; i++) {
    const path = getStoragePath('tweets', uid, `${Date.now()}.jpg`);
    const downloadUrl = await uploadImage(path, form.images[i], (p) => {
      // Each image contributes an equal share of 0-90%
      const base = (i / totalImages) * 90;
      const slice = (p / 100) * (90 / totalImages);
      onProgress?.(Math.round(base + slice));
    });
    imageUrls.push(downloadUrl);
  }
  // Images done → 90%
  if (totalImages > 0) onProgress?.(90);

  // Merge explicit hashtags with those detected in content
  const contentTags = extractHashtags(form.content);
  const explicitTags = form.hashtags ?? [];
  const allTags = Array.from(new Set([...explicitTags, ...contentTags]));

  const mentions = form.mentions ?? [];

  // Snapshot author's current privacy so the post can be gated by Firestore rules
  const authorDoc = await getDocument<{ isPrivate?: boolean }>(Collections.USERS, uid);
  const authorIsPrivate = authorDoc?.isPrivate === true;

  const tweetRef = doc(getCollectionRef(Collections.TWEETS));
  const tweetData = {
    author: userProfile,
    authorUid: uid,
    authorIsPrivate,
    content: form.content,
    imageUrls,
    categoryId: form.categoryIds[0] ?? null,
    categoryIds: form.categoryIds,
    parentTweetId: form.parentTweetId,
    pollId: form.pollId ?? null,
    hashtags: allTags,
    mentions,
    likesCount: 0,
    repliesCount: 0,
    bookmarksCount: 0,
    viewsCount: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Write the tweet first
  await setDoc(tweetRef, tweetData);

  // Update counters separately so failures don't delete the tweet
  updateDoc(getDocRef(Collections.USERS, uid), {
    tweetsCount: increment(1),
  }).catch(() => {});

  if (form.parentTweetId) {
    updateDoc(getDocRef(Collections.TWEETS, form.parentTweetId), {
      repliesCount: increment(1),
    }).catch(() => {});

    // Also increment the root post's repliesCount for nested replies
    if (form.rootTweetId && form.rootTweetId !== form.parentTweetId) {
      updateDoc(getDocRef(Collections.TWEETS, form.rootTweetId), {
        repliesCount: increment(1),
      }).catch(() => {});
    }
  }
  onProgress?.(95);

  // Upsert hashtag documents (postCount +1 or create)
  if (allTags.length > 0) {
    await upsertHashtags(allTags);
  }

  // Send mention notifications
  if (mentions.length > 0) {
    sendMentionNotifications(mentions, userProfile, tweetRef.id).catch(() => {});
  }

  onProgress?.(100);
  return { id: tweetRef.id, ...tweetData } as unknown as Tweet;
}

export async function deleteTweet(tweetId: string, userId: string): Promise<void> {
  // Fetch tweet to get hashtags before deleting
  const tweet = await getTweet(tweetId);

  const batch = createBatch();
  batch.delete(getDocRef(Collections.TWEETS, tweetId));
  batch.update(getDocRef(Collections.USERS, userId), {
    tweetsCount: increment(-1),
  });
  await batch.commit();

  // Decrement hashtag postCounts
  if (tweet?.hashtags && tweet.hashtags.length > 0) {
    await decrementHashtags(tweet.hashtags);
  }
}

export async function getCategoryTimeline(
  categoryId: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<Tweet>> {
  return queryDocuments<Tweet>(
    Collections.TWEETS,
    [where('categoryId', '==', categoryId), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc
  );
}

export const FEED_CANDIDATE_POOL = 100;

/**
 * Fetch the most recent tweets authored by any user the given viewer follows.
 * Firestore `in` is capped at 30 values, so we chunk and merge.
 */
export async function getFollowingTweets(followingUids: string[]): Promise<Tweet[]> {
  if (followingUids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < followingUids.length; i += 30) {
    chunks.push(followingUids.slice(i, i + 30));
  }
  const results: Tweet[] = [];
  for (const chunk of chunks) {
    const r = await queryDocuments<Tweet>(
      Collections.TWEETS,
      [
        where('authorUid', 'in', chunk),
        where('parentTweetId', '==', null),
        orderBy('createdAt', 'desc'),
      ],
      60,
    );
    results.push(...r.items);
  }
  // Sort merged results by createdAt desc and dedupe
  const seen = new Set<string>();
  return results
    .filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    })
    .sort((a, b) => {
      const am = (a.createdAt as any)?.toMillis?.() ?? 0;
      const bm = (b.createdAt as any)?.toMillis?.() ?? 0;
      return bm - am;
    })
    .slice(0, FEED_CANDIDATE_POOL);
}

export function subscribeToTweets(
  callback: (items: Tweet[], lastDoc: DocumentSnapshot | null) => void,
  categoryIds?: string[]
): Unsubscribe {
  const constraints: QueryConstraint[] = [];

  if (categoryIds && categoryIds.length > 0) {
    constraints.push(where('categoryId', 'in', categoryIds));
  }

  // Always exclude replies from the feed
  constraints.push(where('parentTweetId', '==', null));
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(FEED_CANDIDATE_POOL));

  return subscribeToQuery<Tweet>(Collections.TWEETS, constraints, callback);
}

export function subscribeToCategoryTimeline(
  categoryId: string,
  pageSize: number,
  callback: (items: Tweet[]) => void
): Unsubscribe {
  return subscribeToQuery<Tweet>(
    Collections.TWEETS,
    [
      where('categoryId', '==', categoryId),
      orderBy('createdAt', 'desc'),
    ],
    callback
  );
}

// ---------------------------------------------------------------------------
// Impression tracking
// ---------------------------------------------------------------------------

// Per-session dedup: avoid recording the same view multiple times in one session
const viewedThisSession = new Set<string>();

// Buffer for batched writes
let viewBuffer: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 3000; // 3 seconds
const FLUSH_SIZE = 10;

function scheduleFlush(userId: string) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => flushViews(userId), FLUSH_INTERVAL);
}

async function flushViews(userId: string) {
  flushTimer = null;
  if (viewBuffer.length === 0) return;

  const tweetIds = [...viewBuffer];
  viewBuffer = [];

  const batch = createBatch();
  for (const tweetId of tweetIds) {
    // Increment viewsCount
    batch.update(getDocRef(Collections.TWEETS, tweetId), {
      viewsCount: increment(1),
    });
    // Record view doc for uniqueness tracking
    batch.set(getDocRef(Collections.TWEET_VIEWS, `${userId}_${tweetId}`), {
      userId,
      tweetId,
      createdAt: Timestamp.now(),
    });
  }

  try {
    await batch.commit();
  } catch {
    // silently fail – views are non-critical
  }
}

/**
 * Record that a user has seen a tweet. Deduplicates within the session and
 * batches Firestore writes for efficiency.
 */
export function recordTweetImpression(userId: string, tweetId: string) {
  const key = `${userId}_${tweetId}`;
  if (viewedThisSession.has(key)) return;
  viewedThisSession.add(key);

  viewBuffer.push(tweetId);

  if (viewBuffer.length >= FLUSH_SIZE) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushViews(userId);
  } else {
    scheduleFlush(userId);
  }
}

/**
 * Search tweets by content (recent tweets, client-side filter).
 * Firestore doesn't support full-text search, so we fetch recent tweets and filter.
 */
export async function searchTweets(query: string): Promise<Tweet[]> {
  if (!query.trim()) return [];

  const result = await queryDocuments<Tweet>(
    Collections.TWEETS,
    [
      where('parentTweetId', '==', null),
      orderBy('createdAt', 'desc'),
    ],
    200
  );

  const q = query.toLowerCase();
  return result.items.filter(
    (t) =>
      t.content.toLowerCase().includes(q) ||
      t.author.displayName.toLowerCase().includes(q) ||
      (t.author.username && t.author.username.toLowerCase().includes(q))
  );
}
