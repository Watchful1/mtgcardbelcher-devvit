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

// Global setting: while on (the default), curation logs the flair changes it
// would make and makes none. It's a string because `devvit settings set` stores
// text, and Devvit reads any text in a boolean setting, even "false", as true.
export const CURATION_DRY_RUN_SETTING = 'curationDryRun';

/** Only "false" turns dry run off, so curation can't change flairs until someone asks for it. */
export function isDryRun(setting: unknown): boolean {
  return String(setting).trim().toLowerCase() !== 'false';
}

/** A collector number setting, or `fallback` if it isn't a whole number of 0 or more. */
export function collectorNumberOr(setting: unknown, fallback: number): number {
  return typeof setting === 'number' && Number.isSafeInteger(setting) && setting >= 0 ? setting : fallback;
}
