import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FLAIRS, flairName, nextFlair, sameSubreddit, type SourcePost } from './flair-rules';

const NOW = 2_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function post(overrides: Partial<SourcePost>): SourcePost {
  return {
    id: 't3_a',
    flairId: FLAIRS.new,
    approved: false,
    removed: false,
    createdAtMs: NOW - DAY,
    score: 1,
    url: 'https://i.redd.it/a.png',
    ...overrides,
  };
}

test('a new post waits until a moderator approves it, then goes pending', () => {
  assert.equal(nextFlair(post({}), NOW), undefined);
  assert.equal(nextFlair(post({ approved: true }), NOW), FLAIRS.pending);
});

test('a pending post is approved at a score of 50', () => {
  assert.equal(nextFlair(post({ flairId: FLAIRS.pending, score: 50 }), NOW), FLAIRS.approved);
  assert.equal(nextFlair(post({ flairId: FLAIRS.pending, score: 49 }), NOW), undefined);
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

test('flairName names known flairs for log lines', () => {
  assert.equal(flairName(FLAIRS.approved), 'approved');
  assert.equal(flairName(undefined), 'no flair');
  assert.equal(flairName('some-other-id'), 'some-other-id');
});

test('sameSubreddit ignores case', () => {
  assert.ok(sameSubreddit('mtgcardbelcher', 'MTGCardBelcher'));
  assert.ok(!sameSubreddit('magicthecirclejerking', 'MTGCardBelcher'));
});
