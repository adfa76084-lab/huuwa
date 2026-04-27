import { FirestoreTimestamp } from './common';
import { UserProfile } from './user';
import { ReplyAttachment } from './thread';

export type ChatAttachment = ReplyAttachment;

export interface ChatRoom {
  id: string;
  type: 'dm' | 'group' | 'open';
  name: string | null; // null for DMs
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  members: string[]; // uid array
  membersCount: number;
  memberProfiles: Record<string, UserProfile>;
  lastMessage: string | null;
  lastMessageAt: FirestoreTimestamp | null;
  createdBy: string;
  createdAt: FirestoreTimestamp;
  status: 'active' | 'pending';
  requestSenderUid: string | null;
  typingUsers?: string[];
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderUid: string;
  sender: UserProfile;
  content: string;
  imageUrl: string | null;
  attachments: ChatAttachment[];
  createdAt: FirestoreTimestamp;
  readBy?: string[]; // uids of users who have read this message
  reactions?: Record<string, string[]>; // emoji -> uids (e.g. { "❤️": ["uid1", "uid2"] })
}

export interface ChatNote {
  id: string;
  roomId: string;
  title: string;
  content: string;
  author: UserProfile;
  authorUid: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface ChatEvent {
  id: string;
  roomId: string;
  title: string;
  description: string;
  date: FirestoreTimestamp;
  endDate: FirestoreTimestamp | null;
  allDay: boolean;
  location: string | null;
  author: UserProfile;
  authorUid: string;
  attendees: string[];
  rsvpEnabled: boolean;
  createdAt: FirestoreTimestamp;
}

export interface ChatFile {
  id: string;
  roomId: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploader: UserProfile;
  uploaderUid: string;
  createdAt: FirestoreTimestamp;
}

export interface ChatNotificationPref {
  id: string;
  uid: string;
  roomId: string;
  muted: boolean;
}

export interface CreateChatForm {
  type: 'dm' | 'group' | 'open';
  name: string;
  description?: string;
  imageUrl?: string;
  categoryId?: string;
  memberUids: string[];
}
