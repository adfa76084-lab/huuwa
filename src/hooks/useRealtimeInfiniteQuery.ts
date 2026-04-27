import { useState, useEffect, useCallback, useRef } from 'react';
import { LoadingState, PaginatedResult } from '@/types/common';
import { DocumentSnapshot } from 'firebase/firestore';

interface UseRealtimeInfiniteQueryOptions<T> {
  subscribeFn: (callback: (items: T[]) => void) => () => void;
  loadMoreFn: (lastDoc?: DocumentSnapshot) => Promise<PaginatedResult<T>>;
}

export function useRealtimeInfiniteQuery<T>({
  subscribeFn,
  loadMoreFn,
}: UseRealtimeInfiniteQueryOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastDocRef = useRef<DocumentSnapshot | undefined>(undefined);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    setLoadingState('loading');
    initialLoadDone.current = false;

    const unsubscribe = subscribeFn((newItems) => {
      setItems(newItems);
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        setLoadingState('idle');
      }
    });

    return unsubscribe;
  }, [subscribeFn]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loadingState === 'loadingMore') return;
    setLoadingState('loadingMore');
    try {
      const result = await loadMoreFn(lastDocRef.current);
      setItems((prev) => [...prev, ...result.items]);
      lastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
      setLoadingState('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
      setLoadingState('error');
    }
  }, [loadMoreFn, hasMore, loadingState]);

  const refresh = useCallback(async () => {
    setLoadingState('refreshing');
    lastDocRef.current = undefined;
    try {
      const result = await loadMoreFn(undefined);
      setItems(result.items);
      lastDocRef.current = result.lastDoc as DocumentSnapshot | undefined;
      setHasMore(result.hasMore);
      setLoadingState('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh');
      setLoadingState('error');
    }
  }, [loadMoreFn]);

  return {
    items,
    setItems,
    loadingState,
    hasMore,
    error,
    fetchMore,
    refresh,
    isLoading: loadingState === 'loading',
    isRefreshing: loadingState === 'refreshing',
    isLoadingMore: loadingState === 'loadingMore',
    isError: loadingState === 'error',
  };
}
