// Building the reply text for an item's calls. Pure: randomness and Scryfall
// results are passed in.

import { waitingCollectible } from './data/collectibles';
import { findRastamonCard, GALATIANS, KUKA_BEYO, SEBI_GYANDU } from './data/rastamon';
import {
  CREATURE_TYPES,
  creatureHeader,
  FOOTER,
  GYANDU_FLAVOUR,
  LINKLESS_REPLIES,
  RASTAMON_HEADER,
  REVEL_IN_RICHES_IMAGE,
  SPECIAL_HEADERS,
} from './data/replies';

export const MAX_CALLS = 8;
export const MAX_REPLY_LENGTH = 2400;

// Each reply rolls one of this many equally likely outcomes: 0 is a linkless
// reply, 1 a special header, anything else the normal creature header.
const ROLL_OUTCOMES = 1002;

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
  const waiting = waitingCollectible(calls);
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
    parts.body += cardLine(call, parts, inputs);
  }

  if (calls.length === 1 && !parts.flavour && inputs.flavour) {
    parts.flavour = `_${inputs.flavour}_\n\n`;
  }
  return parts;
}

/** One body line for a call. Rastamon cards also change the header and flavour. */
function cardLine(call: string, parts: ReplyParts, inputs: ReplyInputs): string {
  if (call.toLowerCase() === 'revel in riches') return `[${call}](${REVEL_IN_RICHES_IMAGE})\n\n`;

  const rastamon = findRastamonCard(call);
  if (rastamon) {
    parts.header = RASTAMON_HEADER;
    // A non-empty flavour stops the Scryfall flavour being added.
    parts.flavour = rastamon.name === SEBI_GYANDU ? GYANDU_FLAVOUR : '\n';
    if (rastamon.name === KUKA_BEYO) return `[${rastamon.name}](${rastamon.image}) :)\n\n`;
    if (rastamon.name === GALATIANS) return `[*${rastamon.name}*](${rastamon.image})\n\n`;
    return `[${rastamon.name}](${rastamon.image})\n\n`;
  }

  const joke = `[${call}](${pick(inputs.pool, inputs.rng)})`;
  const images = inputs.cardImages(call);
  if (images.length === 1) return `${joke} - ([SF](${images[0]}))\n\n`;
  if (images.length === 2) return `${joke} - ([S](${images[0]})[F](${images[1]}))\n\n`;
  return `${joke}\n\n`;
}
