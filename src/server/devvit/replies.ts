// Answering calls, wired to Devvit: the real ports `respond` takes.

import { reddit } from '@devvit/web/server';

import { asParentId } from '../ids';
import { RateLimitedError, withRateLimitRetry } from '../rate-limit';
import type { RespondPorts } from '../respond';
import { lookupCards, randomFlavour } from '../scryfall';
import type { Store } from '../store';
import { nextCollectorNumber } from './counters';
import { appUsername, store } from './platform';

/**
 * Posts a reply, unless Reddit's rate limit is in force. A limit too long to
 * wait out is remembered, so later replies skip straight past it until it ends.
 */
async function postReply(db: Store, parentId: string, text: string): Promise<string> {
  const until = await db.rateLimitedUntil();
  if (until !== undefined) throw new RateLimitedError(until);
  try {
    const comment = await withRateLimitRetry(() => reddit.submitComment({ id: asParentId(parentId), text }));
    return comment.id;
  } catch (error) {
    if (error instanceof RateLimitedError) await db.setRateLimitedUntil(error.untilMs);
    throw error;
  }
}

export async function respondPorts(): Promise<RespondPorts> {
  const db = store();
  return {
    store: db,
    appUsername: await appUsername(),
    lookupCards: (calls) => lookupCards(calls),
    randomFlavour: () => randomFlavour(),
    nextCollectorNumber,
    reply: (parentId, text) => postReply(db, parentId, text),
    rng: Math.random,
    now: Date.now,
  };
}
