import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_SOURCE, MTGCARDBELCHER_FLAIRS as FLAIRS, type SourcePost } from './flair-rules';
import { JOLLYVER, parsePoolPage } from './image-pool';
import { onPostChanged, onPostDeleted, refreshPool, runSource, type Page, type SourcePorts } from './source-sync';
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
 * An r/MTGCardBelcher of the given posts (newest first), served `pageSize` at a
 * time. `pagesBeforeTimeout` makes a run run out of time after that many pages.
 */
function setup(posts: SourcePost[], pageSize: number, options: { dryRun?: boolean; pagesBeforeTimeout?: number } = {}) {
  const store = new Store(new FakeRedis(() => NOW), () => NOW);
  const fetchedAfter: (string | undefined)[] = [];
  const flairs: [string, string][] = [];
  const pages: string[] = [];
  let pagesLeft = options.pagesBeforeTimeout ?? Infinity;
  const ports: SourcePorts = {
    store,
    source: DEFAULT_SOURCE,
    fetchPage: async (after): Promise<Page> => {
      fetchedAfter.push(after);
      pagesLeft--;
      const start = after === undefined ? 0 : posts.findIndex((p) => p.id === after) + 1;
      const page = posts.slice(start, start + pageSize);
      return { posts: page, after: start + pageSize < posts.length ? page.at(-1)!.id : undefined };
    },
    setFlair: async (postId, flairId) => {
      flairs.push([postId, flairId]);
    },
    readWikiPage: async () => pages.at(-1),
    writeWikiPage: async (content) => {
      pages.push(content);
    },
    now: () => NOW,
    timeLeft: () => pagesLeft > 0,
    dryRun: options.dryRun ?? false,
  };
  return {
    ports,
    store,
    flairs,
    fetchedAfter,
    lastPage: () => parsePoolPage(pages.at(-1) ?? ''),
    pagesWritten: () => pages.length,
    editPage: (content: string) => {
      pages.push(content);
    },
    allowPages: (n: number) => {
      pagesLeft = n;
    },
  };
}

test('the first run seeds the pool from every page and writes the wiki page', async () => {
  const { ports, store, lastPage } = setup(
    [post('a', 1), post('b', 100, { flairId: FLAIRS.rejected }), post('c', 200), post('d', 300, { url: 'https://example.com/d.png' })],
    2,
  );
  assert.equal(await runSource(ports), 'done');
  assert.ok(await store.sourceSeeded());
  assert.deepEqual(lastPage(), ['https://i.redd.it/a.png', 'https://i.redd.it/c.png']);
});

test('seeding that runs out of time resumes after the last page it read', async () => {
  const posts = [post('a', 1), post('b', 2), post('c', 3)];
  const { ports, fetchedAfter, lastPage, pagesWritten, allowPages } = setup(posts, 1, { pagesBeforeTimeout: 1 });

  assert.equal(await runSource(ports), 'seeding');
  assert.equal(pagesWritten(), 0, 'a half-seeded pool is not published');

  allowPages(5);
  assert.equal(await runSource(ports), 'done');
  assert.deepEqual(fetchedAfter, [undefined, 'a', 'b']);
  assert.equal(lastPage().length, 3);
});

test('once seeded, a run curates recent posts and keeps the pool in line with their flairs', async () => {
  const { ports, store, flairs, lastPage } = setup(
    [
      post('promote', 1, { flairId: FLAIRS.pending, score: 60 }),
      post('demoted', 2, { flairId: FLAIRS.rejected }),
      post('old', 30, { flairId: FLAIRS.pending, score: 0 }),
    ],
    10,
  );
  await store.applySourceChanges({ add: new Map([['demoted', 'https://i.redd.it/demoted.png']]), remove: [] });
  await store.finishSeeding();

  await runSource(ports);
  assert.deepEqual(flairs, [['promote', FLAIRS.approved]], 'posts outside the curation window are left alone');
  assert.deepEqual(lastPage(), ['https://i.redd.it/promote.png']);
});

test('a dry run logs flair changes without making them', async () => {
  const { ports, store, flairs, lastPage } = setup([post('promote', 1, { flairId: FLAIRS.pending, score: 60 })], 10, {
    dryRun: true,
  });
  await store.finishSeeding();

  await runSource(ports);
  assert.deepEqual(flairs, []);
  assert.deepEqual(lastPage(), [], 'the pool follows the flairs posts actually have');
});

test('curation stops starting new posts once time runs out', async () => {
  const { ports, store, flairs } = setup([post('promote', 1, { flairId: FLAIRS.pending, score: 60 })], 10, {
    pagesBeforeTimeout: 1,
  });
  await store.finishSeeding();

  await runSource(ports);
  assert.deepEqual(flairs, []);
});

test('the wiki page is only written when the pool changes', async () => {
  const { ports, store, pagesWritten } = setup([post('a', 1)], 10);
  await runSource(ports);
  await runSource(ports);
  assert.equal(pagesWritten(), 1);
  assert.ok(await store.sourceSeeded());
});

test('a rebuild request empties the pool and seeds it again', async () => {
  const { ports, store, lastPage } = setup([post('a', 1)], 10);
  await store.applySourceChanges({ add: new Map([['gone', 'https://i.redd.it/gone.png']]), remove: [] });
  await store.finishSeeding();
  await store.requestReset();

  await runSource(ports);
  assert.deepEqual(lastPage(), ['https://i.redd.it/a.png']);
});

test('a flair change adds or removes one post, at any age, and writes the page', async () => {
  const { ports, lastPage } = setup([], 10);
  await ports.store.finishSeeding();
  await onPostChanged({ id: 't3_x', flairId: FLAIRS.approved, url: 'https://i.redd.it/x.png' }, ports);
  assert.deepEqual(lastPage(), ['https://i.redd.it/x.png']);
  await onPostChanged({ id: 't3_x', flairId: FLAIRS.rejected, url: 'https://i.redd.it/x.png' }, ports);
  assert.deepEqual(lastPage(), []);
});

test('a deleted post leaves the pool', async () => {
  const { ports, lastPage } = setup([], 10);
  await ports.store.finishSeeding();
  await onPostChanged({ id: 't3_x', flairId: FLAIRS.approved, url: 'https://i.redd.it/x.png' }, ports);
  await onPostDeleted('t3_x', ports);
  assert.deepEqual(lastPage(), []);
});

test('other installs load the pool from the page, and keep it if the page fails', async () => {
  const store = new Store(new FakeRedis(() => NOW), () => NOW);
  await refreshPool(store, async () => '# header\nhttps://i.redd.it/a.png\n');
  assert.deepEqual(await store.pool(), [JOLLYVER, 'https://i.redd.it/a.png']);

  await refreshPool(store, async () => undefined);
  await refreshPool(store, async () => '# header\n');
  assert.deepEqual(await store.pool(), [JOLLYVER, 'https://i.redd.it/a.png']);
});

test('a flair change during seeding updates the pool but publishes nothing yet', async () => {
  const { ports, pagesWritten } = setup([], 10);
  await onPostChanged({ id: 't3_x', flairId: FLAIRS.approved, url: 'https://i.redd.it/x.png' }, ports);
  assert.equal(pagesWritten(), 0);
  assert.deepEqual(await ports.store.sourcePool(), ['https://i.redd.it/x.png']);
});

test('the page is rewritten after the pool changes, and repaired after an edit', async () => {
  const { ports, lastPage, pagesWritten, editPage } = setup([post('a', 1)], 10);
  await runSource(ports);
  assert.equal(pagesWritten(), 1);

  await onPostChanged({ id: 't3_x', flairId: FLAIRS.approved, url: 'https://i.redd.it/x.png' }, ports);
  assert.equal(pagesWritten(), 2);

  editPage('# vandalised\nhttps://i.redd.it/someone-elses.png\n');
  await runSource(ports);
  assert.deepEqual(lastPage(), ['https://i.redd.it/a.png', 'https://i.redd.it/x.png']);
});

test('a removed post leaves the pool, and returns when approved again', async () => {
  const { ports, lastPage } = setup([], 10);
  await ports.store.finishSeeding();
  const image = { id: 't3_x', flairId: FLAIRS.approved, url: 'https://i.redd.it/x.png' };
  await onPostChanged(image, ports);
  await onPostChanged({ ...image, removed: true }, ports);
  assert.deepEqual(lastPage(), []);
  await onPostChanged({ ...image, removed: false }, ports);
  assert.deepEqual(lastPage(), ['https://i.redd.it/x.png']);
});

test('seeding and curation leave out posts a moderator removed', async () => {
  const { ports, lastPage } = setup([post('kept', 1), post('removed', 2, { removed: true })], 10);
  await runSource(ports);
  assert.deepEqual(lastPage(), ['https://i.redd.it/kept.png']);
});
