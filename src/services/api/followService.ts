import { serverTimestamp, increment, DocumentSnapshot } from 'firebase/firestore';
import { Follow, FollowRequest, User } from '@/types/user';
import { Collections } from '@/constants/firestore';
import { PAGE_SIZE } from '@/constants/limits';
import {
  getDocument,
  setDocument,
  deleteDocument,
  createBatch,
  getDocRef,
  queryDocuments,
  where,
  orderBy,
} from '@/services/firebase/firestore';
import { PaginatedResult } from '@/types/common';

function getRequestId(fromUid: string, toUid: string): string {
  return `${fromUid}_${toUid}`;
}

function getFollowId(followerUid: string, followingUid: string): string {
  return `${followerUid}_${followingUid}`;
}

export async function isFollowing(
  followerUid: string,
  followingUid: string
): Promise<boolean> {
  const follow = await getDocument<Follow>(
    Collections.FOLLOWS,
    getFollowId(followerUid, followingUid)
  );
  return follow !== null;
}

export async function isMutualFollow(
  uidA: string,
  uidB: string
): Promise<boolean> {
  const [aFollowsB, bFollowsA] = await Promise.all([
    isFollowing(uidA, uidB),
    isFollowing(uidB, uidA),
  ]);
  return aFollowsB && bFollowsA;
}

export type FollowActionResult =
  | { status: 'followed' }
  | { status: 'unfollowed' }
  | { status: 'requested' }
  | { status: 'cancelled' };

export async function hasPendingFollowRequest(
  fromUid: string,
  toUid: string,
): Promise<boolean> {
  const req = await getDocument<FollowRequest>(
    Collections.FOLLOW_REQUESTS,
    getRequestId(fromUid, toUid),
  );
  return req !== null;
}

export async function toggleFollow(
  followerUid: string,
  followingUid: string,
  targetIsPrivate: boolean = false,
): Promise<FollowActionResult> {
  const followId = getFollowId(followerUid, followingUid);
  const existing = await getDocument<Follow>(Collections.FOLLOWS, followId);

  if (existing) {
    const batch = createBatch();
    batch.delete(getDocRef(Collections.FOLLOWS, followId));
    batch.update(getDocRef(Collections.USERS, followerUid), {
      followingCount: increment(-1),
    });
    batch.update(getDocRef(Collections.USERS, followingUid), {
      followersCount: increment(-1),
    });
    await batch.commit();
    return { status: 'unfollowed' };
  }

  if (targetIsPrivate) {
    const reqId = getRequestId(followerUid, followingUid);
    const existingReq = await getDocument<FollowRequest>(Collections.FOLLOW_REQUESTS, reqId);
    if (existingReq) {
      await deleteDocument(Collections.FOLLOW_REQUESTS, reqId);
      return { status: 'cancelled' };
    }
    await setDocument(Collections.FOLLOW_REQUESTS, reqId, {
      fromUid: followerUid,
      toUid: followingUid,
      createdAt: serverTimestamp(),
    });
    return { status: 'requested' };
  }

  const batch = createBatch();
  batch.set(getDocRef(Collections.FOLLOWS, followId), {
    followerUid,
    followingUid,
    createdAt: serverTimestamp(),
  });
  batch.update(getDocRef(Collections.USERS, followerUid), {
    followingCount: increment(1),
  });
  batch.update(getDocRef(Collections.USERS, followingUid), {
    followersCount: increment(1),
  });
  await batch.commit();
  return { status: 'followed' };
}

export async function approveFollowRequest(
  fromUid: string,
  toUid: string,
): Promise<void> {
  const reqId = getRequestId(fromUid, toUid);
  const followId = getFollowId(fromUid, toUid);
  const batch = createBatch();
  batch.delete(getDocRef(Collections.FOLLOW_REQUESTS, reqId));
  batch.set(getDocRef(Collections.FOLLOWS, followId), {
    followerUid: fromUid,
    followingUid: toUid,
    createdAt: serverTimestamp(),
  });
  batch.update(getDocRef(Collections.USERS, fromUid), {
    followingCount: increment(1),
  });
  batch.update(getDocRef(Collections.USERS, toUid), {
    followersCount: increment(1),
  });
  await batch.commit();
}

export async function rejectFollowRequest(
  fromUid: string,
  toUid: string,
): Promise<void> {
  await deleteDocument(Collections.FOLLOW_REQUESTS, getRequestId(fromUid, toUid));
}

export async function getIncomingFollowRequests(
  toUid: string,
  lastDoc?: DocumentSnapshot,
): Promise<PaginatedResult<FollowRequest>> {
  return queryDocuments<FollowRequest>(
    Collections.FOLLOW_REQUESTS,
    [where('toUid', '==', toUid), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc,
  );
}

export async function getFollowers(
  uid: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<Follow>> {
  return queryDocuments<Follow>(
    Collections.FOLLOWS,
    [where('followingUid', '==', uid), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc
  );
}

export async function getFollowing(
  uid: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<Follow>> {
  return queryDocuments<Follow>(
    Collections.FOLLOWS,
    [where('followerUid', '==', uid), orderBy('createdAt', 'desc')],
    PAGE_SIZE,
    lastDoc
  );
}

/** Get users who mutually follow each other with the given user */
export async function getMutualFollows(uid: string): Promise<User[]> {
  // Get all users I follow
  const followingResult = await queryDocuments<Follow>(
    Collections.FOLLOWS,
    [where('followerUid', '==', uid)],
    200
  );
  // Get all users who follow me
  const followersResult = await queryDocuments<Follow>(
    Collections.FOLLOWS,
    [where('followingUid', '==', uid)],
    200
  );

  const followingUids = new Set(followingResult.items.map((f) => f.followingUid));
  const mutualUids = followersResult.items
    .map((f) => f.followerUid)
    .filter((fUid) => followingUids.has(fUid));

  if (mutualUids.length === 0) return [];

  const users: User[] = [];
  for (const mutualUid of mutualUids) {
    const user = await getDocument<User>(Collections.USERS, mutualUid);
    if (user) users.push(user);
  }
  return users;
}
