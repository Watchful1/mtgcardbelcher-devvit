// Collector numbers for the collectible art, kept in Reddit comments so every
// install draws from one sequence.

import { reddit, settings } from '@devvit/web/server';

import { COUNTER_SETTINGS, PRAW_COUNTER_COMMENTS } from '../config';
import { COLLECTIBLES, type Collectible } from '../data/collectibles';
import { asCommentId, asPostId } from '../ids';
import { withRateLimitRetry } from '../rate-limit';

/**
 * Adds one to the number in a collectible's counter comment and returns it,
 * or undefined if no counter is set up or it can't be updated.
 */
export async function nextCollectorNumber(collectible: Collectible): Promise<number | undefined> {
  const setting = (await settings.get<string>(COUNTER_SETTINGS[collectible.id]))?.trim();
  if (!setting) {
    console.log(`${collectible.name} art is off: ${COUNTER_SETTINGS[collectible.id]} isn't set`);
    return undefined;
  }
  const commentId = asCommentId(setting);
  try {
    const comment = await reddit.getCommentById(commentId);
    const current = Number.parseInt(comment.body.trim(), 10);
    if (Number.isNaN(current)) {
      console.error(`${collectible.name} counter comment ${commentId} doesn't hold a number: "${comment.body}"`);
      return undefined;
    }
    await withRateLimitRetry(() => comment.edit({ text: String(current + 1) }));
    return current + 1;
  } catch (error) {
    console.error(`${collectible.name} counter comment ${commentId} failed: ${String(error)}`);
    return undefined;
  }
}

/**
 * Posts a counter comment per collectible under `postId`, each starting at the
 * PRAW bot's current number (0 if that can't be read), and logs their ids.
 */
export async function createCounterComments(postId: string): Promise<void> {
  for (const collectible of COLLECTIBLES) {
    let start = 0;
    try {
      const body = (await reddit.getCommentById(asCommentId(PRAW_COUNTER_COMMENTS[collectible.id]))).body;
      start = Number.parseInt(body.trim(), 10) || 0;
    } catch (error) {
      console.error(`Reading the PRAW ${collectible.name} counter failed, starting at 0: ${String(error)}`);
    }
    const comment = await withRateLimitRetry(() =>
      reddit.submitComment({ id: asPostId(postId), text: String(start) }),
    );
    console.log(
      `Counter comment for ${collectible.name}: ${comment.id} (starts at ${start}). ` +
        `Set it with: npx devvit settings set ${COUNTER_SETTINGS[collectible.id]}`,
    );
  }
}
