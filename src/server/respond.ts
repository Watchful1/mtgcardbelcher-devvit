// Answering one comment or post: everything between a trigger and the reply.

import { findCalls, skipReason, type CallItem } from './calls';
import {
  COOLDOWN_MAX_SECONDS,
  COOLDOWN_MIN_SECONDS,
  firstCalledCollectible,
  renderArt,
  type Collectible,
} from './data/collectibles';
import { buildReply, needsCardData } from './reply';
import type { Store } from './store';

export interface CallTarget extends CallItem {
  /** t1_ or t3_ id to reply to. */
  id: string;
  body: string;
}

export interface RespondPorts {
  store: Store;
  appUsername: string;
  lookupCards: (calls: string[]) => Promise<Map<string, string[]>>;
  randomFlavour: () => Promise<string | undefined>;
  /** Adds one to a collectible's shared collector number and returns it, or undefined if it isn't set up. */
  nextCollectorNumber: (collectible: Collectible) => Promise<number | undefined>;
  /** Posts a reply and returns its comment id. */
  reply: (parentId: string, text: string) => Promise<string>;
  rng: () => number;
  now: () => number;
}

export type RespondOutcome = 'skipped' | 'duplicate' | 'art' | 'reply';

export async function respond(target: CallTarget, ports: RespondPorts): Promise<RespondOutcome> {
  const calls = findCalls(target.body);
  const skip = skipReason(target, calls, ports.appUsername, ports.now());
  if (skip) {
    // The app's own replies come through here too, so only unusual skips are logged.
    if (skip === 'too-old' || skip === 'excluded-thread') console.log(`Skipping ${target.id}: ${skip}`);
    return 'skipped';
  }
  if (!(await ports.store.claimReply(target.id))) return 'duplicate';

  console.log(`Answering ${target.id} (${calls.join(', ')})`);

  const collectible = firstCalledCollectible(calls);
  if (collectible) {
    const art = await collectibleArt(collectible, ports);
    if (art) {
      try {
        const replyId = await ports.reply(target.id, art);
        console.log(`${collectible.name} art delivered on ${target.id} as ${replyId}`);
      } catch (error) {
        // Nobody got the art, so the next call can win it. The collector number stays used.
        await ports.store.endCooldown(collectible.id);
        throw error;
      }
      return 'art';
    }
  }

  const needsCards = needsCardData(calls);
  const [pool, cards, flavour] = await Promise.all([
    needsCards ? ports.store.pool() : [],
    needsCards ? ports.lookupCards(calls) : new Map<string, string[]>(),
    needsCards && calls.length === 1 ? ports.randomFlavour() : undefined,
  ]);

  const text = buildReply({
    calls,
    pool,
    rng: ports.rng,
    cardImages: (call) => cards.get(call.toLowerCase()) ?? [],
    flavour,
  });
  console.log(`Replied to ${target.id} as ${await ports.reply(target.id, text)}`);
  return 'reply';
}

/**
 * The art reply, if the collectible's cooldown is open. Claims the cooldown
 * first, so two calls at once can't both win, then takes the next collector
 * number, both before the reply is posted. Undefined if the cooldown is
 * running or no collector number could be taken.
 */
async function collectibleArt(collectible: Collectible, ports: RespondPorts): Promise<string | undefined> {
  const span = COOLDOWN_MAX_SECONDS - COOLDOWN_MIN_SECONDS;
  const seconds = COOLDOWN_MIN_SECONDS + Math.floor(ports.rng() * (span + 1));
  if (!(await ports.store.claimCooldown(collectible.id, seconds))) return undefined;
  const number = await ports.nextCollectorNumber(collectible);
  if (number === undefined) {
    // No art went out, so the next call can try again.
    await ports.store.endCooldown(collectible.id);
    return undefined;
  }
  return renderArt(collectible, number);
}
