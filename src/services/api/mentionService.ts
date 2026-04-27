import { Mention } from '@/types/mention';
import { UserProfile } from '@/types/user';
import { searchUsers, getUsersByUids } from './userService';
import { getFollowing } from './followService';
import { createNotification } from './notificationService';
import { MENTION_SUGGEST_LIMIT } from '@/constants/limits';

export interface MentionSuggestion {
  uid: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Extract @mentions from text content.
 * Returns an array of username strings found in the text.
 */
export function extractMentionUsernames(content: string): string[] {
  const regex = /@([a-zA-Z0-9_]+)/g;
  const usernames: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1] && !usernames.includes(match[1])) {
      usernames.push(match[1]);
    }
  }
  return usernames;
}

/**
 * Search users for mention autocomplete suggestions.
 */
export async function getMentionSuggestions(query: string): Promise<MentionSuggestion[]> {
  if (!query || query.length === 0) return [];

  const users = await searchUsers(query);
  return users.slice(0, MENTION_SUGGEST_LIMIT).map((u) => ({
    uid: u.uid,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
  }));
}

/**
 * Default mention suggestions shown when the user has just typed '@' with no query yet.
 * Returns the people the current user follows, capped at MENTION_SUGGEST_LIMIT.
 */
export async function getDefaultMentionSuggestions(currentUid: string): Promise<MentionSuggestion[]> {
  const result = await getFollowing(currentUid);
  const uids = result.items.map((f) => f.followingUid).slice(0, MENTION_SUGGEST_LIMIT);
  if (uids.length === 0) return [];
  const users = await getUsersByUids(uids);
  return users.map((u) => ({
    uid: u.uid,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
  }));
}

/**
 * Send mention notifications to all mentioned users.
 * Skips the current user (self-mention).
 */
export async function sendMentionNotifications(
  mentions: Mention[],
  actorProfile: UserProfile,
  targetId: string,
): Promise<void> {
  const promises = mentions
    .filter((m) => m.uid !== actorProfile.uid)
    .map((m) =>
      createNotification(
        m.uid,
        actorProfile,
        'mention',
        targetId,
        'があなたをメンションしました',
      )
    );

  await Promise.all(promises);
}
