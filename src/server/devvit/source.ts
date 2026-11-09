// Which subreddit is the source of the image pool: r/MTGCardBelcher, unless
// the sourceSubreddit setting names a test subreddit.

import { reddit, settings } from '@devvit/web/server';

import { SOURCE_SUBREDDIT_SETTING } from '../config';
import { DEFAULT_SOURCE, DEFAULT_SOURCE_SUBREDDIT, flairsFromTemplates, sameSubreddit, type Source } from '../flair-rules';

/** The source subreddit's name. Cheap: only reads the setting. */
export async function sourceSubredditName(): Promise<string> {
  const setting = (await settings.get<string>(SOURCE_SUBREDDIT_SETTING))?.trim().replace(/^r\//, '');
  return setting || DEFAULT_SOURCE_SUBREDDIT;
}

/** The source subreddit and its flairs. A test subreddit's flairs are found by name. */
export async function sourceConfig(): Promise<Source> {
  const name = await sourceSubredditName();
  if (sameSubreddit(name, DEFAULT_SOURCE_SUBREDDIT)) return DEFAULT_SOURCE;
  const templates = await reddit.getPostFlairTemplates(name);
  return { subredditName: name, flairs: flairsFromTemplates(templates) };
}

/** Whether this install is on the source subreddit. */
export async function isOnSource(subredditName: string): Promise<boolean> {
  return sameSubreddit(subredditName, await sourceSubredditName());
}
