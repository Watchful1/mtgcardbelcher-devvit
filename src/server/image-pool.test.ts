import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_SOURCE, MTGCARDBELCHER_FLAIRS as FLAIRS } from './flair-rules';
import { formatPoolPage, isPoolImage as isPoolImageIn, parsePoolPage, poolChanges, type PoolPost } from './image-pool';

const isPoolImage = (post: Omit<PoolPost, 'id'>) => isPoolImageIn(post, DEFAULT_SOURCE);

const approved = (url: string) => ({ flairId: FLAIRS.approved, url });

test('pool images are approved direct image links, not self-posts', () => {
  assert.ok(isPoolImage(approved('https://i.redd.it/a.png')));
  assert.ok(isPoolImage(approved('https://i.imgur.com/a.jpg')));
  assert.ok(!isPoolImage(approved('https://www.reddit.com/r/MTGCardBelcher/comments/a/x/')));
  assert.ok(!isPoolImage(approved('https://example.com/a.png')));
  assert.ok(!isPoolImage({ flairId: FLAIRS.pending, url: 'https://i.redd.it/a.png' }));
});

test('poolChanges adds pool images and removes everything else it saw', () => {
  const changes = poolChanges(
    [
      { id: 't3_in', ...approved('https://i.redd.it/a.png') },
      { id: 't3_out', flairId: FLAIRS.rejected, url: 'https://i.redd.it/b.png' },
    ],
    DEFAULT_SOURCE,
  );
  assert.deepEqual([...changes.add], [['t3_in', 'https://i.redd.it/a.png']]);
  assert.deepEqual(changes.remove, ['t3_out']);
});

test('the wiki page round-trips its URLs, sorted and without duplicates', () => {
  const page = formatPoolPage(['https://i.redd.it/b.png', 'https://i.redd.it/a.png', 'https://i.redd.it/b.png']);
  assert.ok(page.startsWith('# MTGCardBelcher image pool.'));
  assert.deepEqual(parsePoolPage(page), ['https://i.redd.it/a.png', 'https://i.redd.it/b.png']);
});

test('parsePoolPage skips lines that are not URLs', () => {
  assert.deepEqual(parsePoolPage('# header\n\nnot a url\n  https://i.redd.it/a.png  \r\n'), ['https://i.redd.it/a.png']);
});
