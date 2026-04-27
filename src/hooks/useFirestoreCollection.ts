import { useState, useEffect } from 'react';
import { QueryConstraint } from 'firebase/firestore';
import { subscribeToQuery } from '@/services/firebase/firestore';

export function useFirestoreCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  enabled: boolean = true
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToQuery<T>(collectionName, constraints, (items) => {
      setData(items);
      setIsLoading(false);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, enabled]);

  return { data, isLoading };
}
