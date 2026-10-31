import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FLAIRS, JOLLYVER, type SourcePost } from './curation';
import { FakeRedis } from './fake-redis';
import { curate, syncPool, type Page, type SyncPorts } from './pool-sync';
import { Store } from './store';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function post(id: string, ageDays: number, overrides: Partial<SourcePost> = {}): SourcePost {
  return {
    id,
    flairId: FLAIRS.approved,
    approved: true,
    createdAtMs: NOW - ageDays * DAY,
    score: 100,
    upvoteRatio: undefined,
    url: `https://i.redd.it/${id}.png`,
    ...overrides,
  };
}

/** A subreddit of the given posts (newest first), served a page at a time. */
function setup(posts: SourcePost[], pageSize: number, options: { deadline?: number } = {}) {
  const redis = new FakeRedis(() => NOW);
  const store = new Store(redis, () => NOW);
  const flairs: [string, string][] = [];
  let fetches = 0;
  const ports: SyncPorts = {
    store,
    fetchPage: async (after): Promise<Page> => {
      fetches++;
      const start = after === undefined ? 0 : posts.findIndex((p) => p.id === after) + 1;
      const page = posts.slice(start, start + pageSize);
      return { posts: page, after: start + pageSize < posts.length ? page.at(-1)!.id : undefined };
    },
    setFlair: async (postId, flairId) => {
      flairs.push([postId, flairId]);
    },
    now: () => NOW,
    deadline: options.deadline ?? NOW + 20_000,
  };
  return { ports, store, flairs, fetches: () => fetches };
}

test('seeding adds every pool image from all pages, then marks the pool seeded', async () => {
  const { ports, store } = setup(
    [post('a', 1), post('b', 100, { flairId: FLAIRS.rejected }), post('c', 200), post('d', 300, { url: 'https://example.com/d.png' })],
    2,
  );
  assert.equal(await syncPool(ports), 'seeded');
  assert.deepEqual((await store.pool()).sort(), [JOLLYVER, 'https://i.redd.it/a.png', 'https://i.redd.it/c.png'].sort());
  assert.ok(await store.seeded());
});

test('seeding that runs out of time resumes where it stopped', async () => {
  const posts = [post('a', 1), post('b', 2), post('c', 3)];
  const first = setup(posts, 1, { deadline: NOW - 1 });
  // A deadline already passed reads nothing and asks for another run.
  assert.equal(await syncPool(first.ports), 'seeding');
  assert.equal(first.fetches(), 0);

  // Stop after one page by moving the deadline as pages are read.
  const { ports, store } = setup(posts, 1);
  let pagesLeft = 1;
  const afters: (string | undefined)[] = [];
  const fetchPage = ports.fetchPage;
  const limited: SyncPorts = {
    ...ports,
    fetchPage: async (after) => {
      pagesLeft--;
      afters.push(after);
      return fetchPage(after);
    },
    get deadline() {
      return pagesLeft > 0 ? NOW + 1 : NOW - 1;
    },
  };
  assert.equal(await syncPool(limited), 'seeding');
  assert.equal((await store.pool()).length, 2);
  pagesLeft = 5;
  assert.equal(await syncPool(limited), 'seeded');
  assert.equal((await store.pool()).length, 4);
  assert.deepEqual(afters, [undefined, 'a', 'b'], 'the second run starts after the last page the first one read');
});

test('once seeded, a run reads only the last 15 days and removes images that lost their flair', async () => {
  const { ports, store, fetches } = setup(
    [post('new', 1), post('unflaired', 3, { flairId: FLAIRS.rejected }), post('old', 20), post('older', 30)],
    2,
  );
  await store.applyPoolChanges({ add: new Map([['unflaired', 'https://i.redd.it/unflaired.png'], ['older', 'x']]), remove: [] });
  await store.finishSeeding();

  assert.equal(await syncPool(ports), 'updated');
  assert.deepEqual((await store.pool()).sort(), [JOLLYVER, 'https://i.redd.it/new.png', 'x'].sort());
  assert.equal(fetches(), 2, 'stops at the page holding the first post outside the window');
});

test('curate changes the flair of recent posts that need it', async () => {
  const { ports, flairs } = setup(
    [
      post('approve-me', 1, { flairId: FLAIRS.pending }),
      post('leave-me', 2, { flairId: FLAIRS.new, approved: false }),
      post('too-old', 40, { flairId: FLAIRS.pending, score: 0 }),
    ],
    10,
  );
  assert.equal(await curate(ports), 1);
  assert.deepEqual(flairs, [['approve-me', FLAIRS.approved]]);
});
