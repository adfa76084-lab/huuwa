import { create } from 'zustand';
import { ShortVideo } from '@/types/short';
import { LoadingState } from '@/types/common';

interface ShortState {
  shorts: ShortVideo[];
  loadingState: LoadingState;
  lastDoc: unknown;
  hasMore: boolean;

  setShorts: (shorts: ShortVideo[]) => void;
  appendShorts: (shorts: ShortVideo[]) => void;
  prependShort: (short: ShortVideo) => void;
  removeShort: (shortId: string) => void;
  updateShort: (shortId: string, updates: Partial<ShortVideo>) => void;
  setLoadingState: (state: LoadingState) => void;
  setLastDoc: (doc: unknown) => void;
  setHasMore: (hasMore: boolean) => void;
  reset: () => void;
}

export const useShortStore = create<ShortState>((set) => ({
  shorts: [],
  loadingState: 'idle',
  lastDoc: null,
  hasMore: true,

  setShorts: (shorts) => set({ shorts }),
  appendShorts: (newShorts) =>
    set((state) => ({ shorts: [...state.shorts, ...newShorts] })),
  prependShort: (short) =>
    set((state) => ({ shorts: [short, ...state.shorts] })),
  removeShort: (shortId) =>
    set((state) => ({ shorts: state.shorts.filter((s) => s.id !== shortId) })),
  updateShort: (shortId, updates) =>
    set((state) => ({
      shorts: state.shorts.map((s) =>
        s.id === shortId ? { ...s, ...updates } : s
      ),
    })),
  setLoadingState: (loadingState) => set({ loadingState }),
  setLastDoc: (lastDoc) => set({ lastDoc }),
  setHasMore: (hasMore) => set({ hasMore }),
  reset: () =>
    set({
      shorts: [],
      loadingState: 'idle',
      lastDoc: null,
      hasMore: true,
    }),
}));
