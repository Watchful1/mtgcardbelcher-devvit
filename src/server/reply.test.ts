import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildReply, ROLL_OUTCOMES, type ReplyInputs } from './reply';
import { FOOTER } from './data/replies';

/** An rng that returns the given values in turn, then 0.5 forever. */
function rngOf(...values: number[]): () => number {
  return () => values.shift() ?? 0.5;
}

// 0.5 rolls the normal creature header.
const NORMAL_ROLL = 0.5;
const LINKLESS_ROLL = 0;
// Rolls land on outcome floor(rng * ROLL_OUTCOMES); 1.5 / ROLL_OUTCOMES lands on 1.
const SPECIAL_ROLL = 1.5 / ROLL_OUTCOMES;

function inputs(overrides: Partial<ReplyInputs>): ReplyInputs {
  return {
    calls: ['Lightning Bolt'],
    pool: ['https://i.redd.it/joke.png'],
    rng: rngOf(NORMAL_ROLL),
    cardImages: () => [],
    flavour: undefined,
    ...overrides,
  };
}

test('a normal reply has a creature header, a joke link and the footer', () => {
  const reply = buildReply(inputs({ rng: rngOf(NORMAL_ROLL, 0) }));
  assert.equal(
    reply,
    "The Horrors have delivered the cards you're looking for:\n\n" +
      '[Lightning Bolt](https://i.redd.it/joke.png)\n\n' +
      FOOTER,
  );
});

test('real cards get an SF link, or S and F links for two faces', () => {
  const images: Record<string, string[]> = {
    'Lightning Bolt': ['https://sf/bolt.jpg'],
    'Delver of Secrets': ['https://sf/front.jpg', 'https://sf/back.jpg'],
  };
  const reply = buildReply(inputs({ calls: ['Lightning Bolt', 'Delver of Secrets'], cardImages: (c) => images[c] ?? [] }));
  assert.match(reply, /\[Lightning Bolt\]\(https:\/\/i\.redd\.it\/joke\.png\) - \(\[SF\]\(https:\/\/sf\/bolt\.jpg\)\)\n\n/);
  assert.match(reply, / - \(\[S\]\(https:\/\/sf\/front\.jpg\)\[F\]\(https:\/\/sf\/back\.jpg\)\)\n\n/);
});

test('a single call gets the flavour text; several calls do not', () => {
  assert.match(buildReply(inputs({ flavour: 'It burns.' })), /_It burns\._\n\n\*{9}/);
  assert.doesNotMatch(buildReply(inputs({ calls: ['a', 'b'], flavour: 'It burns.' })), /It burns/);
});

test('roll 0 gives a linkless reply with no header or card lines', () => {
  const reply = buildReply(inputs({ rng: rngOf(LINKLESS_ROLL, 0) }));
  assert.equal(reply, 'The Invasion annihilated the cards you were looking for.\n\nNothing but ashes and pain remain. Somehow you survive.\n\n' + FOOTER);
});

test('roll 1 gives a special header', () => {
  const reply = buildReply(inputs({ rng: rngOf(SPECIAL_ROLL, 0.99) }));
  assert.ok(reply.startsWith('Gruul? Gruul!\n\n[Lightning Bolt]'));
});

test('more than 8 calls gets the tumbleweed reply', () => {
  const reply = buildReply(inputs({ calls: Array.from({ length: 9 }, (_, i) => `card ${i}`) }));
  assert.ok(reply.startsWith('No-one is home.\n\n<cue tumbleweed>'));
  assert.ok(reply.endsWith(FOOTER));
});

test('a reply over 2400 characters gets the crickets reply', () => {
  const long = 'x'.repeat(400);
  const reply = buildReply(inputs({ calls: Array.from({ length: 8 }, () => long) }));
  assert.ok(reply.startsWith('No-one is home.\n\n<crickets>'));
});

test('a collectible call gets the waiting reply, whatever its capitalisation', () => {
  for (const call of ['colossal dreadmaw', 'Colossal Dreadmaw']) {
    const reply = buildReply(inputs({ calls: [call, 'Lightning Bolt'], flavour: 'unused' }));
    assert.equal(
      reply,
      'Colossal Dreadmaw is nowhere to be _seen_.\n\n' +
        '[Colossal Dreadmaw](https://i.redd.it/bvjzb0rfaike1.png)\n\n' +
        '_You feel the ground quake. Run!_\n\n' +
        FOOTER,
    );
  }
});

test('the waiting reply prefers Dreadmaw, then Storm Crow, then Negate', () => {
  assert.match(buildReply(inputs({ calls: ['Nægate', 'Storm Crow'] })), /^The sky is clear!/);
  assert.match(buildReply(inputs({ calls: ['Nægate'] })), /^Oh no! It resolves/);
});

test('Revel in Riches links to the Negate screenshot', () => {
  assert.match(buildReply(inputs({ calls: ['revel in RICHES'] })), /\[revel in RICHES\]\(https:\/\/i\.redd\.it\/7jkequbnkrzd1\.png\)\n\n/);
});

test('Rastamon cards use their own image, the Rastamon header and no Scryfall flavour', () => {
  const reply = buildReply(inputs({ calls: ['tobo dibi'], flavour: 'unused' }));
  assert.equal(
    reply,
    "Rastamonliveup has delivered the cards you're looking for:\n\n" +
      '[Tōbō Dibi](https://i.redd.it/his9093feaga1.jpg)\n\n' +
      '\n' +
      FOOTER,
  );
});

test('Rastamon specials: Kuka Beyo smiles, Galatians is italic, Sebi Gyandu has flavour', () => {
  assert.match(buildReply(inputs({ calls: ['Kuka Beyo'] })), /\[Kuka Beyo\]\([^)]+\) :\)\n\n/);
  assert.match(buildReply(inputs({ calls: ['Gal. 4:16'] })), /\[\*Tell the children the truth\*\]/);
  assert.match(buildReply(inputs({ calls: ['sebi gyandu'] })), /_Tell the children the truth_\n\n\*{9}/);
});
