// Names that devvit.json declares and the code refers to. Kept free of Devvit
// imports so tests can check them against devvit.json.

import type { Collectible } from './data/collectibles';

// Subreddit settings, one per collectible, that moderators can change in the
// app's install settings: the last collector number delivered on that
// subreddit. The next win gets a higher number than both this and the count
// the app keeps. Their defaults in devvit.json are the original bot's numbers.
export const COLLECTOR_NUMBER_SETTINGS: Record<Collectible['id'], string> = {
  dreadmaw: 'dreadmawCollectorNumber',
  stormCrow: 'stormCrowCollectorNumber',
  negate: 'negateCollectorNumber',
};

// Global setting: while true (the default), curation logs the flair changes it
// would make and makes none.
export const CURATION_DRY_RUN_SETTING = 'curationDryRun';
