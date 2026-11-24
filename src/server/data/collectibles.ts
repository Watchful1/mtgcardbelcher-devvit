import { dreadmawArt, negateArt, stormCrowArt } from './art';

// Cards whose call can win a numbered ASCII-art reply, then sit on a cooldown
// during which calls get a "waiting" reply instead.
export interface Collectible {
  id: 'dreadmaw' | 'stormCrow' | 'negate';
  name: string;
  spellings: string[];
  art: string;
  waitingHeader: string;
  waitingImage: string;
  waitingFlavour: string;
  /** The last collector number the original PRAW bot delivered; this app continues from it. */
  lastPrawNumber: number;
}

// Order matters: when a call names several, the waiting reply uses the first
// one in this list.
export const COLLECTIBLES: Collectible[] = [
  {
    id: 'dreadmaw',
    name: 'Colossal Dreadmaw',
    spellings: ['colossal dreadmaw'],
    art: dreadmawArt,
    waitingHeader: 'Colossal Dreadmaw is nowhere to be _seen_.\n\n',
    waitingImage: 'https://i.redd.it/bvjzb0rfaike1.png',
    waitingFlavour: '_You feel the ground quake. Run!_\n\n',
    lastPrawNumber: 143,
  },
  {
    id: 'stormCrow',
    name: 'Storm Crow',
    spellings: ['storm crow'],
    art: stormCrowArt,
    waitingHeader: 'The sky is clear! Not even a single cloud!\n\n',
    waitingImage: 'https://i.redd.it/ykxjrafd13te1.png',
    waitingFlavour: '_It tells you that the worst is coming. Do you listen?_\n\n',
    lastPrawNumber: 42,
  },
  {
    id: 'negate',
    name: 'Negate',
    spellings: ['negate', 'naegate', 'negaete', 'naegaete', 'nægate', 'negæte', 'nægæte'],
    art: negateArt,
    waitingHeader: 'Oh no! It resolves:\n\n',
    waitingImage: 'https://i.redd.it/ebgrvw7grwzd1.png',
    waitingFlavour: '_You must draw more cards in order to find a Negate!_\n\n',
    lastPrawNumber: 18,
  },
];

export const COOLDOWN_MIN_SECONDS = 10 * 60;
export const COOLDOWN_MAX_SECONDS = 2 * 60 * 60;

/** The first call, in call order, that names a collectible. */
export function firstCalledCollectible(calls: string[]): Collectible | undefined {
  for (const call of calls) {
    const lower = call.toLowerCase();
    const match = COLLECTIBLES.find((c) => c.spellings.includes(lower));
    if (match) return match;
  }
  return undefined;
}

/** The first collectible, in list order, that any call names: the one a waiting reply is about. */
export function highestPriorityCollectible(calls: string[]): Collectible | undefined {
  const lower = calls.map((call) => call.toLowerCase());
  return COLLECTIBLES.find((c) => lower.some((call) => c.spellings.includes(call)));
}

export function renderArt(collectible: Collectible, count: number): string {
  return collectible.art.replaceAll('{{COUNT}}', String(count).padStart(4, '0'));
}
