import { runTransaction, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import {
  getDocument,
  setDocument,
  getCollectionRef,
} from '@/services/firebase/firestore';
import { Collections } from '@/constants/firestore';
import { Poll, PollOption } from '@/types/thread';
import { serverTimestamp } from 'firebase/firestore';
import { doc } from 'firebase/firestore';

export async function createPoll(
  uid: string,
  question: string,
  optionTexts: string[]
): Promise<Poll> {
  const pollRef = doc(getCollectionRef(Collections.POLLS));

  const options: PollOption[] = optionTexts.map((text, i) => ({
    id: `opt_${i}`,
    text,
    votes: 0,
  }));

  const pollData = {
    question,
    options,
    totalVotes: 0,
    voterUids: {},
    createdByUid: uid,
    createdAt: serverTimestamp(),
  };

  await setDocument(Collections.POLLS, pollRef.id, pollData);

  return { id: pollRef.id, ...pollData } as unknown as Poll;
}

export async function getPoll(pollId: string): Promise<Poll | null> {
  return getDocument<Poll>(Collections.POLLS, pollId);
}

export async function votePoll(
  pollId: string,
  optionId: string,
  uid: string,
  previousOptionId?: string
): Promise<void> {
  const pollDocRef = firestoreDoc(db, Collections.POLLS, pollId);

  await runTransaction(db, async (transaction) => {
    const pollSnap = await transaction.get(pollDocRef);
    if (!pollSnap.exists()) throw new Error('Poll not found');

    const data = pollSnap.data();
    const options: PollOption[] = [...data.options];
    const voterUids: Record<string, string> = { ...data.voterUids };
    let totalVotes: number = data.totalVotes;

    // Remove previous vote if changing
    if (previousOptionId && voterUids[uid] === previousOptionId) {
      const prevIdx = options.findIndex((o) => o.id === previousOptionId);
      if (prevIdx !== -1) {
        options[prevIdx] = { ...options[prevIdx], votes: options[prevIdx].votes - 1 };
        totalVotes -= 1;
      }
    }

    // Add new vote
    const newIdx = options.findIndex((o) => o.id === optionId);
    if (newIdx === -1) throw new Error('Option not found');
    options[newIdx] = { ...options[newIdx], votes: options[newIdx].votes + 1 };
    totalVotes += 1;
    voterUids[uid] = optionId;

    transaction.update(pollDocRef, { options, totalVotes, voterUids });
  });
}
