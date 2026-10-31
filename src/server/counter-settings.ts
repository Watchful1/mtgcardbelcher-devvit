import type { Collectible } from './data/collectibles';

// Global settings (set with `devvit settings set <key>`) naming the Reddit
// comment whose body holds each collectible's collector number.
export const COUNTER_SETTINGS: Record<Collectible['id'], string> = {
  dreadmaw: 'dreadmawCounterCommentId',
  stormCrow: 'stormCrowCounterCommentId',
  negate: 'negateCounterCommentId',
};
