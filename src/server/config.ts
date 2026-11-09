// Names that devvit.json declares and the code refers to. Kept free of Devvit
// imports so tests can check them against devvit.json.

import type { Collectible } from './data/collectibles';

// Global settings (set with `npx devvit settings set <key>`) naming the Reddit
// comment whose body holds each collectible's collector number.
export const COUNTER_SETTINGS: Record<Collectible['id'], string> = {
  dreadmaw: 'dreadmawCounterCommentId',
  stormCrow: 'stormCrowCounterCommentId',
  negate: 'negateCounterCommentId',
};

// The PRAW bot's counter comments, owned by u/MTGCardBelcher. The app can read
// them, but can edit them only once it runs as that account. New counter
// comments start from their numbers.
export const PRAW_COUNTER_COMMENTS: Record<Collectible['id'], string> = {
  dreadmaw: 't1_me0tbmp',
  stormCrow: 't1_mlnqxci',
  negate: 't1_nn1eyru',
};

// Global setting: while true (the default), curation logs the flair changes it
// would make and makes none.
export const CURATION_DRY_RUN_SETTING = 'curationDryRun';

// Global setting naming a test subreddit to use in place of r/MTGCardBelcher.
// Unset, blank or "MTGCardBelcher" means r/MTGCardBelcher.
export const SOURCE_SUBREDDIT_SETTING = 'sourceSubreddit';

// Scheduler task with no cron, run straight after a pool run that ran out of time.
export const CONTINUE_TASK = 'pool-tick-continue';
