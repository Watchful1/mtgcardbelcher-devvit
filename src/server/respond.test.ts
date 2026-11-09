import assert from 'node:assert/strict';
import { test } from 'node:test';

import { respond, type CallTarget, type RespondPorts } from './respond';
import { Store } from './store';
import { FakeRedis } from './testing/fake-redis';

const NOW = 1_800_000_000_000;

function setup(overrides: Partial<RespondPorts> = {}) {
  let now = NOW;
  const clock = () => now;
  const redis = new FakeRedis(clock);
  const replies: { parentId: string; text: string }[] = [];
  let collectorNumber = 41;
  let scryfallCalls = 0;
  const ports: RespondPorts = {
    store: new Store(redis, clock),
    appUsername: 'mtgcardbelcher-dev',
    lookupCards: async () => {
      scryfallCalls++;
      return new Map([['lightning bolt', ['https://sf/bolt.jpg']]]);
    },
    randomFlavour: async () => 'It burns.',
    nextCollectorNumber: async () => ++collectorNumber,
    reply: async (parentId, text) => {
      replies.push({ parentId, text });
      return `t1_reply${replies.length}`;
    },
    rng: () => 0.5,
    now: clock,
    ...overrides,
  };
  return {
    ports,
    replies,
    scryfallCalls: () => scryfallCalls,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

function target(body: string, overrides: Partial<CallTarget> = {}): CallTarget {
  return { id: 't1_abc', kind: 'comment', body, authorName: 'someone', createdAtMs: NOW, postTitle: 'A post', ...overrides };
}

test('replies to a call with a joke link, the Scryfall link and flavour', async () => {
  const { ports, replies } = setup();
  assert.equal(await respond(target('[[Lightning Bolt]]'), ports), 'reply');
  assert.equal(replies.length, 1);
  assert.equal(replies[0]!.parentId, 't1_abc');
  assert.match(replies[0]!.text, /\[Lightning Bolt\]\(https:\/\/i\.redd\.it\/pcmd6d3o1oad1\.png\) - \(\[SF\]\(https:\/\/sf\/bolt\.jpg\)\)/);
  assert.match(replies[0]!.text, /_It burns\._/);
});

test('ignores items without calls, and answers each item once', async () => {
  const { ports, replies } = setup();
  assert.equal(await respond(target('no calls here'), ports), 'skipped');
  assert.equal(await respond(target('[[Bolt]]'), ports), 'reply');
  assert.equal(await respond(target('[[Bolt]]'), ports), 'duplicate');
  assert.equal(replies.length, 1);
});

test('does not answer its own comments', async () => {
  const { ports, replies } = setup();
  assert.equal(await respond(target('[[Bolt]]', { authorName: 'MTGCardBelcher-dev' }), ports), 'skipped');
  assert.equal(replies.length, 0);
});

test('a collectible gives numbered art, then waiting replies until the cooldown ends', async () => {
  const { ports, replies, scryfallCalls, advance } = setup();

  assert.equal(await respond(target('[[Colossal Dreadmaw]]', { id: 't1_1' }), ports), 'art');
  assert.match(replies[0]!.text, /You are No\. 0042 to encounter Colossal Dreadmaw!/);

  assert.equal(await respond(target('[[colossal dreadmaw]] [[Lightning Bolt]]', { id: 't1_2' }), ports), 'reply');
  assert.match(replies[1]!.text, /^Colossal Dreadmaw is nowhere to be _seen_\./);
  assert.equal(scryfallCalls(), 0, 'a waiting reply makes no Scryfall request');

  // rng 0.5 puts the cooldown halfway between 10 minutes and 2 hours.
  advance(66 * 60 * 1000);
  assert.equal(await respond(target('[[Colossal Dreadmaw]]', { id: 't1_3', createdAtMs: NOW + 66 * 60 * 1000 }), ports), 'art');
  assert.match(replies[2]!.text, /No\. 0043/);
});

test('two collectible calls at the same moment give art only once', async () => {
  const { ports, replies } = setup();
  const outcomes = await Promise.all([
    respond(target('[[Negate]]', { id: 't1_a' }), ports),
    respond(target('[[Negate]]', { id: 't1_b' }), ports),
  ]);
  assert.deepEqual(outcomes.sort(), ['art', 'reply']);
  assert.equal(replies.filter((r) => r.text.includes('to counter Revel in Riches')).length, 1);
});

test('more than 8 calls makes no Scryfall request', async () => {
  const { ports, replies, scryfallCalls } = setup();
  await respond(target(Array.from({ length: 9 }, (_, i) => `[[card ${i}]]`).join(' ')), ports);
  assert.match(replies[0]!.text, /<cue tumbleweed>/);
  assert.equal(scryfallCalls(), 0);
});

test('if the art reply fails, the cooldown is given back', async () => {
  let failNext = true;
  const { ports, replies } = setup({});
  const reply = ports.reply;
  ports.reply = async (parentId, text) => {
    if (failNext) {
      failNext = false;
      throw new Error('rate-limited by Reddit');
    }
    return reply(parentId, text);
  };
  await assert.rejects(respond(target('[[Negate]]', { id: 't1_a' }), ports));
  assert.equal(await respond(target('[[Negate]]', { id: 't1_b' }), ports), 'art');
  assert.equal(replies.length, 1);
});

test('without a collector number set up, a collectible gets the waiting reply', async () => {
  const { ports, replies } = setup({ nextCollectorNumber: async () => undefined });
  assert.equal(await respond(target('[[Storm Crow]]'), ports), 'reply');
  assert.match(replies[0]!.text, /^The sky is clear!/);
});
