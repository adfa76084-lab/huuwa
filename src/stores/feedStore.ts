import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tweet } from '@/types/tweet';
import { Thread } from '@/types/thread';

const MAX_VIEWED = 200;

interface FeedState {
  recentlyViewedTweetIds: string[];
  recentlyViewedThreadIds: string[];
  hiddenTweetIds: string[];
  hiddenThreadIds: string[];

  // Optimistic posts shown at the top of the feed until the next refresh.
  // Lets the UI feel instant while the network call runs in the background.
  optimisticTweets: Tweet[];
  optimisticThreads: Thread[];

  markTweetViewed: (id: string) => void;
  markThreadViewed: (id: string) => void;
  hideTweet: (id: string) => void;
  hideThread: (id: string) => void;

  addOptimisticTweet: (tweet: Tweet) => void;
  removeOptimisticTweet: (id: string) => void;
  clearOptimisticTweets: () => void;

  addOptimisticThread: (thread: Thread) => void;
  removeOptimisticThread: (id: string) => void;
  clearOptimisticThreads: () => void;
}

export const useFeedStore = create<FeedState>()(
  persist(
    (set) => ({
      recentlyViewedTweetIds: [],
      recentlyViewedThreadIds: [],
      hiddenTweetIds: [],
      hiddenThreadIds: [],
      optimisticTweets: [],
      optimisticThreads: [],
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

      addOptimisticTweet: (tweet) =>
        set((state) => ({
          optimisticTweets: [
            tweet,
            ...state.optimisticTweets.filter((t) => t.id !== tweet.id),
          ],
        })),
      removeOptimisticTweet: (id) =>
        set((state) => ({
          optimisticTweets: state.optimisticTweets.filter((t) => t.id !== id),
        })),
      clearOptimisticTweets: () => set({ optimisticTweets: [] }),

      addOptimisticThread: (thread) =>
        set((state) => ({
          optimisticThreads: [
            thread,
            ...state.optimisticThreads.filter((t) => t.id !== thread.id),
          ],
        })),
      removeOptimisticThread: (id) =>
        set((state) => ({
          optimisticThreads: state.optimisticThreads.filter((t) => t.id !== id),
        })),
      clearOptimisticThreads: () => set({ optimisticThreads: [] }),
    }),
    {
      name: 'huuwa-feed-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist in-flight optimistic posts — they should disappear on
      // app restart since the network call is no longer running.
      partialize: (state) => ({
        recentlyViewedTweetIds: state.recentlyViewedTweetIds,
        recentlyViewedThreadIds: state.recentlyViewedThreadIds,
        hiddenTweetIds: state.hiddenTweetIds,
        hiddenThreadIds: state.hiddenThreadIds,
      }),
    },
  ),
);
