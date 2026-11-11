import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FLAIRS, type SourcePost } from './flair-rules';
import { isPoolImage, JOLLYVER, MAX_PAGES, scanPool, type Page, type ScanPorts } from './image-pool';
import { Store } from './store';
import { FakeRedis } from './testing/fake-redis';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function post(id: string, ageDays: number, overrides: Partial<SourcePost> = {}): SourcePost {
  return {
    id,
    flairId: FLAIRS.approved,
    approved: true,
    removed: false,
    createdAtMs: NOW - ageDays * DAY,
    score: 100,
    url: `https://i.redd.it/${id}.png`,
    ...overrides,
  };
}

/**
 * An r/MTGCardBelcher of the given posts (newest first), served `pageSize` at
 * a time. `pagesBeforeTimeout` makes the scan run out of time after that many
 * pages; `curate` makes this the r/MTGCardBelcher install.
 */
function setup(
  posts: SourcePost[],
  options: { pageSize?: number; pagesBeforeTimeout?: number; curate?: 'live' | 'dry-run'; failFlair?: boolean } = {},
) {
  const pageSize = options.pageSize ?? 100;
  const store = new Store(new FakeRedis(() => NOW), () => NOW);
  const flairsSet: [string, string][] = [];
  let pagesFetched = 0;
  let pagesLeft = options.pagesBeforeTimeout ?? Infinity;
  const ports: ScanPorts = {
    store,
    fetchPage: async (after): Promise<Page> => {
      pagesFetched++;
      pagesLeft--;
      const start = after === undefined ? 0 : posts.findIndex((p) => p.id === after) + 1;
      const page = posts.slice(start, start + pageSize);
      return { posts: page, after: start + pageSize < posts.length ? page.at(-1)!.id : undefined };
    },
    curation: options.curate && {
      setFlair: async (postId, flairId) => {
        if (options.failFlair) throw new Error('Reddit said no');
        flairsSet.push([postId, flairId]);
      },
      dryRun: options.curate === 'dry-run',
    },
    now: () => NOW,
    timeLeft: () => pagesLeft > 0,
  };
  return { ports, store, flairsSet, pagesFetched: () => pagesFetched, pool: async () => (await store.pool()).slice(1) };
}

test('pool images are approved, not removed, direct image links', () => {
  const approved = { flairId: FLAIRS.approved, removed: false };
  assert.ok(isPoolImage({ ...approved, url: 'https://i.redd.it/a.png' }));
  assert.ok(isPoolImage({ ...approved, url: 'https://i.imgur.com/a.jpg' }));
  assert.ok(!isPoolImage({ ...approved, url: 'https://www.reddit.com/r/MTGCardBelcher/comments/a/x/' }));
  assert.ok(!isPoolImage({ ...approved, url: 'https://example.com/a.png' }));
  assert.ok(!isPoolImage({ ...approved, removed: true, url: 'https://i.redd.it/a.png' }));
  assert.ok(!isPoolImage({ flairId: FLAIRS.pending, removed: false, url: 'https://i.redd.it/a.png' }));
});

test('a scan reads every page and replaces the pool, Jollyver always included', async () => {
  const { ports, store, pool } = setup(
    [post('a', 1), post('b', 100, { flairId: FLAIRS.rejected }), post('c', 200), post('d', 300, { removed: true })],
    { pageSize: 2 },
  );
  await store.setPool(['https://i.redd.it/stale.png']);
  assert.equal(await scanPool(ports), 2);
  assert.deepEqual(await pool(), ['https://i.redd.it/a.png', 'https://i.redd.it/c.png']);
  assert.equal((await store.pool())[0], JOLLYVER);
});

test('a scan stops at the newest 1,000 posts', async () => {
  const posts = Array.from({ length: (MAX_PAGES + 2) * 2 }, (_, i) => post(`p${i}`, i));
  const { ports, pagesFetched } = setup(posts, { pageSize: 2 });
  assert.equal(await scanPool(ports), MAX_PAGES * 2);
  assert.equal(pagesFetched(), MAX_PAGES);
});

test('a scan that runs out of time keeps the old pool', async () => {
  const { ports, store, pool } = setup([post('a', 1), post('b', 2), post('c', 3)], { pageSize: 1, pagesBeforeTimeout: 2 });
  await store.setPool(['https://i.redd.it/old.png']);
  assert.equal(await scanPool(ports), undefined);
  assert.deepEqual(await pool(), ['https://i.redd.it/old.png']);
});

test('installs other than r/MTGCardBelcher never set flairs', async () => {
  const { ports, flairsSet } = setup([post('a', 1, { flairId: FLAIRS.pending })]);
  await scanPool(ports);
  assert.deepEqual(flairsSet, []);
});

test('curation moves recent posts along, and a post it approves joins the pool in the same scan', async () => {
  const { ports, flairsSet, pool } = setup(
    [
      post('new', 1, { flairId: FLAIRS.new, score: 1 }),
      post('hit', 2, { flairId: FLAIRS.pending, score: 60 }),
      post('settled', 3),
      post('old', 30, { flairId: FLAIRS.pending, score: 60 }),
    ],
    { curate: 'live' },
  );
  await scanPool(ports);
  assert.deepEqual(flairsSet, [
    ['new', FLAIRS.pending],
    ['hit', FLAIRS.approved],
  ]);
  assert.deepEqual(await pool(), ['https://i.redd.it/hit.png', 'https://i.redd.it/settled.png']);
});

test('a dry run changes no flairs, and the pool follows the flairs as they are', async () => {
  const { ports, flairsSet, pool } = setup([post('hit', 2, { flairId: FLAIRS.pending, score: 60 }), post('settled', 3)], {
    curate: 'dry-run',
  });
  await scanPool(ports);
  assert.deepEqual(flairsSet, []);
  assert.deepEqual(await pool(), ['https://i.redd.it/settled.png']);
});

test('a flair change that fails leaves the post as it was, and the scan goes on', async () => {
  const { ports, pool } = setup([post('hit', 2, { flairId: FLAIRS.pending, score: 60 }), post('settled', 3)], {
    curate: 'live',
    failFlair: true,
  });
  assert.equal(await scanPool(ports), 1);
  assert.deepEqual(await pool(), ['https://i.redd.it/settled.png']);
});
