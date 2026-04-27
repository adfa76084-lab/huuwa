import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_VIEWED = 200;

interface FeedState {
  recentlyViewedTweetIds: string[];
  recentlyViewedThreadIds: string[];
  hiddenTweetIds: string[];
  hiddenThreadIds: string[];
  markTweetViewed: (id: string) => void;
  markThreadViewed: (id: string) => void;
  hideTweet: (id: string) => void;
  hideThread: (id: string) => void;
}

export const useFeedStore = create<FeedState>()(
  persist(
    (set) => ({
      recentlyViewedTweetIds: [],
      recentlyViewedThreadIds: [],
      hiddenTweetIds: [],
      hiddenThreadIds: [],
      markTweetViewed: (id) =>
        set((state) => ({
          recentlyViewedTweetIds: [
            id,
            ...state.recentlyViewedTweetIds.filter((x) => x !== id),
          ].slice(0, MAX_VIEWED),
        })),
      markThreadViewed: (id) =>
        set((state) => ({
          recentlyViewedThreadIds: [
            id,
            ...state.recentlyViewedThreadIds.filter((x) => x !== id),
          ].slice(0, MAX_VIEWED),
        })),
      hideTweet: (id) =>
        set((state) => ({
          hiddenTweetIds: [
            id,
            ...state.hiddenTweetIds.filter((x) => x !== id),
          ].slice(0, 500),
        })),
      hideThread: (id) =>
        set((state) => ({
          hiddenThreadIds: [
            id,
            ...state.hiddenThreadIds.filter((x) => x !== id),
          ].slice(0, 500),
        })),
    }),
    {
      name: 'huuwa-feed-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
