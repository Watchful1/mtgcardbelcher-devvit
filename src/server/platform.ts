// The real Devvit implementations of the ports the logic modules take.

import { context, reddit, redis, settings } from '@devvit/web/server';

import { COUNTER_SETTINGS } from './counter-settings';
import type { Collectible } from './data/collectibles';
import type { RespondPorts } from './respond';
import { lookupCards, randomFlavour } from './scryfall';
import { Store, type RedisPort } from './store';

export function store(): Store {
  return new Store(redis as RedisPort);
}

let appUsername: string | undefined;

/** The app account's username, which the app must not reply to. */
async function getAppUsername(): Promise<string> {
  appUsername ??= (await reddit.getAppUser())?.username ?? context.appSlug;
  return appUsername;
}

/**
 * Adds one to the number in a collectible's counter comment. The comment is
 * shared by every install, so all subreddits draw from one sequence.
 */
async function nextCollectorNumber(collectible: Collectible): Promise<number | undefined> {
  const setting = (await settings.get<string>(COUNTER_SETTINGS[collectible.id]))?.trim();
  if (!setting) return undefined;
  const commentId = setting.startsWith('t1_') ? setting : `t1_${setting}`;
  try {
    const comment = await reddit.getCommentById(commentId as `t1_${string}`);
    const current = Number.parseInt(comment.body.trim(), 10);
    if (Number.isNaN(current)) {
      console.error(`${collectible.name} counter comment ${commentId} doesn't hold a number: "${comment.body}"`);
      return undefined;
    }
    await comment.edit({ text: String(current + 1) });
    return current + 1;
  } catch (error) {
    console.error(`${collectible.name} counter comment ${commentId} failed: ${String(error)}`);
    return undefined;
  }
}

export async function respondPorts(): Promise<RespondPorts> {
  return {
    store: store(),
    appUsername: await getAppUsername(),
    lookupCards: (calls) => lookupCards(calls),
    randomFlavour: () => randomFlavour(),
    nextCollectorNumber,
    reply: async (parentId, text) => {
      await reddit.submitComment({ id: parentId as `t1_${string}` | `t3_${string}`, text });
    },
    rng: Math.random,
    now: Date.now,
  };
}
