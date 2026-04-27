import { create } from 'zustand';
import { Tweet } from '@/types/tweet';
import { LoadingState } from '@/types/common';

interface TweetState {
  tweets: Tweet[];
  loadingState: LoadingState;
  lastDoc: unknown;
  hasMore: boolean;

  setTweets: (tweets: Tweet[]) => void;
  appendTweets: (tweets: Tweet[]) => void;
  prependTweet: (tweet: Tweet) => void;
  removeTweet: (tweetId: string) => void;
  updateTweet: (tweetId: string, updates: Partial<Tweet>) => void;
  setLoadingState: (state: LoadingState) => void;
  setLastDoc: (doc: unknown) => void;
  setHasMore: (hasMore: boolean) => void;
  reset: () => void;
}

export const useTweetStore = create<TweetState>((set) => ({
  tweets: [],
  loadingState: 'idle',
  lastDoc: null,
  hasMore: true,

  setTweets: (tweets) => set({ tweets }),
  appendTweets: (newTweets) =>
    set((state) => ({ tweets: [...state.tweets, ...newTweets] })),
  prependTweet: (tweet) =>
    set((state) => ({ tweets: [tweet, ...state.tweets] })),
  removeTweet: (tweetId) =>
    set((state) => ({ tweets: state.tweets.filter((t) => t.id !== tweetId) })),
  updateTweet: (tweetId, updates) =>
    set((state) => ({
      tweets: state.tweets.map((t) =>
        t.id === tweetId ? { ...t, ...updates } : t
      ),
    })),
  setLoadingState: (loadingState) => set({ loadingState }),
  setLastDoc: (lastDoc) => set({ lastDoc }),
  setHasMore: (hasMore) => set({ hasMore }),
  reset: () =>
    set({
      tweets: [],
      loadingState: 'idle',
      lastDoc: null,
      hasMore: true,
    }),
}));
