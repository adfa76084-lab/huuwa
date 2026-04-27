import { useState, useCallback, useRef } from 'react';
import { PaginatedResult, LoadingState } from '@/types/common';
import { DocumentSnapshot } from 'firebase/firestore';

interface UseInfiniteQueryOptions<T> {
  queryFn: (lastDoc?: DocumentSnapshot) => Promise<PaginatedResult<T>>;
}

export function useInfiniteQuery<T>({ queryFn }: UseInfiniteQueryOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<DocumentSnapshot | undefined>(undefined);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const fetchInitial = useCallback(async () => {
    setLoadingState('loading');
    try {
      lastDocRef.current = undefined;
      const result = await queryFnRef.current(undefined);
      setItems(result.items);
      lastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
      setLoadingState('idle');
    } catch {
      setLoadingState('error');
    }
  }, []);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loadingState === 'loadingMore') return;
    setLoadingState('loadingMore');
    try {
      const result = await queryFnRef.current(lastDocRef.current);
      setItems((prev) => [...prev, ...result.items]);
      lastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
      setLoadingState('idle');
    } catch {
      setLoadingState('error');
    }
  }, [hasMore, loadingState]);

  const refresh = useCallback(async () => {
    setLoadingState('refreshing');
    try {
      lastDocRef.current = undefined;
      const result = await queryFnRef.current(undefined);
      setItems(result.items);
      lastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
      setLoadingState('idle');
    } catch {
      setLoadingState('error');
    }
  }, []);

  return {
    items,
    setItems,
    loadingState,
    hasMore,
    fetchInitial,
    fetchMore,
    refresh,
    isLoading: loadingState === 'loading',
    isRefreshing: loadingState === 'refreshing',
    isLoadingMore: loadingState === 'loadingMore',
    isError: loadingState === 'error',
  };
}
