// Building the reply text for an item's calls. Pure: randomness and Scryfall
// results are passed in.

import { highestPriorityCollectible } from './data/collectibles';
import { findRastamonCard, RASTAMON_BLANK_FLAVOUR, RASTAMON_HEADER, type RastamonCard } from './data/rastamon';
import {
  CREATURE_TYPES,
  creatureHeader,
  FOOTER,
  LINKLESS_REPLIES,
  REVEL_IN_RICHES_IMAGE,
  SPECIAL_HEADERS,
} from './data/replies';

export const MAX_CALLS = 8;
export const MAX_REPLY_LENGTH = 2400;

// Each reply rolls one of this many equally likely outcomes: 0 is a linkless
// reply, 1 a special header, anything else the normal creature header.
export const ROLL_OUTCOMES = 1002;

export interface ReplyInputs {
  calls: string[];
  /** Joke image URLs to pick from. Never empty: it always holds Jollyver. */
  pool: string[];
  /** Returns a number in [0, 1), like Math.random. */
  rng: () => number;
  /** Scryfall image URLs for a call: one per face, or none if it isn't a real card. */
  cardImages: (call: string) => string[];
  /** A random Scryfall flavour text, if one was fetched. */
  flavour: string | undefined;
}

interface ReplyParts {
  header: string;
  body: string;
  flavour: string;
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!;
}

function assemble(parts: ReplyParts): string {
  return `${parts.header}${parts.body}${parts.flavour}${FOOTER}`;
}

/**
 * Whether the reply for these calls has card lines, and so needs the image pool
 * and Scryfall. Waiting replies and the too-many-calls reply don't.
 */
export function needsCardData(calls: string[]): boolean {
  return calls.length <= MAX_CALLS && highestPriorityCollectible(calls) === undefined;
}

export function buildReply(inputs: ReplyInputs): string {
  const { calls } = inputs;

  if (calls.length > MAX_CALLS) {
    return assemble({
      header: 'No-one is home.\n\n',
      body: '<cue tumbleweed>\n\n',
      flavour: `*There are more than ${MAX_CALLS} queries! :(*\n\n`,
    });
  }

  const parts = buildParts(inputs);
  const reply = assemble(parts);
  if (reply.length <= MAX_REPLY_LENGTH) return reply;

  return assemble({
    header: 'No-one is home.\n\n',
    body: '<crickets>\n\n',
    flavour: `_The reply would be over ${MAX_REPLY_LENGTH} characters!!_\n\n`,
  });
}

function buildParts(inputs: ReplyInputs): ReplyParts {
  const { calls, rng } = inputs;

  // A collectible on cooldown takes over the whole reply.
  const waiting = highestPriorityCollectible(calls);
  if (waiting) {
    return {
      header: waiting.waitingHeader,
      body: `[${waiting.name}](${waiting.waitingImage})\n\n`,
      flavour: waiting.waitingFlavour,
    };
  }

  const roll = Math.floor(rng() * ROLL_OUTCOMES);
  if (roll === 0) return { header: '', body: pick(LINKLESS_REPLIES, rng), flavour: '' };

  const parts: ReplyParts = {
    header: roll === 1 ? pick(SPECIAL_HEADERS, rng) : creatureHeader(pick(CREATURE_TYPES, rng)),
    body: '',
    flavour: '',
  };

  for (const call of calls) {
    const { line, rastamon } = cardLine(call, inputs);
    parts.body += line;
    // A Rastamon card sets the header for the whole reply, and the last one sets its flavour.
    if (rastamon) {
      parts.header = RASTAMON_HEADER;
      parts.flavour = rastamon.flavour ?? RASTAMON_BLANK_FLAVOUR;
    }
  }

  if (calls.length === 1 && !parts.flavour && inputs.flavour) {
    parts.flavour = `_${inputs.flavour}_\n\n`;
  }
  return parts;
}

/** One body line for a call, and the Rastamon card it names, if any. */
function cardLine(call: string, inputs: ReplyInputs): { line: string; rastamon?: RastamonCard } {
  if (call.toLowerCase() === 'revel in riches') return { line: `[${call}](${REVEL_IN_RICHES_IMAGE})\n\n` };

  const rastamon = findRastamonCard(call);
  if (rastamon) {
    return { line: `[${rastamon.linkText ?? rastamon.name}](${rastamon.image})${rastamon.suffix ?? ''}\n\n`, rastamon };
  }

  const joke = `[${call}](${pick(inputs.pool, inputs.rng)})`;
  const images = inputs.cardImages(call);
  if (images.length === 1) return { line: `${joke} - ([SF](${images[0]}))\n\n` };
  if (images.length === 2) return { line: `${joke} - ([S](${images[0]})[F](${images[1]}))\n\n` };
  return { line: `${joke}\n\n` };
}
