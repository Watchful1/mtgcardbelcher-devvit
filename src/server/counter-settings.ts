import type { Collectible } from './data/collectibles';

// Global settings (set with `devvit settings set <key>`) naming the Reddit
// comment whose body holds each collectible's collector number.
export const COUNTER_SETTINGS: Record<Collectible['id'], string> = {
  dreadmaw: 'dreadmawCounterCommentId',
  stormCrow: 'stormCrowCounterCommentId',
  negate: 'negateCounterCommentId',
};

// The PRAW bot's counter comments, owned by u/MTGCardBelcher. The app can read
// them but can't edit them until it runs as that account; new counter comments
// start from their numbers.
export const PRAW_COUNTER_COMMENTS: Record<Collectible['id'], string> = {
  dreadmaw: 't1_me0tbmp',
  stormCrow: 't1_mlnqxci',
  negate: 't1_nn1eyru',
};
