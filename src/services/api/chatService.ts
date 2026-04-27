import { serverTimestamp, Timestamp, increment, DocumentSnapshot, arrayUnion, arrayRemove, onSnapshot, query, collection, orderBy as fsOrderBy, limit as fsLimit, Unsubscribe } from 'firebase/firestore';
import { ChatRoom, ChatMessage, ChatAttachment, ChatNotificationPref, CreateChatForm } from '@/types/chat';
import { User, UserProfile } from '@/types/user';
import { Collections } from '@/constants/firestore';
import { CHAT_PAGE_SIZE } from '@/constants/limits';
import { getMutualFollows } from '@/services/api/followService';
import {
  getDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  querySubcollection,
  getCollectionRef,
  getSubcollectionRef,
  where,
  orderBy,
  doc,
} from '@/services/firebase/firestore';
import { db } from '@/services/firebase/config';
import { PaginatedResult } from '@/types/common';

export async function getChatRooms(userId: string): Promise<ChatRoom[]> {
  const result = await queryDocuments<ChatRoom>(
    Collections.CHAT_ROOMS,
    [where('members', 'array-contains', userId), orderBy('lastMessageAt', 'desc')],
    50
  );
  // Exclude open chats and pending message requests
  return result.items.filter(
    (r) => r.type !== 'open' && (r.status ?? 'active') === 'active'
  );
}

export async function getChatMessages(
  roomId: string,
  lastDoc?: DocumentSnapshot
): Promise<PaginatedResult<ChatMessage>> {
  return querySubcollection<ChatMessage>(
    Collections.CHAT_ROOMS,
    roomId,
    Collections.CHAT_MESSAGES,
    [orderBy('createdAt', 'desc')],
    CHAT_PAGE_SIZE,
    lastDoc
  );
}

export async function sendMessage(
  roomId: string,
  senderUid: string,
  sender: UserProfile,
  content: string,
  imageUrl?: string | null,
  attachments?: ChatAttachment[]
): Promise<ChatMessage> {
  const messageRef = doc(
    getSubcollectionRef(Collections.CHAT_ROOMS, roomId, Collections.CHAT_MESSAGES)
  );

  const messageData = {
    roomId,
    senderUid,
    sender,
    content,
    imageUrl: imageUrl ?? null,
    attachments: attachments ?? [],
    readBy: [senderUid],
    createdAt: Timestamp.now(),
  };

  await setDocument(
    `${Collections.CHAT_ROOMS}/${roomId}/${Collections.CHAT_MESSAGES}`,
    messageRef.id,
    messageData
  );

  await updateDocument(Collections.CHAT_ROOMS, roomId, {
    lastMessage: content || (imageUrl ? '写真' : (attachments?.length ? '添付ファイル' : '')),
    lastMessageAt: serverTimestamp(),
  });

  return { id: messageRef.id, ...messageData } as unknown as ChatMessage;
}

export async function createChatRoom(
  creatorUid: string,
  form: CreateChatForm,
  memberProfiles: Record<string, UserProfile>,
  options?: { status?: 'active' | 'pending'; requestSenderUid?: string | null }
): Promise<ChatRoom> {
  const roomRef = doc(getCollectionRef(Collections.CHAT_ROOMS));

  const allMembers = [creatorUid, ...form.memberUids.filter((uid) => uid !== creatorUid)];

  const roomData = {
    type: form.type,
    name: form.type === 'dm' ? null : form.name,
    description: form.description ?? null,
    imageUrl: form.imageUrl ?? null,
    categoryId: form.categoryId ?? null,
    members: allMembers,
    membersCount: allMembers.length,
    memberProfiles,
    lastMessage: null,
    lastMessageAt: null,
    createdBy: creatorUid,
    createdAt: serverTimestamp(),
    status: options?.status ?? 'active',
    requestSenderUid: options?.requestSenderUid ?? null,
  };

  await setDocument(Collections.CHAT_ROOMS, roomRef.id, roomData);

  return { id: roomRef.id, ...roomData } as unknown as ChatRoom;
}

// Message Request functions

export async function findExistingDmRoom(
  uidA: string,
  uidB: string
): Promise<ChatRoom | null> {
  const result = await queryDocuments<ChatRoom>(
    Collections.CHAT_ROOMS,
    [
      where('type', '==', 'dm'),
      where('members', 'array-contains', uidA),
    ],
    50
  );
  return result.items.find((r) => r.members.includes(uidB)) ?? null;
}

export async function getMessageRequests(userId: string): Promise<ChatRoom[]> {
  const result = await queryDocuments<ChatRoom>(
    Collections.CHAT_ROOMS,
    [
      where('members', 'array-contains', userId),
      orderBy('createdAt', 'desc'),
    ],
    50
  );
  return result.items.filter(
    (r) => r.status === 'pending' && r.requestSenderUid !== userId
  );
}

export async function acceptMessageRequest(roomId: string): Promise<void> {
  await updateDocument(Collections.CHAT_ROOMS, roomId, {
    status: 'active',
    requestSenderUid: null,
  });
}

export async function declineMessageRequest(roomId: string): Promise<void> {
  await deleteDocument(Collections.CHAT_ROOMS, roomId);
}

// Open Chat functions

export async function getAllOpenChatRooms(categoryIds?: string[]): Promise<ChatRoom[]> {
  let items: ChatRoom[];

  if (categoryIds && categoryIds.length > 0) {
    // Firestore 'in' supports up to 30 values
    const chunks: string[][] = [];
    for (let i = 0; i < categoryIds.length; i += 30) {
      chunks.push(categoryIds.slice(i, i + 30));
    }
    const results: ChatRoom[] = [];
    for (const chunk of chunks) {
      const result = await queryDocuments<ChatRoom>(
        Collections.CHAT_ROOMS,
        [
          where('type', '==', 'open'),
          where('categoryId', 'in', chunk),
        ],
        100
      );
      results.push(...result.items);
    }
    items = results;
  } else {
    const result = await queryDocuments<ChatRoom>(
      Collections.CHAT_ROOMS,
      [
        where('type', '==', 'open'),
      ],
      100
    );
    items = result.items;
  }

  // Sort client-side by membersCount descending
  items.sort((a, b) => (b.membersCount ?? 0) - (a.membersCount ?? 0));
  return items;
}

export async function getCreatedOpenChats(uid: string): Promise<ChatRoom[]> {
  const result = await queryDocuments<ChatRoom>(
    Collections.CHAT_ROOMS,
    [where('createdBy', '==', uid)],
    50
  );
  return result.items
    .filter((r) => r.type === 'open')
    .sort((a, b) => (b.membersCount ?? 0) - (a.membersCount ?? 0));
}

export async function getOpenChatRooms(
  categoryId: string
): Promise<ChatRoom[]> {
  const result = await queryDocuments<ChatRoom>(
    Collections.CHAT_ROOMS,
    [
      where('type', '==', 'open'),
      where('categoryId', '==', categoryId),
      orderBy('membersCount', 'desc'),
    ],
    50
  );
  return result.items;
}

export async function joinOpenChat(
  roomId: string,
  uid: string,
  userProfile: UserProfile
): Promise<void> {
  const room = await getDocument<ChatRoom>(Collections.CHAT_ROOMS, roomId);
  if (!room) throw new Error('Chat room not found');
  if (room.members.includes(uid)) return; // already a member, no-op

  const newCount = room.members.length + 1;
  await updateDocument(Collections.CHAT_ROOMS, roomId, {
    members: arrayUnion(uid),
    [`memberProfiles.${uid}`]: userProfile,
    membersCount: newCount,
  });
}

export async function getMyOpenChatRooms(uid: string): Promise<ChatRoom[]> {
  const result = await queryDocuments<ChatRoom>(
    Collections.CHAT_ROOMS,
    [
      where('type', '==', 'open'),
      where('members', 'array-contains', uid),
    ],
    50
  );
  return result.items;
}

export async function leaveOpenChat(
  roomId: string,
  uid: string
): Promise<void> {
  const room = await getDocument<ChatRoom>(Collections.CHAT_ROOMS, roomId);
  if (!room) return;

  const newCount = Math.max(0, room.members.length - 1);
  await updateDocument(Collections.CHAT_ROOMS, roomId, {
    members: arrayRemove(uid),
    membersCount: newCount,
  });
}

export function subscribeToChatMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = CHAT_PAGE_SIZE
): Unsubscribe {
  const messagesRef = collection(db, Collections.CHAT_ROOMS, roomId, Collections.CHAT_MESSAGES);
  // Fetch in desc to get the latest N messages, then reverse to asc for display
  const q = query(messagesRef, fsOrderBy('createdAt', 'desc'), fsLimit(messageLimit));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data({ serverTimestamps: 'estimate' }),
        } as ChatMessage))
        .reverse(); // oldest first → newest last (bottom of list)
      callback(messages);
    },
    silenceChatErrors,
  );
}

function silenceChatErrors(err: unknown) {
  const code = (err as { code?: string } | undefined)?.code;
  if (code === 'permission-denied' || code === 'unauthenticated') return;
  console.warn('[chat subscription error]', err);
}

// ─── Info / Settings helpers ───

export async function getChatRoom(roomId: string): Promise<ChatRoom | null> {
  return getDocument<ChatRoom>(Collections.CHAT_ROOMS, roomId);
}

export async function updateChatRoom(
  roomId: string,
  data: Partial<Pick<ChatRoom, 'name' | 'description' | 'imageUrl'>>
): Promise<void> {
  await updateDocument(Collections.CHAT_ROOMS, roomId, data as Record<string, unknown>);
}

export async function getMediaMessages(roomId: string): Promise<ChatMessage[]> {
  const result = await querySubcollection<ChatMessage>(
    Collections.CHAT_ROOMS,
    roomId,
    Collections.CHAT_MESSAGES,
    [orderBy('createdAt', 'desc')],
    500
  );
  return result.items.filter((m) => m.imageUrl != null);
}

export async function kickMember(
  roomId: string,
  uid: string
): Promise<void> {
  const room = await getDocument<ChatRoom>(Collections.CHAT_ROOMS, roomId);
  if (!room) return;
  const newCount = Math.max(0, room.members.length - 1);
  await updateDocument(Collections.CHAT_ROOMS, roomId, {
    members: arrayRemove(uid),
    membersCount: newCount,
  });
}

// ─── Search ───

export async function searchMessages(
  roomId: string,
  keyword: string,
  senderUid?: string | null
): Promise<ChatMessage[]> {
  // Firestore doesn't support full-text search, so we fetch recent messages and filter client-side
  const result = await querySubcollection<ChatMessage>(
    Collections.CHAT_ROOMS,
    roomId,
    Collections.CHAT_MESSAGES,
    [orderBy('createdAt', 'desc')],
    500
  );
  const lowerKeyword = keyword.toLowerCase();
  return result.items.filter((m) => {
    if (senderUid && m.senderUid !== senderUid) return false;
    if (keyword) return m.content.toLowerCase().includes(lowerKeyword);
    return true;
  });
}

// ─── Notification preferences ───

export async function getNotificationPref(
  uid: string,
  roomId: string
): Promise<ChatNotificationPref | null> {
  const id = `${uid}_${roomId}`;
  return getDocument<ChatNotificationPref>(Collections.CHAT_NOTIFICATION_PREFS, id);
}

export async function setNotificationPref(
  uid: string,
  roomId: string,
  muted: boolean
): Promise<void> {
  const id = `${uid}_${roomId}`;
  await setDocument(Collections.CHAT_NOTIFICATION_PREFS, id, {
    uid,
    roomId,
    muted,
  });
}

// ─── Invite helpers ───

export async function getInvitableUsers(
  uid: string,
  roomId: string
): Promise<User[]> {
  const [mutualFollows, chatRooms, room] = await Promise.all([
    getMutualFollows(uid),
    getChatRooms(uid),
    getChatRoom(roomId),
  ]);

  const existingMembers = new Set(room?.members ?? []);

  // Extract DM partner UIDs from active DM rooms
  const dmPartnerUids = new Set(
    chatRooms
      .filter((r) => r.type === 'dm')
      .flatMap((r) => r.members.filter((m) => m !== uid))
  );

  // Union: mutual follows + DM partners, deduplicated
  const userMap = new Map<string, User>();
  for (const u of mutualFollows) {
    if (!existingMembers.has(u.uid)) {
      userMap.set(u.uid, u);
    }
  }

  // For DM partners not already in the map, fetch their User docs
  const missingUids = [...dmPartnerUids].filter(
    (partnerUid) => !userMap.has(partnerUid) && !existingMembers.has(partnerUid)
  );
  for (const partnerUid of missingUids) {
    const user = await getDocument<User>(Collections.USERS, partnerUid);
    if (user) userMap.set(partnerUid, user);
  }

  return [...userMap.values()];
}

// ─── Typing indicator ───

export async function setTypingStatus(
  roomId: string,
  uid: string,
  isTyping: boolean
): Promise<void> {
  await updateDocument(Collections.CHAT_ROOMS, roomId, {
    typingUsers: isTyping ? arrayUnion(uid) : arrayRemove(uid),
  });
}

export function subscribeToTypingStatus(
  roomId: string,
  callback: (typingUsers: string[]) => void
): Unsubscribe {
  const docRef = doc(db, Collections.CHAT_ROOMS, roomId);
  return onSnapshot(
    docRef,
    (snap) => {
      const data = snap.data();
      callback(data?.typingUsers ?? []);
    },
    silenceChatErrors,
  );
}

// ─── Read receipts ───

export async function markMessagesAsRead(
  roomId: string,
  messageIds: string[],
  uid: string
): Promise<void> {
  for (const msgId of messageIds) {
    await updateDocument(
      `${Collections.CHAT_ROOMS}/${roomId}/${Collections.CHAT_MESSAGES}`,
      msgId,
      { readBy: arrayUnion(uid) }
    );
  }
}
