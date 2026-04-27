import { FirestoreTimestamp } from './common';
import { UserProfile } from './user';
import { Mention } from './mention';

export interface Thread {
  id: string;
  title: string;
  imageUrl: string | null;
  author: UserProfile;
  authorUid: string;
  categoryId: string | null;
  repliesCount: number;
  likesCount?: number;
  lastReplyAt: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
}

export interface ThreadLike {
  id: string;
  userId: string;
  threadId: string;
  createdAt: FirestoreTimestamp;
}

// --- Rich media attachment types ---

export interface VoiceAttachment {
  type: 'voice';
  url: string;
  durationMs: number;
}

export interface VideoAttachment {
  type: 'video';
  url: string;
  thumbnailUrl?: string;
  durationMs?: number;
}

export interface FileAttachment {
  type: 'file';
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PollAttachment {
  type: 'poll';
  pollId: string;
}

export type ReplyAttachment =
  | VoiceAttachment
  | VideoAttachment
  | FileAttachment
  | PollAttachment;

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  voterUids: Record<string, string>; // uid → optionId
  createdByUid: string;
  createdAt: FirestoreTimestamp;
}

// --- Existing types ---

export interface ThreadReply {
  id: string;
  threadId: string;
  author: UserProfile;
  authorUid: string;
  content: string;
  imageUrls: string[];
  attachments: ReplyAttachment[];
  mentions: Mention[];
  createdAt: FirestoreTimestamp;
}

export interface CreateThreadForm {
  title: string;
  content: string;
  categoryId: string | null;
  imageUrl?: string | null;
  mentions?: Mention[];
}
