import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from './useAuth';
import { toggleThreadLike, isThreadLiked } from '@/services/api/threadLikeService';

function promptLogin() {
  Alert.alert('ログインが必要です', 'この操作にはログインが必要です', [
    { text: 'キャンセル', style: 'cancel' },
    { text: 'ログイン', onPress: () => router.push('/(auth)/login') },
  ]);
}

export function useThreadLikes() {
  const { user } = useAuth();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const checkedRef = useRef<Set<string>>(new Set());
  const likedRef = useRef<Set<string>>(likedIds);
  likedRef.current = likedIds;
  const initialLikedRef = useRef<Set<string>>(new Set());

  const checkThreads = useCallback(
    async (threadIds: string[]) => {
      if (!user || threadIds.length === 0) return;
      const unchecked = threadIds.filter((id) => !checkedRef.current.has(id));
      if (unchecked.length === 0) return;

      unchecked.forEach((id) => checkedRef.current.add(id));

      const results = await Promise.all(
        unchecked.map((id) =>
          isThreadLiked(user.uid, id).then((v) => [id, v] as const),
        ),
      );

      const newLiked = results.filter(([, v]) => v).map(([id]) => id);
      newLiked.forEach((id) => initialLikedRef.current.add(id));
      if (newLiked.length > 0) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          newLiked.forEach((id) => next.add(id));
          return next;
        });
      }
    },
    [user],
  );

  const handleLike = useCallback(
    async (threadId: string) => {
      if (!user) {
        promptLogin();
        return;
      }
      const wasLiked = likedRef.current.has(threadId);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(threadId);
        else next.add(threadId);
        return next;
      });
      try {
        await toggleThreadLike(user.uid, threadId);
      } catch {
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(threadId);
          else next.delete(threadId);
          return next;
        });
      }
    },
    [user],
  );

  const likeDelta = useCallback(
    (threadId: string) => {
      const isOriginal = initialLikedRef.current.has(threadId);
      const isNow = likedIds.has(threadId);
      return (isNow ? 1 : 0) - (isOriginal ? 1 : 0);
    },
    [likedIds],
  );

  return { likedIds, checkThreads, handleLike, likeDelta };
}
