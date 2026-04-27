import { serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { User, EditProfileForm } from '@/types/user';
import { Collections } from '@/constants/firestore';
import {
  getDocument,
  setDocument,
  updateDocument,
  queryDocuments,
  where,
  orderBy,
} from '@/services/firebase/firestore';

export async function getUserProfile(uid: string): Promise<User | null> {
  return getDocument<User>(Collections.USERS, uid);
}

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  username: string
): Promise<void> {
  // Public profile — email intentionally excluded for privacy
  await setDocument(Collections.USERS, uid, {
    uid,
    displayName,
    username,
    avatarUrl: null,
    headerImageUrl: null,
    bio: '',
    statusMessage: '',
    hobbies: [],
    followersCount: 0,
    followingCount: 0,
    tweetsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Private fields — only the owner can read this doc
  if (email) {
    await setDocument('userPrivate' as any, uid, {
      email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function updateStatusMessage(
  uid: string,
  statusMessage: string
): Promise<void> {
  await updateDocument(Collections.USERS, uid, {
    statusMessage,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<EditProfileForm>
): Promise<void> {
  await updateDocument(Collections.USERS, uid, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

export function getUsernameCooldownRemainingMs(
  usernameUpdatedAt: User['usernameUpdatedAt']
): number {
  if (!usernameUpdatedAt) return 0;
  const lastChange = usernameUpdatedAt.toMillis?.() ?? 0;
  const cooldownMs = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - lastChange;
  return Math.max(0, cooldownMs - elapsed);
}

export async function isUsernameTaken(
  username: string,
  excludeUid: string,
): Promise<boolean> {
  const result = await queryDocuments<User>(
    Collections.USERS,
    [where('username', '==', username)],
    2,
  );
  return result.items.some((u) => u.uid !== excludeUid);
}

export async function updatePrivacyPrefs(
  uid: string,
  prefs: { isPrivate?: boolean; dmPolicy?: 'everyone' | 'followers' | 'nobody' },
): Promise<void> {
  await updateDocument(Collections.USERS, uid, {
    ...prefs,
    updatedAt: serverTimestamp(),
  });
}

export type NotificationPrefKey = 'likes' | 'replies' | 'follows' | 'threadReplies' | 'chatMessages';

export async function updateNotificationPref(
  uid: string,
  key: NotificationPrefKey,
  value: boolean,
): Promise<void> {
  await updateDocument(Collections.USERS, uid, {
    [`notificationPrefs.${key}`]: value,
    updatedAt: serverTimestamp(),
  });
}

export async function blockUser(uid: string, targetUid: string): Promise<void> {
  await updateDocument(Collections.USERS, uid, {
    blockedUids: arrayUnion(targetUid),
    updatedAt: serverTimestamp(),
  });
}

export async function unblockUser(uid: string, targetUid: string): Promise<void> {
  await updateDocument(Collections.USERS, uid, {
    blockedUids: arrayRemove(targetUid),
    updatedAt: serverTimestamp(),
  });
}

export async function muteUser(uid: string, targetUid: string): Promise<void> {
  await updateDocument(Collections.USERS, uid, {
    mutedUids: arrayUnion(targetUid),
    updatedAt: serverTimestamp(),
  });
}

export async function unmuteUser(uid: string, targetUid: string): Promise<void> {
  await updateDocument(Collections.USERS, uid, {
    mutedUids: arrayRemove(targetUid),
    updatedAt: serverTimestamp(),
  });
}

export async function getUsersByUids(uids: string[]): Promise<User[]> {
  const results = await Promise.all(
    uids.map((uid) => getUserProfile(uid).catch(() => null)),
  );
  return results.filter((u): u is User => u !== null);
}

export async function disableAccount(uid: string): Promise<void> {
  await updateDocument(Collections.USERS, uid, {
    disabled: true,
    disabledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function restoreAccount(uid: string): Promise<void> {
  await updateDocument(Collections.USERS, uid, {
    disabled: false,
    disabledAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function changeUsername(
  uid: string,
  newUsername: string,
): Promise<void> {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error('プロフィールが見つかりません');

  const remaining = getUsernameCooldownRemainingMs(profile.usernameUpdatedAt);
  if (remaining > 0) {
    const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    throw new Error(`ユーザー名の変更はあと${days}日後まで利用できません`);
  }

  if (newUsername === profile.username) {
    throw new Error('現在と同じユーザー名です');
  }

  if (await isUsernameTaken(newUsername, uid)) {
    throw new Error('このユーザー名は既に使われています');
  }

  await updateDocument(Collections.USERS, uid, {
    username: newUsername,
    usernameUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function searchUsers(searchQuery: string): Promise<User[]> {
  const byUsername = await queryDocuments<User>(
    Collections.USERS,
    [
      where('username', '>=', searchQuery),
      where('username', '<=', searchQuery + '\uf8ff'),
      orderBy('username', 'asc'),
    ],
    20
  );

  const byDisplayName = await queryDocuments<User>(
    Collections.USERS,
    [
      where('displayName', '>=', searchQuery),
      where('displayName', '<=', searchQuery + '\uf8ff'),
      orderBy('displayName', 'asc'),
    ],
    20
  );

  // Merge and deduplicate
  const seen = new Set<string>();
  const results: User[] = [];

  for (const user of [...byUsername.items, ...byDisplayName.items]) {
    if (!seen.has(user.uid)) {
      seen.add(user.uid);
      results.push(user);
    }
  }

  return results;
}
