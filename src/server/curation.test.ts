import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FLAIRS, isPoolImage, nextFlair, poolChanges, type SourcePost } from './curation';

const NOW = 2_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function post(overrides: Partial<SourcePost>): SourcePost {
  return {
    id: 't3_a',
    flairId: FLAIRS.new,
    approved: false,
    createdAtMs: NOW - DAY,
    score: 1,
    upvoteRatio: 1,
    url: 'https://i.redd.it/a.png',
    ...overrides,
  };
}

test('a new post waits until a moderator approves it, then goes pending', () => {
  assert.equal(nextFlair(post({}), NOW), undefined);
  assert.equal(nextFlair(post({ approved: true }), NOW), FLAIRS.pending);
});

test('a pending post is approved on score and ratio', () => {
  const pending = { flairId: FLAIRS.pending, score: 50 };
  assert.equal(nextFlair(post({ ...pending, upvoteRatio: 0.85 }), NOW), FLAIRS.approved);
  assert.equal(nextFlair(post({ ...pending, upvoteRatio: 0.84 }), NOW), undefined);
  assert.equal(nextFlair(post({ ...pending, score: 49 }), NOW), undefined);
  assert.equal(nextFlair(post({ ...pending, upvoteRatio: undefined }), NOW), FLAIRS.approved);
});

test('a pending post is rejected after two weeks, unless it is approved first', () => {
  const old = { flairId: FLAIRS.pending, createdAtMs: NOW - 15 * DAY };
  assert.equal(nextFlair(post(old), NOW), FLAIRS.rejected);
  assert.equal(nextFlair(post({ ...old, score: 100 }), NOW), FLAIRS.approved);
});

test('an old new post that gets approved goes straight to rejected', () => {
  assert.equal(nextFlair(post({ approved: true, createdAtMs: NOW - 15 * DAY }), NOW), FLAIRS.rejected);
});

test('an unflaired post is flaired other; settled posts are left alone', () => {
  assert.equal(nextFlair(post({ flairId: undefined }), NOW), FLAIRS.other);
  for (const flairId of [FLAIRS.approved, FLAIRS.rejected, FLAIRS.other]) {
    assert.equal(nextFlair(post({ flairId, approved: true, score: 100, createdAtMs: 0 }), NOW), undefined);
  }
});

test('pool images are approved direct image links, not self-posts', () => {
  const approved = { flairId: FLAIRS.approved };
  assert.ok(isPoolImage(post({ ...approved })));
  assert.ok(isPoolImage(post({ ...approved, url: 'https://i.imgur.com/a.jpg' })));
  assert.ok(!isPoolImage(post({ ...approved, url: 'https://www.reddit.com/r/MTGCardBelcher/comments/a/x/' })));
  assert.ok(!isPoolImage(post({ ...approved, url: 'https://example.com/a.png' })));
  assert.ok(!isPoolImage(post({})));
});

test('poolChanges adds pool images and removes everything else it saw', () => {
  const changes = poolChanges([
    post({ id: 't3_in', flairId: FLAIRS.approved }),
    post({ id: 't3_out', flairId: FLAIRS.rejected }),
  ]);
  assert.deepEqual([...changes.add], [['t3_in', 'https://i.redd.it/a.png']]);
  assert.deepEqual(changes.remove, ['t3_out']);
});
