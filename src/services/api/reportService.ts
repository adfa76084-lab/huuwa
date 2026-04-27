import { serverTimestamp } from 'firebase/firestore';
import { Collections } from '@/constants/firestore';
import { getCollectionRef, doc } from '@/services/firebase/firestore';
import { setDocument } from '@/services/firebase/firestore';

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

export async function reportContent(
  reporterUid: string,
  targetType: 'tweet' | 'thread' | 'user' | 'message',
  targetId: string,
  reason: ReportReason,
  description: string
): Promise<void> {
  const reportRef = doc(getCollectionRef(Collections.REPORTS));
  await setDocument(Collections.REPORTS, reportRef.id, {
    reporterUid,
    targetType,
    targetId,
    reason,
    description,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}
