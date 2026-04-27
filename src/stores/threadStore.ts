import { create } from 'zustand';
import { Thread, ThreadReply } from '@/types/thread';
import { LoadingState } from '@/types/common';

interface ThreadState {
  threads: Thread[];
  loadingState: LoadingState;
  lastDoc: unknown;
  hasMore: boolean;

  setThreads: (threads: Thread[]) => void;
  appendThreads: (threads: Thread[]) => void;
  prependThread: (thread: Thread) => void;
  removeThread: (threadId: string) => void;
  setLoadingState: (state: LoadingState) => void;
  setLastDoc: (doc: unknown) => void;
  setHasMore: (hasMore: boolean) => void;
  reset: () => void;
}

export const useThreadStore = create<ThreadState>((set) => ({
  threads: [],
  loadingState: 'idle',
  lastDoc: null,
  hasMore: true,

  setThreads: (threads) => set({ threads }),
  appendThreads: (newThreads) =>
    set((state) => ({ threads: [...state.threads, ...newThreads] })),
  prependThread: (thread) =>
    set((state) => ({ threads: [thread, ...state.threads] })),
  removeThread: (threadId) =>
    set((state) => ({ threads: state.threads.filter((t) => t.id !== threadId) })),
  setLoadingState: (loadingState) => set({ loadingState }),
  setLastDoc: (lastDoc) => set({ lastDoc }),
  setHasMore: (hasMore) => set({ hasMore }),
  reset: () =>
    set({
      threads: [],
      loadingState: 'idle',
      lastDoc: null,
      hasMore: true,
    }),
}));
