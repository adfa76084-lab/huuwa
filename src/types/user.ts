import { FirestoreTimestamp } from './common';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  headerImageUrl: string | null;
  bio: string;
  statusMessage: string;
  hobbies: string[];
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  usernameUpdatedAt?: FirestoreTimestamp | null;
  disabled?: boolean;
  disabledAt?: FirestoreTimestamp | null;
  isPrivate?: boolean;
  dmPolicy?: 'everyone' | 'followers' | 'nobody';
  notificationPrefs?: {
    likes?: boolean;
    replies?: boolean;
    follows?: boolean;
    threadReplies?: boolean;
    chatMessages?: boolean;
  };
  blockedUids?: string[];
  mutedUids?: string[];
  headerColor?: string | null;
  websiteUrl?: string | null;
}

export interface FollowRequest {
  id: string; // `${fromUid}_${toUid}`
  fromUid: string;
  toUid: string;
  createdAt: FirestoreTimestamp;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export interface Follow {
  id: string; // `${followerUid}_${followingUid}`
  followerUid: string;
  followingUid: string;
  createdAt: FirestoreTimestamp;
}

export interface EditProfileForm {
  displayName: string;
  username: string;
  bio: string;
  hobbies: string[];
  headerColor?: string | null;
  websiteUrl?: string | null;
}
