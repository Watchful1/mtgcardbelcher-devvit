import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findCalls, skipReason, type CallItem } from './calls';

test('finds plain and escaped calls', () => {
  assert.deepEqual(findCalls('try [[Lightning Bolt]] and \\[\\[Storm Crow\\]\\]'), ['Storm Crow', 'Lightning Bolt']);
});

test('ignores single brackets and empty or nested calls', () => {
  assert.deepEqual(findCalls('[Bolt] [[]] [[a[b]] text'), []);
});

const NOW = 1_000_000_000;

function item(overrides: Partial<CallItem>): CallItem {
  return { kind: 'comment', authorName: 'someone', createdAtMs: NOW, postTitle: 'A post', ...overrides };
}

test('replies to a fresh call by someone else', () => {
  assert.equal(skipReason(item({}), ['Bolt'], 'belcher-app', NOW), undefined);
});

test('skips old items, bots and items without calls', () => {
  assert.equal(skipReason(item({ createdAtMs: NOW - 11 * 60_000 }), ['Bolt'], 'app', NOW), 'too-old');
  assert.equal(skipReason(item({ authorName: 'MTGCardFetcher' }), ['Bolt'], 'app', NOW), 'ignored-author');
  assert.equal(skipReason(item({ authorName: 'Belcher-App' }), ['Bolt'], 'belcher-app', NOW), 'ignored-author');
  assert.equal(skipReason(item({}), [], 'app', NOW), 'no-calls');
});

test('skips weekly unjerk threads for comments, and bottom scoring for posts only', () => {
  assert.equal(skipReason(item({ postTitle: 'The Weekly Unjerk Thread' }), ['Bolt'], 'app', NOW), 'excluded-thread');
  assert.equal(skipReason(item({ postTitle: 'Bottom 5 scoring posts' }), ['Bolt'], 'app', NOW), undefined);
  assert.equal(skipReason(item({ kind: 'post', postTitle: 'Bottom 5 scoring posts' }), ['Bolt'], 'app', NOW), 'excluded-thread');
});
