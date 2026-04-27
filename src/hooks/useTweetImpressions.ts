import { useRef, useCallback } from 'react';
import { ViewToken } from 'react-native';
import { useAuth } from './useAuth';
import { recordTweetImpression } from '@/services/api/tweetService';
import { Tweet } from '@/types/tweet';

/**
 * Hook that provides onViewableItemsChanged + viewabilityConfig props
 * for FlashList/FlatList to automatically record tweet impressions.
 */
export function useTweetImpressions() {
  const { user } = useAuth();

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!userRef.current) return;
      for (const vi of viewableItems) {
        if (!vi.isViewable || !vi.item) continue;
        // Handle both plain Tweet and { kind: 'tweet', tweet: Tweet } feed item shapes
        const raw = vi.item as any;
        const tweetId: string | undefined = raw?.id ?? raw?.tweet?.id;
        if (tweetId) recordTweetImpression(userRef.current, tweetId);
      }
    },
  ).current;

  // Use a ref so the stable callback always reads the latest uid
  const userRef = useRef<string | null>(null);
  userRef.current = user?.uid ?? null;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000,
  }).current;

  return { onViewableItemsChanged, viewabilityConfig };
}
