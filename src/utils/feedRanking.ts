import { FirestoreTimestamp } from '@/types/common';

export interface Rankable {
  id: string;
  createdAt?: FirestoreTimestamp;
  likesCount?: number;
  bookmarksCount?: number;
  repliesCount?: number;
  viewsCount?: number;
  categoryId?: string | null;
  authorUid?: string;
}

interface RankOptions {
  recentlyViewedIds?: Set<string>;
  selectedCategoryIds?: string[];
  followingUids?: Set<string>;
  /** 0-1, how much to randomize; default 0.35 */
  randomness?: number;
}

function tsMs(ts: FirestoreTimestamp | undefined | null): number {
  if (!ts) return 0;
  if (typeof (ts as any).toMillis === 'function') return (ts as any).toMillis();
  if (typeof (ts as any).seconds === 'number') return (ts as any).seconds * 1000;
  return 0;
}

export function rankFeed<T extends Rankable>(items: T[], opts: RankOptions = {}): T[] {
  const now = Date.now();
  const randomness = Math.max(0, Math.min(1, opts.randomness ?? 0.35));
  const viewed = opts.recentlyViewedIds ?? new Set<string>();
  const categorySet = new Set(opts.selectedCategoryIds ?? []);
  const following = opts.followingUids ?? new Set<string>();

  const scored = items.map((item) => {
    const createdMs = tsMs(item.createdAt);
    const hoursOld = Math.max(1, (now - createdMs) / (1000 * 60 * 60));
    // Recency decays over time: fresh in last 24h, old after 1 week
    const recency = 1 / Math.log(hoursOld + 1.5);

    // Popularity from engagement (log to prevent outliers dominating)
    const engagement =
      (item.likesCount ?? 0) * 2 +
      (item.bookmarksCount ?? 0) * 3 +
      (item.repliesCount ?? 0) * 1.5 +
      (item.viewsCount ?? 0) * 0.05;
    const popularity = Math.log(engagement + 1);

    // Base score
    let score = recency * 2 + popularity;

    // Category match boost
    if (categorySet.size > 0 && item.categoryId && categorySet.has(item.categoryId)) {
      score *= 1.5;
    }

    // Following boost
    if (item.authorUid && following.has(item.authorUid)) {
      score *= 1.3;
    }

    // Recently viewed penalty (strong dampener)
    if (viewed.has(item.id)) {
      score *= 0.15;
    }

    // Randomness jitter — multiplicative to preserve top picks but shuffle ties
    const jitter = 1 - randomness + Math.random() * randomness * 2;
    score *= jitter;

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}
