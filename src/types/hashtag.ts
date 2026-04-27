import { FirestoreTimestamp } from './common';

export interface Hashtag {
  id: string; // same as name
  name: string;
  postCount: number;
  createdAt: FirestoreTimestamp;
}
