import { serverTimestamp, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { ChatEvent } from '@/types/chat';
import { UserProfile } from '@/types/user';
import { Collections } from '@/constants/firestore';
import {
  setDocument,
  deleteDocument,
  updateDocument,
  querySubcollection,
  getSubcollectionRef,
  orderBy,
  doc,
} from '@/services/firebase/firestore';

export async function getEvents(roomId: string): Promise<ChatEvent[]> {
  const result = await querySubcollection<ChatEvent>(
    Collections.CHAT_ROOMS,
    roomId,
    Collections.CHAT_EVENTS,
    [orderBy('date', 'asc')],
    100
  );
  return result.items;
}

export interface CreateEventForm {
  title: string;
  description: string;
  date: Date;
  endDate: Date | null;
  allDay: boolean;
  location: string | null;
  rsvpEnabled: boolean;
}

export async function createEvent(
  roomId: string,
  uid: string,
  userProfile: UserProfile,
  form: CreateEventForm
): Promise<ChatEvent> {
  const eventRef = doc(
    getSubcollectionRef(Collections.CHAT_ROOMS, roomId, Collections.CHAT_EVENTS)
  );

  const eventData = {
    roomId,
    title: form.title,
    description: form.description,
    date: Timestamp.fromDate(form.date),
    endDate: form.endDate ? Timestamp.fromDate(form.endDate) : null,
    allDay: form.allDay,
    location: form.location,
    author: userProfile,
    authorUid: uid,
    attendees: [uid],
    rsvpEnabled: form.rsvpEnabled,
    createdAt: serverTimestamp(),
  };

  await setDocument(
    `${Collections.CHAT_ROOMS}/${roomId}/${Collections.CHAT_EVENTS}`,
    eventRef.id,
    eventData
  );

  return { id: eventRef.id, ...eventData } as unknown as ChatEvent;
}

export async function deleteEvent(roomId: string, eventId: string): Promise<void> {
  await deleteDocument(
    `${Collections.CHAT_ROOMS}/${roomId}/${Collections.CHAT_EVENTS}`,
    eventId
  );
}

export async function toggleAttendance(
  roomId: string,
  eventId: string,
  uid: string,
  isAttending: boolean
): Promise<void> {
  const path = `${Collections.CHAT_ROOMS}/${roomId}/${Collections.CHAT_EVENTS}`;
  if (isAttending) {
    await updateDocument(path, eventId, { attendees: arrayRemove(uid) });
  } else {
    await updateDocument(path, eventId, { attendees: arrayUnion(uid) });
  }
}
