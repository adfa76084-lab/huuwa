import { Timestamp } from 'firebase/firestore';

export type FirestoreTimestamp = Timestamp;

export interface PaginatedResult<T> {
  items: T[];
  lastDoc: unknown;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
}

export type LoadingState = 'idle' | 'loading' | 'refreshing' | 'loadingMore' | 'error';
