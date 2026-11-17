import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Store } from './store';
import { FakeRedis } from './testing/fake-redis';

test('collector numbers continue from the setting, then count up from there', async () => {
  const store = new Store(new FakeRedis());
  assert.equal(await store.nextCollectorNumber('dreadmaw', 143), 144);
  assert.equal(await store.nextCollectorNumber('dreadmaw', 143), 145);
  assert.equal(await store.nextCollectorNumber('negate', 18), 19);
});

test('raising the setting skips ahead; lowering it changes nothing', async () => {
  const store = new Store(new FakeRedis());
  assert.equal(await store.nextCollectorNumber('dreadmaw', 143), 144);
  assert.equal(await store.nextCollectorNumber('dreadmaw', 200), 201);
  assert.equal(await store.nextCollectorNumber('dreadmaw', 10), 202);
});
