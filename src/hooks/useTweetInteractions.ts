import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from './useAuth';
import { toggleLike, isLiked } from '@/services/api/likeService';
import { toggleBookmark, isBookmarked } from '@/services/api/bookmarkService';

function promptLogin() {
  Alert.alert('ログインが必要です', 'この操作にはログインが必要です', [
    { text: 'キャンセル', style: 'cancel' },
    { text: 'ログイン', onPress: () => router.push('/(auth)/login') },
  ]);
}

export function useTweetInteractions() {
  const { user } = useAuth();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const checkedRef = useRef<Set<string>>(new Set());
  const likedRef = useRef<Set<string>>(likedIds);
  likedRef.current = likedIds;
  const bookmarkedRef = useRef<Set<string>>(bookmarkedIds);
  bookmarkedRef.current = bookmarkedIds;

  // Initial state at fetch time, used to compute count deltas.
  const initialLikedRef = useRef<Set<string>>(new Set());
  const initialBookmarkedRef = useRef<Set<string>>(new Set());

  const checkTweets = useCallback(
    async (tweetIds: string[]) => {
      if (!user || tweetIds.length === 0) return;
      const unchecked = tweetIds.filter((id) => !checkedRef.current.has(id));
      if (unchecked.length === 0) return;

      unchecked.forEach((id) => checkedRef.current.add(id));

      const [likeResults, bookmarkResults] = await Promise.all([
        Promise.all(
          unchecked.map((id) =>
            isLiked(user.uid, id).then((v) => [id, v] as const),
          ),
        ),
        Promise.all(
          unchecked.map((id) =>
            isBookmarked(user.uid, id).then((v) => [id, v] as const),
          ),
        ),
      ]);

      const newLiked = likeResults.filter(([, v]) => v).map(([id]) => id);
      const newBookmarked = bookmarkResults.filter(([, v]) => v).map(([id]) => id);

      newLiked.forEach((id) => initialLikedRef.current.add(id));
      newBookmarked.forEach((id) => initialBookmarkedRef.current.add(id));

      if (newLiked.length > 0) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          newLiked.forEach((id) => next.add(id));
          return next;
        });
      }
      if (newBookmarked.length > 0) {
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          newBookmarked.forEach((id) => next.add(id));
          return next;
        });
      }
    },
    [user],
  );

  const handleLike = useCallback(
    async (tweetId: string) => {
      if (!user) {
        promptLogin();
        return;
      }
      const wasLiked = likedRef.current.has(tweetId);
      // Optimistic update
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(tweetId);
        else next.add(tweetId);
        return next;
      });
      try {
        await toggleLike(user.uid, tweetId);
      } catch {
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(tweetId);
          else next.delete(tweetId);
          return next;
        });
      }
    },
    [user],
  );

  const handleBookmark = useCallback(
    async (tweetId: string) => {
      if (!user) {
        promptLogin();
        return;
      }
      const wasBookmarked = bookmarkedRef.current.has(tweetId);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.delete(tweetId);
        else next.add(tweetId);
        return next;
      });
      try {
        await toggleBookmark(user.uid, tweetId);
      } catch {
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          if (wasBookmarked) next.add(tweetId);
          else next.delete(tweetId);
          return next;
        });
      }
    },
    [user],
  );

  // Delta to add to the fetched count for accurate live display.
  const likeDelta = useCallback(
    (tweetId: string) => {
      const isOriginal = initialLikedRef.current.has(tweetId);
      const isNow = likedIds.has(tweetId);
      return (isNow ? 1 : 0) - (isOriginal ? 1 : 0);
    },
    [likedIds],
  );

  const bookmarkDelta = useCallback(
    (tweetId: string) => {
      const isOriginal = initialBookmarkedRef.current.has(tweetId);
      const isNow = bookmarkedIds.has(tweetId);
      return (isNow ? 1 : 0) - (isOriginal ? 1 : 0);
    },
    [bookmarkedIds],
  );

  return {
    likedIds,
    bookmarkedIds,
    checkTweets,
    handleLike,
    handleBookmark,
    likeDelta,
    bookmarkDelta,
  };
}
