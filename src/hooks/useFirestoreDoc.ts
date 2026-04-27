import { useState, useEffect } from 'react';
import { subscribeToDocument } from '@/services/firebase/firestore';

export function useFirestoreDoc<T>(collectionName: string, docId: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToDocument<T>(collectionName, docId, (doc) => {
      setData(doc);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [collectionName, docId]);

  return { data, isLoading };
}
